import { Router, Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { config } from '../../config/index.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// ── POST /api/auth/login ─────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const result = await query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcryptjs.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
      return;
    }
    throw err;
  }
});

// ── GET /api/auth/me ─────────────────────────────
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT id, username, role, created_at FROM users WHERE id = $1',
    [req.user!.userId],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user: result.rows[0] });
});

export const authRouter = router;
