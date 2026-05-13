const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || 'pathhub.db';

const db = new Database(DB_PATH);

db.exec(`CREATE TABLE IF NOT EXISTS shared_paths (
    id TEXT PRIMARY KEY,
    original_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0
)`);

module.exports = db;
