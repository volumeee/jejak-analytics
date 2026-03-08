import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// In-memory store for shared links (in production, use database or Redis)
const sharedLinks = new Map<string, { websiteId: string; createdAt: number; expiresAt: number | null }>();

// ── POST /api/share ──────────────────────────────
// Create a shareable read-only dashboard link
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { websiteId, expiresIn } = req.body; // expiresIn in hours, null for no expiry
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  // Verify website exists
  const website = await query('SELECT id, name FROM websites WHERE id = $1', [websiteId]);
  if (website.rows.length === 0) { res.status(404).json({ error: 'Website not found' }); return; }

  const token = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  const expiresAt = expiresIn ? now + (expiresIn * 3600 * 1000) : null;

  sharedLinks.set(token, { websiteId, createdAt: now, expiresAt });

  res.json({
    shareUrl: `${req.protocol}://${req.get('host')}/#/shared/${token}`,
    token,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
  });
});

// ── GET /api/share/:token ────────────────────────
// Get website data via shared link (no auth required)
router.get('/:token', async (req: Request, res: Response) => {
  const link = sharedLinks.get(req.params.token as string);

  if (!link) {
    res.status(404).json({ error: 'Shared link not found or expired' });
    return;
  }

  if (link.expiresAt && Date.now() > link.expiresAt) {
    sharedLinks.delete(req.params.token as string);
    res.status(410).json({ error: 'Shared link has expired' });
    return;
  }

  const website = await query('SELECT id, name, domain FROM websites WHERE id = $1', [link.websiteId]);
  if (website.rows.length === 0) {
    res.status(404).json({ error: 'Website not found' });
    return;
  }

  res.json({ website: website.rows[0], websiteId: link.websiteId });
});

// ── GET /api/share/:token/stats ──────────────────
// Get overview stats via shared link
router.get('/:token/stats', async (req: Request, res: Response) => {
  const link = sharedLinks.get(req.params.token as string);
  if (!link || (link.expiresAt && Date.now() > link.expiresAt)) {
    res.status(404).json({ error: 'Invalid or expired link' });
    return;
  }

  const start = (req.query.start as string) || (() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];
  const isLive = start === 'live';

  const [overviewRes, timeseriesRes, pagesRes] = await Promise.all([
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
      ${isLive ? `AND pv.entered_at >= NOW() - INTERVAL '1 hour'` : `AND pv.entered_at >= $2::date AND pv.entered_at < ($3::date + INTERVAL '1 day')`}
    `, isLive ? [link.websiteId] : [link.websiteId, start, end]),
    query(`
      SELECT TO_CHAR(DATE(entered_at), 'YYYY-MM-DD') AS date, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions
      FROM page_views WHERE website_id = $1 
      ${isLive ? `AND entered_at >= NOW() - INTERVAL '1 hour'` : `AND entered_at >= $2::date AND entered_at < ($3::date + INTERVAL '1 day')`}
      GROUP BY DATE(entered_at) ORDER BY DATE(entered_at)
    `, isLive ? [link.websiteId] : [link.websiteId, start, end]),
    query(`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT session_id) AS visitors
      FROM page_views WHERE website_id = $1 
      ${isLive ? `AND entered_at >= NOW() - INTERVAL '1 hour'` : `AND entered_at >= $2::date AND entered_at < ($3::date + INTERVAL '1 day')`}
      GROUP BY path ORDER BY views DESC LIMIT 10
    `, isLive ? [link.websiteId] : [link.websiteId, start, end]),
  ]);

  res.json({
    overview: overviewRes.rows[0],
    timeseries: timeseriesRes.rows,
    topPages: pagesRes.rows,
    period: { start, end },
  });
});

// ── DELETE /api/share/:token ─────────────────────
router.delete('/:token', authMiddleware, async (_req: Request, res: Response) => {
  sharedLinks.delete(_req.params.token as string);
  res.json({ deleted: true });
});

export const shareRouter = router;
