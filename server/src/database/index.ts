import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { schema } from './schema';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../data/enqflow.db');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  console.log('Initializing database schema...');
  db.exec(schema);
  console.log('Database schema initialized successfully.');
}
