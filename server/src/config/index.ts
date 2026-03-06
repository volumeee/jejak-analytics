import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from monorepo root (parent of server/)
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
// Also try current directory .env
dotenv.config();

export const config = {
  // ── Server ───────────────────────────────────────
  port: parseInt(process.env.PORT || '3100', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3101',

  // ── Database ─────────────────────────────────────
  databaseUrl: process.env.DATABASE_URL || 'postgresql://jejak:jejak_secret@localhost:5432/jejak_analytics',

  // ── Redis ────────────────────────────────────────
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // ── Auth ─────────────────────────────────────────
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: '7d',

  // ── Admin ────────────────────────────────────────
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',

  // ── Data Retention (days) ────────────────────────
  retention: {
    pageViews: parseInt(process.env.RETENTION_PAGE_VIEWS || '365', 10),
    sessions: parseInt(process.env.RETENTION_SESSIONS || '365', 10),
    recordings: parseInt(process.env.RETENTION_RECORDINGS || '30', 10),
    heatmaps: parseInt(process.env.RETENTION_HEATMAPS || '90', 10),
    errors: parseInt(process.env.RETENTION_ERRORS || '90', 10),
  },

  // ── Rate Limiting ────────────────────────────────
  rateLimit: {
    collect: { windowMs: 60_000, max: 200 },  // per IP
    api: { windowMs: 60_000, max: 100 },
  },
} as const;

export type Config = typeof config;
