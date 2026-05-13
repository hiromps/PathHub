const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const {
    validateFilePath,
    validatePaths,
    validateTags,
    validateNote,
    validateExpiresInDays,
    computeExpiresAt
} = require('../utils/validate');

const router = express.Router();

router.post('/share', (req, res) => {
    const body = req.body || {};

    let paths;
    if (Array.isArray(body.paths)) {
        const r = validatePaths(body.paths);
        if (!r.ok) return res.status(400).json({ error: r.error });
        paths = r.value;
    } else if (typeof body.filePath === 'string') {
        const r = validateFilePath(body.filePath);
        if (!r.ok) return res.status(400).json({ error: r.error });
        paths = [r.value];
    } else {
        return res.status(400).json({ error: 'ファイルパスが指定されていません' });
    }

    const tagsResult = validateTags(body.tags);
    if (!tagsResult.ok) return res.status(400).json({ error: tagsResult.error });

    const noteResult = validateNote(body.note);
    if (!noteResult.ok) return res.status(400).json({ error: noteResult.error });

    const expiresResult = validateExpiresInDays(body.expiresInDays);
    if (!expiresResult.ok) return res.status(400).json({ error: expiresResult.error });

    const shareId = nanoid(8);
    const baseUrl = `${req.protocol}://${req.get('host')}/s/${shareId}`;
    const pathsJson = JSON.stringify(paths.map(p => ({ path: p })));
    const expiresAt = computeExpiresAt(expiresResult.value);

    try {
        const stmt = db.prepare(`
            INSERT INTO shared_paths (id, original_path, paths_json, tags, note, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(shareId, paths[0], pathsJson, tagsResult.value, noteResult.value, expiresAt);

        res.json({
            shareId,
            shareUrl: baseUrl,
            autoShareUrl: `${baseUrl}?auto=true`,
            originalPath: paths[0],
            paths,
            tags: tagsResult.value ? tagsResult.value.split(',') : [],
            note: noteResult.value,
            expiresAt
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

router.get('/stats/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT access_count, created_at, expires_at FROM shared_paths WHERE id = ?');
        const row = stmt.get(req.params.id);

        if (!row) {
            return res.status(404).json({ error: 'リンクが見つかりません' });
        }

        res.json({
            accessCount: row.access_count,
            createdAt: row.created_at,
            expiresAt: row.expires_at
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

module.exports = router;
