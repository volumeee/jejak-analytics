import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

const createWebsiteSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
});

// ── GET /api/websites ────────────────────────────
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  const result = await query(
    'SELECT id, name, domain, created_at, updated_at FROM websites ORDER BY created_at DESC',
  );
  res.json({ websites: result.rows });
});

// ── POST /api/websites ───────────────────────────
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, domain } = createWebsiteSchema.parse(req.body);

    const result = await query(
      'INSERT INTO websites (name, domain) VALUES ($1, $2) RETURNING *',
      [name, domain],
    );

    res.status(201).json({ website: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    if ((err as any).code === '23505') {
      res.status(409).json({ error: 'Domain already exists' });
      return;
    }
    throw err;
  }
});

// ── GET /api/websites/:id ────────────────────────
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM websites WHERE id = $1', [req.params.id]);

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Website not found' });
    return;
  }

  res.json({ website: result.rows[0] });
});

// ── DELETE /api/websites/:id ─────────────────────
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const result = await query('DELETE FROM websites WHERE id = $1 RETURNING id', [req.params.id]);

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Website not found' });
    return;
  }

  res.json({ deleted: true });
});

export const websitesRouter = router;
