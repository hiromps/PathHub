const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { validateFilePath } = require('../utils/validate');

const router = express.Router();

router.post('/share', (req, res) => {
    const { filePath } = req.body;
    const validation = validateFilePath(filePath);

    if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
    }

    const cleanPath = validation.value;
    const shareId = nanoid(8);
    const baseUrl = `${req.protocol}://${req.get('host')}/s/${shareId}`;

    try {
        const stmt = db.prepare('INSERT INTO shared_paths (id, original_path) VALUES (?, ?)');
        stmt.run(shareId, cleanPath);

        res.json({
            shareId,
            shareUrl: baseUrl,
            autoShareUrl: `${baseUrl}?auto=true`,
            originalPath: cleanPath
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

router.get('/stats/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT access_count, created_at FROM shared_paths WHERE id = ?');
        const row = stmt.get(req.params.id);

        if (!row) {
            return res.status(404).json({ error: 'リンクが見つかりません' });
        }

        res.json({
            accessCount: row.access_count,
            createdAt: row.created_at
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

module.exports = router;
