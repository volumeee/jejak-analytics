import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'node:url';

import { config } from './config/index.js';
import { initDatabase } from './db/init.js';
import { healthCheck } from './db/pool.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { addRealtimeClient } from './features/realtime/realtime.service.js';

// ── Feature routes ───────────────────────────────
import { authRouter } from './features/auth/auth.route.js';
import { websitesRouter } from './features/websites/websites.route.js';
import { collectRouter } from './features/collect/collect.route.js';
import { statsRouter } from './features/stats/stats.route.js';
import { sessionsRouter } from './features/sessions/sessions.route.js';
import { heatmapsRouter } from './features/heatmaps/heatmaps.route.js';
import { funnelsRouter } from './features/funnels/funnels.route.js';
import { abTestsRouter } from './features/ab-tests/ab-tests.route.js';
import { performanceRouter } from './features/performance/performance.route.js';
import { errorsRouter } from './features/errors/errors.route.js';
import { exportRouter } from './features/export/export.route.js';
import { shareRouter } from './features/share/share.route.js';

// ── Express app ──────────────────────────────────
const app = express();
const server = createServer(app);

// ── Middleware ────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Dynamic CORS: allow any origin for collect/tracker (public endpoints),
// restrict dashboard API to configured origin
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, curl)
    if (!origin) return callback(null, true);
    // Always allow for any origin — tracker can be embedded anywhere
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '5mb' }));

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

// ── Health check ─────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const dbOk = await healthCheck();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── API Routes ───────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/websites', websitesRouter);
app.use('/api/collect', collectRouter);
app.use('/api/stats', statsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/heatmaps', heatmapsRouter);
app.use('/api/funnels', funnelsRouter);
app.use('/api/ab-tests', abTestsRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/errors', errorsRouter);
app.use('/api/export', exportRouter);
app.use('/api/share', shareRouter);

// ── Serve tracker script (static) ────────────────
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Try multiple paths: monorepo dev, Docker production
const trackerPaths = [
  path.join(__dirname, '../../tracker/dist/tracker.js'),  // dev: server/src -> tracker/dist
  path.join(process.cwd(), '../tracker/dist/tracker.js'), // dev: from server/
  path.join(process.cwd(), 'public/tracker.js'),          // Docker: /app/public/
];
const trackerPath = trackerPaths.find(p => fs.existsSync(p));
if (trackerPath) {
  app.get('/tracker.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(trackerPath);
  });
}

// ── Error handler ────────────────────────────────
app.use(errorMiddleware);

// ── WebSocket server ─────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket, req) => {
  // Parse websiteId from query string: /ws?websiteId=xxx
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const websiteId = url.searchParams.get('websiteId');

  if (!websiteId) {
    ws.close(1008, 'websiteId required');
    return;
  }

  addRealtimeClient(websiteId, ws);

  // Keep alive
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30_000);

  ws.on('close', () => clearInterval(interval));
});

// ── Start server ─────────────────────────────────
async function start() {
  try {
    // Initialize database (create tables + default admin)
    await initDatabase();

    server.listen(config.port, () => {
      const trackerUrl = `http://localhost:${config.port}/tracker.js`;
      const isTrackerActive = fs.existsSync(trackerPath || '');

      console.log(`
  \x1b[35mJejak — Self-Hosted Web Analytics v1.0.0\x1b[0m
  ───────────────────────────────────────────────
  \x1b[32m✔\x1b[0m Database      : \x1b[1mConnected\x1b[0m
  \x1b[32m✔\x1b[0m API Service   : \x1b[1mhttp://localhost:${config.port}\x1b[0m
  \x1b[32m✔\x1b[0m WebSocket Sw  : \x1b[1mws://localhost:${config.port}/ws\x1b[0m
  \x1b[32m✔\x1b[0m Health Check  : \x1b[1mhttp://localhost:${config.port}/api/health\x1b[0m
  \x1b[32m✔\x1b[0m Deployment    : \x1b[1m${config.nodeEnv}\x1b[0m
  ───────────────────────────────────────────────
  \x1b[36m⚡ Tracker URL   : ${isTrackerActive ? `\x1b[1m\x1b[32m${trackerUrl}\x1b[0m` : '\x1b[31mNot Found (Rebuild required)\x1b[0m'}
  ───────────────────────────────────────────────
  \x1b[2mPress Ctrl+C to shutdown safely\x1b[0m
      `);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

// ── Graceful shutdown ────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  wss.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  wss.close();
  server.close();
  process.exit(0);
});

start();
