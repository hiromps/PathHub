const express = require('express');
const db = require('../db');
const { describePath } = require('../utils/path-meta');
const { encodeWindowsPath } = require('../utils/path-encoder');

const router = express.Router();

function parsePathsJson(row) {
    if (!row.paths_json) {
        return [{ path: row.original_path }];
    }
    try {
        const parsed = JSON.parse(row.paths_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
    } catch (err) {
        console.error('paths_json parse error for id=' + row.id, err);
    }
    return [{ path: row.original_path }];
}

function isExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt + 'Z').getTime() < Date.now();
}

router.get('/:id', (req, res) => {
    const shareId = req.params.id;

    try {
        const stmt = db.prepare('SELECT * FROM shared_paths WHERE id = ?');
        const row = stmt.get(shareId);

        if (!row) {
            return res.status(404).render('not-found', { reason: 'missing' });
        }

        if (isExpired(row.expires_at)) {
            return res.status(410).render('not-found', { reason: 'expired' });
        }

        const updateStmt = db.prepare('UPDATE shared_paths SET access_count = access_count + 1 WHERE id = ?');
        updateStmt.run(shareId);

        const entries = parsePathsJson(row).map(entry => {
            const { name, isFile, isUNC } = describePath(entry.path);
            return {
                path: entry.path,
                label: entry.label || null,
                name,
                isFile,
                isUNC,
                protocolUrl: `pathhub://${encodeWindowsPath(entry.path)}`
            };
        });

        const primary = entries[0];
        const tags = row.tags ? row.tags.split(',').filter(Boolean) : [];

        return res.render('share', {
            entries,
            primary,
            isMulti: entries.length > 1,
            tags,
            note: row.note || '',
            expiresAt: row.expires_at,
            shareId
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

module.exports = router;
