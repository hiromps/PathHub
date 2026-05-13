const express = require('express');

const router = express.Router();

const RELEASES_OWNER = process.env.GITHUB_RELEASES_OWNER || 'hiromps';
const RELEASES_REPO = process.env.GITHUB_RELEASES_REPO || 'PathHub';
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = { fetchedAt: 0, payload: null };

async function fetchLatestRelease() {
    if (cache.payload && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.payload;
    }

    const url = `https://api.github.com/repos/${RELEASES_OWNER}/${RELEASES_REPO}/releases/latest`;
    const headers = { 'User-Agent': 'PathHub-Server', 'Accept': 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(url, { headers });
    if (res.status === 404) {
        const payload = { available: false, reason: 'no-release' };
        cache = { fetchedAt: Date.now(), payload };
        return payload;
    }
    if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status}`);
    }

    const data = await res.json();
    const installerAsset = (data.assets || []).find(a => /PathHub-Setup-.*\.exe$/i.test(a.name));

    const payload = {
        available: Boolean(installerAsset),
        version: data.tag_name || null,
        publishedAt: data.published_at || null,
        downloadUrl: installerAsset ? installerAsset.browser_download_url : null,
        sizeBytes: installerAsset ? installerAsset.size : null,
        releaseUrl: data.html_url || null
    };
    cache = { fetchedAt: Date.now(), payload };
    return payload;
}

router.get('/', async (req, res) => {
    let latest = null;
    try {
        latest = await fetchLatestRelease();
    } catch (err) {
        console.error('latest release fetch failed:', err.message);
        latest = { available: false, reason: 'error' };
    }
    res.render('download', { latest });
});

router.get('/installer', async (req, res) => {
    try {
        const latest = await fetchLatestRelease();
        if (!latest.available || !latest.downloadUrl) {
            return res.status(404).render('not-found', { reason: 'missing' });
        }
        return res.redirect(302, latest.downloadUrl);
    } catch (err) {
        console.error('installer redirect failed:', err.message);
        return res.status(502).render('not-found', { reason: 'missing' });
    }
});

router.get('/latest.json', async (req, res) => {
    try {
        const latest = await fetchLatestRelease();
        res.json(latest);
    } catch (err) {
        console.error('latest.json failed:', err.message);
        res.status(502).json({ error: 'GitHub API unavailable' });
    }
});

module.exports = router;
