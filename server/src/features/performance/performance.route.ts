import { Router, Request, Response } from 'express';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// ── GET /api/performance ─────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];

  const result = await query(`
    SELECT
      ROUND(AVG(lcp)::numeric, 0)   AS avg_lcp,
      ROUND(AVG(fid)::numeric, 0)   AS avg_fid,
      ROUND(AVG(inp)::numeric, 0)   AS avg_inp,
      ROUND(AVG(cls)::numeric, 3)   AS avg_cls,
      ROUND(AVG(fcp)::numeric, 0)   AS avg_fcp,
      ROUND(AVG(ttfb)::numeric, 0)  AS avg_ttfb,
      COUNT(*)                       AS samples,

      -- Good/Needs Improvement/Poor percentages
      ROUND(100.0 * COUNT(*) FILTER (WHERE lcp <= 2500) / NULLIF(COUNT(lcp), 0), 1) AS lcp_good,
      ROUND(100.0 * COUNT(*) FILTER (WHERE lcp > 2500 AND lcp <= 4000) / NULLIF(COUNT(lcp), 0), 1) AS lcp_needs,
      ROUND(100.0 * COUNT(*) FILTER (WHERE lcp > 4000) / NULLIF(COUNT(lcp), 0), 1) AS lcp_poor,

      ROUND(100.0 * COUNT(*) FILTER (WHERE cls <= 0.1) / NULLIF(COUNT(cls), 0), 1) AS cls_good,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cls > 0.1 AND cls <= 0.25) / NULLIF(COUNT(cls), 0), 1) AS cls_needs,
      ROUND(100.0 * COUNT(*) FILTER (WHERE cls > 0.25) / NULLIF(COUNT(cls), 0), 1) AS cls_poor,

      ROUND(100.0 * COUNT(*) FILTER (WHERE fcp <= 1800) / NULLIF(COUNT(fcp), 0), 1) AS fcp_good,
      ROUND(100.0 * COUNT(*) FILTER (WHERE ttfb <= 800) / NULLIF(COUNT(ttfb), 0), 1) AS ttfb_good
    FROM performance_metrics
    WHERE website_id = $1
      AND created_at >= $2::date
      AND created_at < ($3::date + INTERVAL '1 day')
  `, [websiteId, start, end]);

  res.json({ performance: result.rows[0], period: { start, end } });
});

// ── GET /api/performance/pages ───────────────────
router.get('/pages', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];

  const result = await query(`
    SELECT
      path,
      ROUND(AVG(lcp)::numeric, 0) AS avg_lcp,
      ROUND(AVG(fcp)::numeric, 0) AS avg_fcp,
      ROUND(AVG(cls)::numeric, 3) AS avg_cls,
      ROUND(AVG(ttfb)::numeric, 0) AS avg_ttfb,
      COUNT(*) AS samples
    FROM performance_metrics
    WHERE website_id = $1
      AND created_at >= $2::date
      AND created_at < ($3::date + INTERVAL '1 day')
    GROUP BY path
    ORDER BY samples DESC
    LIMIT 20
  `, [websiteId, start, end]);

  res.json({ pages: result.rows });
});

// ── GET /api/performance/timeseries ──────────────
router.get('/timeseries', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];

  const result = await query(`
    SELECT
      TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
      ROUND(AVG(lcp)::numeric, 0) AS lcp,
      ROUND(AVG(fcp)::numeric, 0) AS fcp,
      ROUND(AVG(cls)::numeric, 3) AS cls,
      ROUND(AVG(ttfb)::numeric, 0) AS ttfb,
      COUNT(*) AS samples
    FROM performance_metrics
    WHERE website_id = $1
      AND created_at >= $2::date
      AND created_at < ($3::date + INTERVAL '1 day')
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `, [websiteId, start, end]);

  res.json({ timeseries: result.rows });
});

export const performanceRouter = router;
