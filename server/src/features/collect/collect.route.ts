import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, getClient } from '../../db/pool.js';
import { parseUserAgent } from '../../shared/services/useragent.service.js';
import { resolveGeoLocation } from '../../shared/services/geolocation.service.js';
import { broadcastRealtime } from '../realtime/realtime.service.js';
import { createRateLimiter } from '../../shared/middleware/rateLimit.middleware.js';
import { config } from '../../config/index.js';

const router = Router();

// ── Schemas ──────────────────────────────────────
const pageViewSchema = z.object({
  type: z.literal('pageview'),
  url: z.string(),
  path: z.string().optional(),
  title: z.string().optional(),
  referrer: z.string().optional(),
});

const eventSchema = z.object({
  type: z.literal('event'),
  name: z.string(),
  url: z.string().optional(),
  properties: z.record(z.any()).optional(),
});

const heatmapSchema = z.object({
  type: z.literal('heatmap'),
  url: z.string(),
  path: z.string().optional(),
  eventType: z.enum(['click', 'scroll', 'move']),
  x: z.number(),
  y: z.number(),
  viewportWidth: z.number().optional(),
  viewportHeight: z.number().optional(),
  elementSelector: z.string().optional(),
});

const performanceSchema = z.object({
  type: z.literal('performance'),
  url: z.string(),
  path: z.string().optional(),
  lcp: z.number().nullable().optional(),
  fid: z.number().nullable().optional(),
  inp: z.number().nullable().optional(),
  cls: z.number().nullable().optional(),
  fcp: z.number().nullable().optional(),
  ttfb: z.number().nullable().optional(),
});

const errorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  stack: z.string().optional(),
  source: z.string().optional(),
  line: z.number().optional(),
  col: z.number().optional(),
  url: z.string().optional(),
});

const sessionRecordingSchema = z.object({
  type: z.literal('recording'),
  events: z.array(z.any()),
});

const payloadItem = z.discriminatedUnion('type', [
  pageViewSchema,
  eventSchema,
  heatmapSchema,
  performanceSchema,
  errorSchema,
  sessionRecordingSchema,
]);

const collectSchema = z.object({
  websiteId: z.string().uuid(),
  fingerprint: z.string(),
  sessionId: z.string().optional(),
  timezone: z.string().optional(),
  screenWidth: z.number().optional(),
  screenHeight: z.number().optional(),
  language: z.string().optional(),
  payload: z.array(payloadItem).min(1).max(100),
});

// Rate limit: 200 requests/min for collection endpoint
router.use(createRateLimiter(config.rateLimit.collect.windowMs, config.rateLimit.collect.max));

// ── POST /api/event ──────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = collectSchema.parse(req.body);
    const ua = parseUserAgent(req.headers['user-agent']);
    const geo = resolveGeoLocation(
      req.ip || '',
      { ...req.headers, 'x-timezone': body.timezone } as any,
    );

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // ── Resolve or create session ──────────────
      let sessionId = body.sessionId;

      if (!sessionId) {
        // Check for existing active session (within last 30 min)
        const existingSession = await client.query(
          `SELECT id FROM sessions 
           WHERE website_id = $1 AND fingerprint_hash = $2 
           AND started_at > NOW() - INTERVAL '30 minutes'
           ORDER BY started_at DESC LIMIT 1`,
          [body.websiteId, body.fingerprint],
        );

        if (existingSession.rows.length > 0) {
          sessionId = existingSession.rows[0].id;
        } else {
          // Create new session
          const entryUrl = body.payload.find(p => p.type === 'pageview')?.url || '';
          const newSession = await client.query(
            `INSERT INTO sessions (
              website_id, fingerprint_hash, entry_url,
              country, city, device_type, browser, browser_version,
              os, os_version, screen_width, screen_height, language,
              referrer, referrer_domain,
              utm_source, utm_medium, utm_campaign, utm_content, utm_term
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
            RETURNING id`,
            [
              body.websiteId, body.fingerprint, entryUrl,
              geo.country, geo.city, ua.deviceType, ua.browser, ua.browserVersion,
              ua.os, ua.osVersion, body.screenWidth || null, body.screenHeight || null,
              body.language || null,
              null, null, // referrer parsed from first pageview
              null, null, null, null, null, // UTMs parsed from first pageview
            ],
          );
          sessionId = newSession.rows[0].id;
        }
      }

      // ── Process payload items ──────────────────
      let pageViewCount = 0;

      for (const item of body.payload) {
        switch (item.type) {
          case 'pageview': {
            pageViewCount++;
            // Parse UTM params from URL
            let utmSource, utmMedium, utmCampaign, utmContent, utmTerm, referrerDomain;
            try {
              const urlObj = new URL(item.url);
              utmSource = urlObj.searchParams.get('utm_source') || undefined;
              utmMedium = urlObj.searchParams.get('utm_medium') || undefined;
              utmCampaign = urlObj.searchParams.get('utm_campaign') || undefined;
              utmContent = urlObj.searchParams.get('utm_content') || undefined;
              utmTerm = urlObj.searchParams.get('utm_term') || undefined;
            } catch { /* ignore invalid URLs */ }

            if (item.referrer) {
              try { referrerDomain = new URL(item.referrer).hostname; } catch { /* ignore */ }
            }

            // Update session with referrer/UTM if first pageview
            if (pageViewCount === 1) {
              await client.query(
                `UPDATE sessions SET 
                  referrer = COALESCE(referrer, $2),
                  referrer_domain = COALESCE(referrer_domain, $3),
                  utm_source = COALESCE(utm_source, $4),
                  utm_medium = COALESCE(utm_medium, $5),
                  utm_campaign = COALESCE(utm_campaign, $6),
                  utm_content = COALESCE(utm_content, $7),
                  utm_term = COALESCE(utm_term, $8)
                WHERE id = $1`,
                [sessionId, item.referrer, referrerDomain, utmSource, utmMedium, utmCampaign, utmContent, utmTerm],
              );
            }

            const path = item.path || (() => { try { return new URL(item.url).pathname; } catch { return '/'; } })();
            await client.query(
              `INSERT INTO page_views (session_id, website_id, url, path, title, referrer)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [sessionId, body.websiteId, item.url, path, item.title, item.referrer],
            );

            // A/B Test check
            await trackABConversion(client, sessionId!, item.path || path, true);
            break;
          }

          case 'event': {
            await client.query(
              `INSERT INTO events (session_id, website_id, name, properties, url)
               VALUES ($1, $2, $3, $4, $5)`,
              [sessionId, body.websiteId, item.name, JSON.stringify(item.properties || {}), item.url],
            );
            
            // A/B Test check
            await trackABConversion(client, sessionId!, item.name, false);
            break;
          }

          case 'heatmap': {
            const hPath = item.path || (() => { try { return new URL(item.url).pathname; } catch { return '/'; } })();
            await client.query(
              `INSERT INTO heatmap_data (website_id, session_id, url, path, event_type, x, y, viewport_width, viewport_height, element_selector, device_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [body.websiteId, sessionId, item.url, hPath, item.eventType, item.x, item.y, item.viewportWidth, item.viewportHeight, item.elementSelector, ua.deviceType],
            );
            break;
          }

          case 'performance': {
            const pPath = item.path || (() => { try { return new URL(item.url).pathname; } catch { return '/'; } })();
            await client.query(
              `INSERT INTO performance_metrics (session_id, website_id, url, path, lcp, fid, inp, cls, fcp, ttfb)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [sessionId, body.websiteId, item.url, pPath, item.lcp, item.fid, item.inp, item.cls, item.fcp, item.ttfb],
            );
            break;
          }

          case 'error': {
            await client.query(
              `INSERT INTO error_logs (session_id, website_id, message, stack, source, line, col, url, browser, os)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [sessionId, body.websiteId, item.message, item.stack, item.source, item.line, item.col, item.url, ua.browser, ua.os],
            );
            break;
          }

          case 'recording': {
            await client.query(
              `INSERT INTO session_recordings (session_id, website_id, events_data)
               VALUES ($1, $2, $3)
               ON CONFLICT (session_id) WHERE FALSE
               DO NOTHING`,
              [sessionId, body.websiteId, JSON.stringify(item.events)],
            );
            break;
          }
        }
      }

      // Update session: mark not bounced if multiple page views, update duration
      if (pageViewCount > 0) {
        await client.query(
          `UPDATE sessions SET
            is_bounce = CASE WHEN (SELECT COUNT(*) FROM page_views WHERE session_id = $1) > 1 THEN FALSE ELSE TRUE END,
            exit_url = $2,
            ended_at = NOW(),
            duration = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
          WHERE id = $1`,
          [sessionId, body.payload.filter(p => p.type === 'pageview').pop()?.url],
        );
      }

      await client.query('COMMIT');

      // Broadcast real-time update
      broadcastRealtime(body.websiteId, {
        type: 'pageview',
        sessionId: sessionId!,
        pageViews: pageViewCount,
        events: body.payload.filter(p => p.type === 'event').length,
        path: body.payload.find(p => p.type === 'pageview')?.path || body.payload.find(p => p.type === 'pageview')?.url,
        country: geo.country,
        device: ua.deviceType,
      });

      res.status(202).json({ ok: true, sessionId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid payload', details: err.errors });
      return;
    }
    console.error('[COLLECT] Error:', err);
    res.status(500).json({ error: 'Collection failed' });
  }
});

async function trackABConversion(client: any, sessionId: string, goal: string, isPath: boolean) {
  try {
    // If it's a path, ensure it starts with / for matching
    const matchGoal = isPath && !goal.startsWith('/') ? `/${goal}` : goal;
    
    const result = await client.query(
      `UPDATE ab_test_assignments
       SET converted = TRUE, created_at = created_at
       FROM ab_tests
       WHERE ab_test_assignments.test_id = ab_tests.id
         AND ab_test_assignments.session_id = $1
         AND ab_tests.goal_event = $2
         AND ab_test_assignments.converted = FALSE`,
      [sessionId, matchGoal],
    );
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[AB] Converted session ${sessionId} for goal: ${matchGoal}`);
    } else {
      // console.log(`[AB] No conversion for session ${sessionId}, goal: ${matchGoal}`);
    }
  } catch (e) {
    console.error('[COLLECT] AB Conversion Error:', e);
  }
}

export const collectRouter = router;
