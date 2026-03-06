import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

const funnelSchema = z.object({
  name: z.string().min(1),
  steps: z.array(z.object({
    name: z.string(),
    type: z.enum(['pageview', 'event']),
    value: z.string(), // path or event name
  })).min(2),
});

// ── GET /api/funnels ─────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const result = await query(
    'SELECT * FROM funnels WHERE website_id = $1 ORDER BY created_at DESC',
    [websiteId],
  );
  res.json({ funnels: result.rows });
});

// ── POST /api/funnels ────────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const websiteId = req.body.websiteId;
    const { name, steps } = funnelSchema.parse(req.body);

    const result = await query(
      'INSERT INTO funnels (website_id, name, steps) VALUES ($1, $2, $3) RETURNING *',
      [websiteId, name, JSON.stringify(steps)],
    );
    res.status(201).json({ funnel: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid input', details: err.errors }); return; }
    throw err;
  }
});

// ── GET /api/funnels/:id/analyze ─────────────────
router.get('/:id/analyze', authMiddleware, async (req: Request, res: Response) => {
  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];

  const funnelResult = await query('SELECT * FROM funnels WHERE id = $1', [req.params.id]);
  if (funnelResult.rows.length === 0) { res.status(404).json({ error: 'Funnel not found' }); return; }

  const funnel = funnelResult.rows[0];
  const steps = typeof funnel.steps === 'string' ? JSON.parse(funnel.steps) : funnel.steps;
  const websiteId = funnel.website_id;

  // Analyze each step
  const analysis = [];
  let previousSessionIds: string[] | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let result;

    if (step.type === 'pageview') {
      let sql = `
        SELECT DISTINCT session_id FROM page_views
        WHERE website_id = $1 AND path = $2
        AND entered_at >= $3::date AND entered_at < ($4::date + INTERVAL '1 day')
      `;
      const params: any[] = [websiteId, step.value, start, end];

      if (previousSessionIds && previousSessionIds.length > 0) {
        sql += ` AND session_id = ANY($5)`;
        params.push(previousSessionIds);
      }

      result = await query(sql, params);
    } else {
      let sql = `
        SELECT DISTINCT session_id FROM events
        WHERE website_id = $1 AND name = $2
        AND created_at >= $3::date AND created_at < ($4::date + INTERVAL '1 day')
      `;
      const params: any[] = [websiteId, step.value, start, end];

      if (previousSessionIds && previousSessionIds.length > 0) {
        sql += ` AND session_id = ANY($5)`;
        params.push(previousSessionIds);
      }

      result = await query(sql, params);
    }

    const sessionIds = result.rows.map((r: any) => r.session_id);
    const count = sessionIds.length;
    const prevCount = previousSessionIds ? previousSessionIds.length : count;
    const dropoff = previousSessionIds ? prevCount - count : 0;
    const rate = prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 100;

    analysis.push({
      step: i + 1,
      name: step.name,
      type: step.type,
      value: step.value,
      count,
      dropoff,
      conversionRate: rate,
    });

    previousSessionIds = sessionIds;
  }

  res.json({ funnel, analysis, period: { start, end } });
});

// ── DELETE /api/funnels/:id ──────────────────────
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  await query('DELETE FROM funnels WHERE id = $1', [req.params.id]);
  res.json({ deleted: true });
});

export const funnelsRouter = router;
