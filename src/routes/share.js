const express = require('express');
const db = require('../db');
const { describePath } = require('../utils/path-meta');
const { encodeWindowsPath } = require('../utils/path-encoder');

const router = express.Router();

router.get('/:id', (req, res) => {
    const shareId = req.params.id;

    try {
        const stmt = db.prepare('SELECT * FROM shared_paths WHERE id = ?');
        const row = stmt.get(shareId);

        if (!row) {
            return res.status(404).render('not-found');
        }

        const updateStmt = db.prepare('UPDATE shared_paths SET access_count = access_count + 1 WHERE id = ?');
        updateStmt.run(shareId);

        const { name, isFile, isUNC } = describePath(row.original_path);
        const protocolUrl = `pathhub://${encodeWindowsPath(row.original_path)}`;

        return res.render('share', {
            name,
            isFile,
            isUNC,
            originalPath: row.original_path,
            protocolUrl
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

module.exports = router;
