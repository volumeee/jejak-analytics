import { Router, Request, Response } from 'express';
import { query } from '../../db/pool.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// ── GET /api/export/:type ────────────────────────
router.get('/:type', authMiddleware, async (req: Request, res: Response) => {
  const websiteId = req.query.websiteId as string;
  if (!websiteId) { res.status(400).json({ error: 'websiteId required' }); return; }

  const format = (req.query.format as string) || 'json';
  const start = (req.query.start as string) || (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
  const end = (req.query.end as string) || new Date().toISOString().split('T')[0];

  let sql: string;
  let filename: string;

  switch (req.params.type) {
    case 'pageviews':
      sql = `SELECT url, path, title, referrer, entered_at, time_on_page
             FROM page_views WHERE website_id = $1 AND entered_at >= $2::date AND entered_at < ($3::date + INTERVAL '1 day')
             ORDER BY entered_at DESC LIMIT 10000`;
      filename = 'pageviews';
      break;
    case 'events':
      sql = `SELECT name, properties, url, created_at
             FROM events WHERE website_id = $1 AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')
             ORDER BY created_at DESC LIMIT 10000`;
      filename = 'events';
      break;
    case 'sessions':
      sql = `SELECT fingerprint_hash, started_at, duration, is_bounce, entry_url, exit_url,
                    country, city, device_type, browser, os, referrer_domain, utm_source, utm_campaign
             FROM sessions WHERE website_id = $1 AND started_at >= $2::date AND started_at < ($3::date + INTERVAL '1 day')
             ORDER BY started_at DESC LIMIT 10000`;
      filename = 'sessions';
      break;
    case 'errors':
      sql = `SELECT message, source, line, col, url, browser, os, created_at
             FROM error_logs WHERE website_id = $1 AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')
             ORDER BY created_at DESC LIMIT 10000`;
      filename = 'errors';
      break;
    default:
      res.status(400).json({ error: 'Invalid export type. Use: pageviews, events, sessions, errors' });
      return;
  }

  const result = await query(sql, [websiteId, start, end]);

  if (format === 'csv') {
    const rows = result.rows;
    if (rows.length === 0) {
      res.status(200).send('No data');
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${start}_${end}.csv"`);
    res.send(csvLines.join('\n'));
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${start}_${end}.json"`);
    res.json({ data: result.rows, total: result.rows.length, period: { start, end } });
  }
});

export const exportRouter = router;
