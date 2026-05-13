const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || 'pathhub.db';

const db = new Database(DB_PATH);

db.exec(`CREATE TABLE IF NOT EXISTS shared_paths (
    id TEXT PRIMARY KEY,
    original_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0
)`);

function migrate() {
    const columns = db.prepare("PRAGMA table_info(shared_paths)").all().map(c => c.name);
    const additions = [
        { name: 'paths_json', sql: 'ALTER TABLE shared_paths ADD COLUMN paths_json TEXT' },
        { name: 'tags', sql: 'ALTER TABLE shared_paths ADD COLUMN tags TEXT' },
        { name: 'note', sql: 'ALTER TABLE shared_paths ADD COLUMN note TEXT' },
        { name: 'expires_at', sql: 'ALTER TABLE shared_paths ADD COLUMN expires_at DATETIME' }
    ];
    for (const col of additions) {
        if (!columns.includes(col.name)) {
            db.exec(col.sql);
            console.log(`migrate: added column ${col.name}`);
        }
    }
}

migrate();

module.exports = db;
