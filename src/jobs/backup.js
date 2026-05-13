const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const KEEP_GENERATIONS = 7;
const SCHEDULE = '0 4 * * *'; // 毎日 04:00 JST
const TZ = 'Asia/Tokyo';

function getBackupDir() {
    if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
    const dbPath = process.env.DATABASE_PATH || 'pathhub.db';
    return path.join(path.dirname(path.resolve(dbPath)), 'backups');
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function timestamp(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

function pruneOldBackups(dir) {
    const files = fs.readdirSync(dir)
        .filter(name => /^pathhub-\d{8}\.db$/.test(name))
        .map(name => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);

    const toDelete = files.slice(KEEP_GENERATIONS);
    for (const file of toDelete) {
        fs.unlinkSync(path.join(dir, file.name));
        console.log(`[backup] pruned ${file.name}`);
    }
    return toDelete.length;
}

async function runBackup() {
    const startedAt = new Date().toISOString();
    try {
        const dir = getBackupDir();
        ensureDir(dir);
        const target = path.join(dir, `pathhub-${timestamp()}.db`);
        await db.backup(target);
        const pruned = pruneOldBackups(dir);
        console.log(`[backup ${startedAt}] wrote ${target} (pruned ${pruned})`);
        return { target, pruned };
    } catch (err) {
        console.error(`[backup ${startedAt}] error:`, err.message);
        return null;
    }
}

let task = null;

function start() {
    if (task) return task;
    task = cron.schedule(SCHEDULE, runBackup, { timezone: TZ });
    console.log(`[backup] scheduled "${SCHEDULE}" (${TZ})`);
    return task;
}

function stop() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { start, stop, runBackup, getBackupDir };
