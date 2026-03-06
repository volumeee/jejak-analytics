import { Router, Request, Response } from 'express';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// ── GET /api/sessions ────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const result = await query(`
    SELECT
      s.id, s.fingerprint_hash, s.started_at, s.ended_at, s.duration,
      s.is_bounce, s.entry_url, s.exit_url,
      s.country, s.city, s.device_type, s.browser, s.os,
      s.referrer_domain, s.utm_source,
      COUNT(pv.id) AS page_count,
      EXISTS(SELECT 1 FROM session_recordings sr WHERE sr.session_id = s.id) AS has_recording
    FROM sessions s
    LEFT JOIN page_views pv ON pv.session_id = s.id
    WHERE s.website_id = $1
    GROUP BY s.id
    ORDER BY s.started_at DESC
    LIMIT $2 OFFSET $3
  `, [websiteId, limit, offset]);

  const countResult = await query(
    'SELECT COUNT(*) FROM sessions WHERE website_id = $1',
    [websiteId],
  );

  res.json({
    sessions: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset,
  });
});

// ── GET /api/sessions/:id ────────────────────────
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const [sessionResult, pageViewsResult] = await Promise.all([
    query('SELECT * FROM sessions WHERE id = $1', [req.params.id]),
    query(
      'SELECT url, path, title, entered_at, time_on_page FROM page_views WHERE session_id = $1 ORDER BY entered_at',
      [req.params.id],
    ),
  ]);

  if (sessionResult.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({
    session: sessionResult.rows[0],
    pageViews: pageViewsResult.rows,
  });
});

// ── GET /api/sessions/:id/recording ──────────────
router.get('/:id/recording', authMiddleware, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT events_data FROM session_recordings WHERE session_id = $1 ORDER BY created_at',
    [req.params.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  // Merge all recording chunks
  const allEvents = result.rows.flatMap(r => 
    typeof r.events_data === 'string' ? JSON.parse(r.events_data) : r.events_data
  );

  res.json({ events: allEvents });
});

export const sessionsRouter = router;
