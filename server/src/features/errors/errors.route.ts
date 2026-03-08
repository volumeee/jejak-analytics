import { Router, Request, Response } from 'express';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// ── GET /api/errors ──────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];
  const isLive = start === 'live';

  // Group errors by message
  const result = await query(`
    SELECT
      message,
      COUNT(*) AS count,
      COUNT(DISTINCT session_id) AS affected_sessions,
      MIN(created_at) AS first_seen,
      MAX(created_at) AS last_seen,
      (array_agg(url ORDER BY created_at DESC))[1] AS last_url,
      (array_agg(browser ORDER BY created_at DESC))[1] AS last_browser,
      (array_agg(stack ORDER BY created_at DESC))[1] AS last_stack
    FROM error_logs
    WHERE website_id = $1
      ${isLive ? `AND created_at >= NOW() - INTERVAL '1 hour'` : `AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')`}
    GROUP BY message
    ORDER BY count DESC
    LIMIT 50
  `, isLive ? [websiteId] : [websiteId, start, end]);

  const total = await query(`
    SELECT COUNT(DISTINCT message) AS count FROM error_logs
    WHERE website_id = $1
      ${isLive ? `AND created_at >= NOW() - INTERVAL '1 hour'` : `AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')`}
  `, isLive ? [websiteId] : [websiteId, start, end]);

  res.json({
    errors: result.rows,
    totalGroups: parseInt(total.rows[0].count),
    period: { start, end },
  });
});

// ── GET /api/errors/timeseries ───────────────────
router.get('/timeseries', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];
  const isLive = start === 'live';

  const result = await query(`
    SELECT
      TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
      COUNT(*) AS count,
      COUNT(DISTINCT message) AS unique_errors
    FROM error_logs
    WHERE website_id = $1
      ${isLive ? `AND created_at >= NOW() - INTERVAL '1 hour'` : `AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')`}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `, isLive ? [websiteId] : [websiteId, start, end]);

  res.json({ timeseries: result.rows });
});

export const errorsRouter = router;
