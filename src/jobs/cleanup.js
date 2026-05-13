const cron = require('node-cron');
const db = require('../db');

const STALE_DAYS = 30;
const SCHEDULE = '0 3 * * *'; // 毎日 03:00 JST
const TZ = 'Asia/Tokyo';

function runCleanup() {
    const startedAt = new Date().toISOString();
    try {
        const stmt = db.prepare(`
            DELETE FROM shared_paths
            WHERE (expires_at IS NOT NULL AND expires_at < datetime('now'))
               OR (access_count = 0 AND created_at < datetime('now', ?))
        `);
        const info = stmt.run(`-${STALE_DAYS} days`);
        console.log(`[cleanup ${startedAt}] deleted ${info.changes} rows`);
        return info.changes;
    } catch (err) {
        console.error(`[cleanup ${startedAt}] error:`, err.message);
        return 0;
    }
}

let task = null;

function start() {
    if (task) return task;
    task = cron.schedule(SCHEDULE, runCleanup, { timezone: TZ });
    console.log(`[cleanup] scheduled "${SCHEDULE}" (${TZ})`);
    return task;
}

function stop() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { start, stop, runCleanup };
