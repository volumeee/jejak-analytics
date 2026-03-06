import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { config } from '../config/index.js';
import bcryptjs from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function initDatabase(): Promise<void> {
  console.log('[DB] Initializing database...');

  // Run schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schemaSql);
  console.log('[DB] Schema applied successfully');

  // Create default admin if not exists
  const adminCheck = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [config.adminUsername],
  );

  if (adminCheck.rows.length === 0) {
    const hash = await bcryptjs.hash(config.adminPassword, 12);
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [config.adminUsername, hash, 'admin'],
    );
    console.log(`[DB] Default admin user "${config.adminUsername}" created`);
  }

  console.log('[DB] Database ready');
}

// If run directly
if (process.argv[1] && process.argv[1].includes('init')) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB] Init failed:', err);
      process.exit(1);
    });
}
