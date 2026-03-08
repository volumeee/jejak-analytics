import { Router, Request, Response } from 'express';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// ── GET /api/heatmaps ────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  const path = req.query.path as string;
  const eventType = (req.query.eventType as string) || 'click';
  const deviceType = req.query.deviceType as string;

  if (!websiteId || !path) {
    res.status(400).json({ error: 'websiteId and path required' });
    return;
  }

  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];
  const isLive = start === 'live';

  let sql = `
    SELECT x, y, COUNT(*) AS intensity
    FROM heatmap_data
    WHERE website_id = $1
      AND path = $2
      AND event_type = $3
      ${isLive ? `AND created_at >= NOW() - INTERVAL '1 hour'` : `AND created_at >= $4::date AND created_at < ($5::date + INTERVAL '1 day')`}
  `;
  const params: any[] = isLive ? [websiteId, path, eventType] : [websiteId, path, eventType, start, end];

  if (deviceType) {
    sql += ` AND device_type = $${params.length + 1}`;
    params.push(deviceType);
  }

  sql += ' GROUP BY x, y ORDER BY intensity DESC LIMIT 5000';

  const result = await query(sql, params);

  res.json({
    points: result.rows.map(r => ({
      x: parseFloat(r.x),
      y: parseFloat(r.y),
      value: parseInt(r.intensity),
    })),
    total: result.rows.length,
  });
});

// ── GET /api/heatmaps/pages ──────────────────────
// Returns all pages that have either heatmap data OR page views
router.get('/pages', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];
  const isLive = start === 'live';

  // Merge page_views paths + heatmap_data paths for richer dropdown
  const result = await query(`
    SELECT path, MAX(url) AS url, SUM(clicks) AS clicks, SUM(views) AS views
    FROM (
      -- Pages from heatmap click data
      SELECT path, MAX(url) AS url, COUNT(*) AS clicks, 0 AS views
      FROM heatmap_data
      WHERE website_id = $1
        AND event_type = 'click'
        ${isLive ? `AND created_at >= NOW() - INTERVAL '1 hour'` : `AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')`}
        AND path IS NOT NULL
      GROUP BY path

      UNION ALL

      -- Pages from page_views (ensures all pages appear even without click events)
      SELECT path, MAX(url) AS url, 0 AS clicks, COUNT(*) AS views
      FROM page_views
      WHERE website_id = $1
        ${isLive ? `AND entered_at >= NOW() - INTERVAL '1 hour'` : `AND entered_at >= $2::date AND entered_at < ($3::date + INTERVAL '1 day')`}
        AND path IS NOT NULL
      GROUP BY path
    ) combined
    GROUP BY path
    ORDER BY clicks DESC, views DESC
    LIMIT 100
  `, isLive ? [websiteId] : [websiteId, start, end]);

  res.json({ pages: result.rows });
});

export const heatmapsRouter = router;
