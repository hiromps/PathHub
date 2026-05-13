(function () {
    'use strict';

    const toast = document.getElementById('toast');

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

    document.querySelectorAll('.copy-path-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const path = btn.dataset.path || '';
            const ok = await copyToClipboard(path);
            showToast(ok ? 'パスをコピーしました' : 'コピーに失敗しました: ' + path, ok ? 'success' : 'error');
        });
    });

    document.querySelectorAll('[data-protocol-url]').forEach(link => {
        link.addEventListener('click', () => {
            showToast('クライアントアプリを起動しています...', 'info');
        });
    });

    function attemptAutoLaunch() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('auto') !== 'true') return;
        const primary = document.querySelector('#openLink[data-protocol-url]');
        if (!primary) return;
        setTimeout(() => launchViaIframe(primary.dataset.protocolUrl), 300);
    }

    attemptAutoLaunch();
})();
