import { Router, Request, Response } from 'express';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// ── Helper: parse date range from query params ───
function getDateRange(req: Request): { start: string; end: string; prevStart: string; prevEnd: string } {
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];
  const start = (req.query.start as string) || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })();

  // Calculate previous period for comparison
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);

  return {
    start,
    end,
    prevStart: prevStart.toISOString().split('T')[0],
    prevEnd: prevEnd.toISOString().split('T')[0],
  };
}

// ── GET /api/stats/overview ──────────────────────
router.get('/overview', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const { start, end, prevStart, prevEnd } = getDateRange(req);

  const [current, previous, realtimeResult] = await Promise.all([
    query(`
      SELECT
        COUNT(pv.id)                             AS total_views,
        COUNT(DISTINCT pv.session_id)            AS total_sessions,
        COUNT(DISTINCT s.fingerprint_hash)       AS unique_visitors,
        ROUND(AVG(s.duration))                   AS avg_duration,
        ROUND(100.0 * COUNT(*) FILTER (WHERE s.is_bounce) / NULLIF(COUNT(DISTINCT pv.session_id), 0), 1) AS bounce_rate,
        ROUND(COUNT(pv.id)::numeric / NULLIF(COUNT(DISTINCT pv.session_id), 0), 1) AS pages_per_session
      FROM page_views pv
      JOIN sessions s ON s.id = pv.session_id
      WHERE pv.website_id = $1
        AND pv.entered_at >= $2::date
        AND pv.entered_at < ($3::date + INTERVAL '1 day')
    `, [websiteId, start, end]),

    query(`
      SELECT
        COUNT(pv.id) AS total_views,
        COUNT(DISTINCT pv.session_id) AS total_sessions,
        COUNT(DISTINCT s.fingerprint_hash) AS unique_visitors,
        ROUND(AVG(s.duration)) AS avg_duration,
        ROUND(100.0 * COUNT(*) FILTER (WHERE s.is_bounce) / NULLIF(COUNT(DISTINCT pv.session_id), 0), 1) AS bounce_rate
      FROM page_views pv
      JOIN sessions s ON s.id = pv.session_id
      WHERE pv.website_id = $1
        AND pv.entered_at >= $2::date
        AND pv.entered_at < ($3::date + INTERVAL '1 day')
    `, [websiteId, prevStart, prevEnd]),

    query(`
      SELECT COUNT(DISTINCT fingerprint_hash) as active
      FROM sessions
      WHERE website_id = $1
        AND started_at > NOW() - INTERVAL '5 minutes'
    `, [websiteId]),
  ]);

  const cur = current.rows[0] || {};
  const prev = previous.rows[0] || {};

  res.json({
    overview: {
      totalViews: parseInt(cur.total_views || '0'),
      totalSessions: parseInt(cur.total_sessions || '0'),
      uniqueVisitors: parseInt(cur.unique_visitors || '0'),
      avgDuration: parseInt(cur.avg_duration || '0'),
      bounceRate: parseFloat(cur.bounce_rate || '0'),
      pagesPerSession: parseFloat(cur.pages_per_session || '0'),
      activeVisitors: parseInt(realtimeResult.rows[0]?.active || '0'),
    },
    previous: {
      totalViews: parseInt(prev.total_views || '0'),
      totalSessions: parseInt(prev.total_sessions || '0'),
      uniqueVisitors: parseInt(prev.unique_visitors || '0'),
      avgDuration: parseInt(prev.avg_duration || '0'),
      bounceRate: parseFloat(prev.bounce_rate || '0'),
    },
    period: { start, end, prevStart, prevEnd },
  });
});

// ── GET /api/stats/timeseries ────────────────────
router.get('/timeseries', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const { start, end } = getDateRange(req);
  const unit = (req.query.unit as string) || 'day'; // day, hour

  let groupBy: string, dateFormat: string;
  if (unit === 'hour') {
    groupBy = `DATE_TRUNC('hour', entered_at)`;
    dateFormat = 'YYYY-MM-DD HH24:00';
  } else {
    groupBy = `DATE(entered_at)`;
    dateFormat = 'YYYY-MM-DD';
  }

  const result = await query(`
    SELECT
      TO_CHAR(${groupBy}, '${dateFormat}') AS date,
      COUNT(*) AS views,
      COUNT(DISTINCT session_id) AS sessions,
      COUNT(DISTINCT pv.session_id) FILTER (
        WHERE s.is_bounce = TRUE
      ) AS bounces
    FROM page_views pv
    JOIN sessions s ON s.id = pv.session_id
    WHERE pv.website_id = $1
      AND pv.entered_at >= $2::date
      AND pv.entered_at < ($3::date + INTERVAL '1 day')
    GROUP BY ${groupBy}
    ORDER BY ${groupBy}
  `, [websiteId, start, end]);

  res.json({ timeseries: result.rows });
});

// ── GET /api/stats/pages ─────────────────────────
router.get('/pages', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const { start, end } = getDateRange(req);
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const result = await query(`
    SELECT
      path,
      MAX(title) AS title,
      COUNT(*) AS views,
      COUNT(DISTINCT session_id) AS visitors,
      ROUND(AVG(time_on_page)) AS avg_time
    FROM page_views
    WHERE website_id = $1
      AND entered_at >= $2::date
      AND entered_at < ($3::date + INTERVAL '1 day')
    GROUP BY path
    ORDER BY views DESC
    LIMIT $4
  `, [websiteId, start, end, limit]);

  res.json({ pages: result.rows });
});

// ── GET /api/stats/sources ───────────────────────
router.get('/sources', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const { start, end } = getDateRange(req);
  const type = (req.query.type as string) || 'referrer'; // referrer, utm_source, utm_medium, utm_campaign

  let column: string;
  switch (type) {
    case 'utm_source': column = 'utm_source'; break;
    case 'utm_medium': column = 'utm_medium'; break;
    case 'utm_campaign': column = 'utm_campaign'; break;
    default: column = 'referrer_domain'; break;
  }

  const result = await query(`
    SELECT
      COALESCE(${column}, '(direct)') AS source,
      COUNT(DISTINCT id) AS sessions,
      COUNT(DISTINCT fingerprint_hash) AS visitors,
      ROUND(100.0 * COUNT(*) FILTER (WHERE is_bounce) / NULLIF(COUNT(*), 0), 1) AS bounce_rate
    FROM sessions
    WHERE website_id = $1
      AND started_at >= $2::date
      AND started_at < ($3::date + INTERVAL '1 day')
    GROUP BY ${column}
    ORDER BY sessions DESC
    LIMIT 20
  `, [websiteId, start, end]);

  res.json({ sources: result.rows });
});

// ── GET /api/stats/visitors ──────────────────────
router.get('/visitors', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const { start, end } = getDateRange(req);
  const by = (req.query.by as string) || 'country'; // country, browser, os, device, language, screen

  let selectCol: string, groupCol: string;
  switch (by) {
    case 'browser': selectCol = groupCol = 'browser'; break;
    case 'os': selectCol = groupCol = 'os'; break;
    case 'device': selectCol = 'device_type'; groupCol = 'device_type'; break;
    case 'language': selectCol = groupCol = 'language'; break;
    case 'screen':
      selectCol = `screen_width || 'x' || screen_height`;
      groupCol = 'screen_width, screen_height';
      break;
    default: selectCol = groupCol = 'country'; break;
  }

  const result = await query(`
    SELECT
      ${selectCol} AS value,
      COUNT(DISTINCT id) AS sessions,
      COUNT(DISTINCT fingerprint_hash) AS visitors
    FROM sessions
    WHERE website_id = $1
      AND started_at >= $2::date
      AND started_at < ($3::date + INTERVAL '1 day')
      AND ${by === 'screen' ? 'screen_width' : selectCol} IS NOT NULL
    GROUP BY ${groupCol}
    ORDER BY sessions DESC
    LIMIT 20
  `, [websiteId, start, end]);

  res.json({ visitors: result.rows });
});

// ── GET /api/stats/events ────────────────────────
router.get('/events', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const { start, end } = getDateRange(req);

  const result = await query(`
    SELECT
      name,
      COUNT(*) AS count,
      COUNT(DISTINCT session_id) AS sessions
    FROM events
    WHERE website_id = $1
      AND created_at >= $2::date
      AND created_at < ($3::date + INTERVAL '1 day')
    GROUP BY name
    ORDER BY count DESC
    LIMIT 20
  `, [websiteId, start, end]);

  res.json({ events: result.rows });
});

export const statsRouter = router;
