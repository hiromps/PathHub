(function () {
    'use strict';

    const openLink = document.getElementById('openLink');
    const copyButton = document.getElementById('copyButton');
    const originalPathText = document.getElementById('originalPathText');
    const toast = document.getElementById('toast');

    const protocolUrl = openLink ? openLink.dataset.protocolUrl : '';
    const originalPath = originalPathText ? originalPathText.textContent : '';

    function showToast(message, variant) {
        if (!toast) return;
        const color = variant === 'success' ? 'bg-green-600'
            : variant === 'error' ? 'bg-red-600'
            : 'bg-blue-600';
        toast.className = `fixed top-4 right-4 ${color} text-white p-4 rounded-lg shadow-lg z-50 max-w-md`;
        toast.textContent = message;
        setTimeout(() => { toast.classList.add('hidden'); }, 4000);
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

    if (copyButton) {
        copyButton.addEventListener('click', async () => {
            const success = await copyToClipboard(originalPath);
            if (success) {
                showToast('パスをコピーしました', 'success');
            } else {
                showToast('コピーに失敗しました: ' + originalPath, 'error');
            }
        });
    }

    if (openLink) {
        openLink.addEventListener('click', () => {
            showToast('クライアントアプリを起動しています...', 'info');
        });
    }

    function attemptAutoLaunch() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('auto') !== 'true' || !protocolUrl) return;
        setTimeout(() => launchViaIframe(protocolUrl), 300);
    }

    attemptAutoLaunch();
})();
