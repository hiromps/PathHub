(function () {
    'use strict';

    const STORAGE_KEY = 'pathhub.clientDetected';
    const DETECT_TIMEOUT_MS = 3000;

    const toast = document.getElementById('toast');
    const clientMissingPanel = document.getElementById('clientMissingPanel');
    const clientHint = document.getElementById('clientHint');
    const retryBtn = document.getElementById('retryLaunchBtn');
    const dismissBtn = document.getElementById('dismissMissingBtn');

    let detectTimer = null;
    let lastLaunchedAt = 0;
    let lastLaunchedUrl = '';

    function showToast(message, variant) {
        if (!toast) return;
        const color = variant === 'success' ? 'bg-green-600'
            : variant === 'error' ? 'bg-red-600'
            : 'bg-blue-600';
        toast.className = `fixed top-4 right-4 ${color} text-white p-4 rounded-lg shadow-lg z-50 max-w-md`;
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => { toast.classList.add('hidden'); }, 4000);
    }

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textArea);
            return ok;
        }
    }

    function launchViaIframe(url) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 2000);
    }

    function markClientDetected() {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
    }

    function wasClientDetected() {
        try { return localStorage.getItem(STORAGE_KEY) === '1'; }
        catch (e) { return false; }
    }

    function showMissingPanel() {
        if (clientMissingPanel) clientMissingPanel.classList.remove('hidden');
    }

    function hideMissingPanel() {
        if (clientMissingPanel) clientMissingPanel.classList.add('hidden');
    }

    function onWindowBlurred() {
        if (Date.now() - lastLaunchedAt > DETECT_TIMEOUT_MS) return;
        // ブラウザの protocol confirm ダイアログまたはクライアント起動による blur と推測
        markClientDetected();
        if (clientHint) clientHint.classList.add('hidden');
        if (detectTimer) {
            clearTimeout(detectTimer);
            detectTimer = null;
        }
    }

    window.addEventListener('blur', onWindowBlurred);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) onWindowBlurred();
    });

    function registerLaunchDetection(url) {
        lastLaunchedAt = Date.now();
        lastLaunchedUrl = url;
        if (detectTimer) clearTimeout(detectTimer);
        if (wasClientDetected()) return;
        detectTimer = setTimeout(() => {
            if (!wasClientDetected()) showMissingPanel();
        }, DETECT_TIMEOUT_MS);
    }

    document.querySelectorAll('.copy-path-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const path = btn.dataset.path || '';
            const ok = await copyToClipboard(path);
            showToast(ok ? 'パスをコピーしました' : 'コピーに失敗しました: ' + path, ok ? 'success' : 'error');
        });
    });

    document.querySelectorAll('[data-protocol-url]').forEach(link => {
        link.addEventListener('click', () => {
            hideMissingPanel();
            registerLaunchDetection(link.dataset.protocolUrl);
            showToast('クライアントアプリを起動しています...', 'info');
        });
    });

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            hideMissingPanel();
            if (lastLaunchedUrl) {
                registerLaunchDetection(lastLaunchedUrl);
                launchViaIframe(lastLaunchedUrl);
                return;
            }
            const primary = document.querySelector('#openLink[data-protocol-url]');
            if (primary) {
                registerLaunchDetection(primary.dataset.protocolUrl);
                primary.click();
            }
        });
    }

    if (dismissBtn) {
        dismissBtn.addEventListener('click', hideMissingPanel);
    }

    function attemptAutoLaunch() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('auto') !== 'true') return;
        const primary = document.querySelector('#openLink[data-protocol-url]');
        if (!primary) return;
        setTimeout(() => {
            registerLaunchDetection(primary.dataset.protocolUrl);
            launchViaIframe(primary.dataset.protocolUrl);
        }, 300);
    }

    attemptAutoLaunch();
})();
