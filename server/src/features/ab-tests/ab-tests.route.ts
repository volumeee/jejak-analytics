import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

const abTestSchema = z.object({
  websiteId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  variants: z.array(z.object({ name: z.string(), weight: z.number().min(0).max(100) })).min(2),
  goalEvent: z.string().optional(),
});

// ── GET /api/ab-tests ────────────────────────────
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const result = await query(
    'SELECT * FROM ab_tests WHERE website_id = $1 ORDER BY created_at DESC',
    [websiteId],
  );
  res.json({ tests: result.rows });
});

// ── POST /api/ab-tests ───────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = abTestSchema.parse(req.body);
    const result = await query(
      `INSERT INTO ab_tests (website_id, name, description, variants, goal_event, status)
       VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
      [data.websiteId, data.name, data.description, JSON.stringify(data.variants), data.goalEvent],
    );
    res.status(201).json({ test: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid input', details: err.errors }); return; }
    throw err;
  }
});

// ── PATCH /api/ab-tests/:id/status ───────────────
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  const status = req.body.status;
  if (!['running', 'paused', 'completed'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  const result = await query(
    'UPDATE ab_tests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, req.params.id],
  );
  if (result.rows.length === 0) { res.status(404).json({ error: 'Test not found' }); return; }
  res.json({ test: result.rows[0] });
});

// ── GET /api/ab-tests/:id/results ────────────────
router.get('/:id/results', authMiddleware, async (req: Request, res: Response) => {
  const testResult = await query('SELECT * FROM ab_tests WHERE id = $1', [req.params.id]);
  if (testResult.rows.length === 0) { res.status(404).json({ error: 'Test not found' }); return; }

  const test = testResult.rows[0];
  const variants = typeof test.variants === 'string' ? JSON.parse(test.variants) : test.variants;

  const assignmentsResult = await query(`
    SELECT
      variant,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE converted = TRUE) AS conversions
    FROM ab_test_assignments
    WHERE test_id = $1
    GROUP BY variant
  `, [req.params.id]);

  const results = variants.map((v: any) => {
    const data = assignmentsResult.rows.find((r: any) => r.variant === v.name) || { total: 0, conversions: 0 };
    const total = parseInt(data.total) || 0;
    const conversions = parseInt(data.conversions) || 0;
    const conversionRate = total > 0 ? Math.round((conversions / total) * 10000) / 100 : 0;

    return {
      name: v.name,
      weight: v.weight,
      total,
      conversions,
      conversionRate,
    };
  });

  // Simple significance check (chi-square approximation)
  const totalSamples = results.reduce((sum: number, r: any) => sum + r.total, 0);
  const isSignificant = totalSamples >= 100 && results.every((r: any) => r.total >= 30);

  res.json({ test, results, isSignificant, totalSamples });
});

// ── POST /api/ab-tests/assign ────────────────────
// Called by tracker to get variant assignment
router.post('/assign', async (req: Request, res: Response) => {
  const { testId, sessionId } = req.body;
  if (!testId || !sessionId) { res.status(400).json({ error: 'testId and sessionId required' }); return; }

  // Check existing assignment
  const existing = await query(
    'SELECT variant FROM ab_test_assignments WHERE test_id = $1 AND session_id = $2',
    [testId, sessionId],
  );
  if (existing.rows.length > 0) {
    res.json({ variant: existing.rows[0].variant }); return;
  }

  // Get test config
  const testResult = await query(
    "SELECT variants FROM ab_tests WHERE id = $1 AND status = 'running'",
    [testId],
  );
  if (testResult.rows.length === 0) { res.status(200).json({ variant: null, error: 'Test not found or not running' }); return; }

  const variants = typeof testResult.rows[0].variants === 'string'
    ? JSON.parse(testResult.rows[0].variants) : testResult.rows[0].variants;

  // Weighted random assignment
  const totalWeight = variants.reduce((sum: number, v: any) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedVariant = variants[0].name;
  for (const v of variants) {
    random -= v.weight;
    if (random <= 0) { selectedVariant = v.name; break; }
  }

  await query(
    'INSERT INTO ab_test_assignments (test_id, session_id, variant) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [testId, sessionId, selectedVariant],
  );

  res.json({ variant: selectedVariant });
});

// ── DELETE /api/ab-tests/:id ─────────────────────
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  await query('DELETE FROM ab_tests WHERE id = $1', [req.params.id]);
  res.json({ deleted: true });
});

export const abTestsRouter = router;
