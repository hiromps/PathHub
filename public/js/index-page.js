(function () {
    'use strict';

    const pathInput = document.getElementById('pathInput');
    const pasteButton = document.getElementById('pasteButton');
    const generateButton = document.getElementById('generateButton');
    const buttonText = document.getElementById('buttonText');
    const buttonLoader = document.getElementById('buttonLoader');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const errorMessage = document.getElementById('errorMessage');

    const sharedLink = document.getElementById('sharedLink');
    const copyLinkButton = document.getElementById('copyLinkButton');
    const autoSharedLink = document.getElementById('autoSharedLink');
    const copyAutoLinkButton = document.getElementById('copyAutoLinkButton');
    const copyStatus = document.getElementById('copyStatus');

    const fileIcon = document.getElementById('fileIcon');
    const fileName = document.getElementById('fileName');
    const fullPath = document.getElementById('fullPath');
    const previewOpenLink = document.getElementById('previewOpenLink');

    const folderIconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>`;

    const fileIconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
        </svg>`;

    function encodeWindowsPath(originalPath) {
        const isUNC = originalPath.startsWith('\\\\');
        const segments = originalPath.split('\\').map(part =>
            part === '' ? part : encodeURIComponent(part)
        );
        let encoded = segments.join('%5C');
        if (!isUNC && (encoded.endsWith('%2F') || encoded.endsWith('/'))) {
            encoded = encoded.replace(/(%2F|\/)$/, '');
        }
        return encoded;
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorArea.classList.remove('hidden');
        resultArea.classList.add('hidden');
    }

    function hideError() {
        errorArea.classList.add('hidden');
    }

    function setLoading(loading) {
        if (loading) {
            generateButton.disabled = true;
            buttonText.classList.add('hidden');
            buttonLoader.classList.remove('hidden');
        } else {
            generateButton.disabled = false;
            buttonText.classList.remove('hidden');
            buttonLoader.classList.add('hidden');
        }
    }

    function describePath(pathValue) {
        const parts = pathValue.replace(/\\/g, '/').split('/').filter(p => p);
        const name = parts.pop() || pathValue;
        const isFile = name.includes('.') && !pathValue.endsWith('/') && !pathValue.endsWith('\\');
        return { name, isFile };
    }

    pasteButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            pathInput.value = text;
            hideError();
        } catch (err) {
            console.error('クリップボードの読み取りに失敗しました:', err);
            showError('クリップボードへのアクセスが許可されていません。手動でパスを入力してください。');
        }
    });

    generateButton.addEventListener('click', async () => {
        const pathValue = pathInput.value.trim();
        if (!pathValue) {
            showError('パスを入力してください。');
            return;
        }

        hideError();
        setLoading(true);

        try {
            const response = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: pathValue })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'サーバーエラーが発生しました');
            }

            sharedLink.value = data.shareUrl;
            autoSharedLink.value = data.autoShareUrl;

            const { name, isFile } = describePath(pathValue);
            fileName.textContent = name;
            fullPath.textContent = pathValue;
            fileIcon.innerHTML = isFile ? fileIconSvg : folderIconSvg;

            previewOpenLink.href = `pathhub://${encodeWindowsPath(pathValue)}`;

            resultArea.classList.remove('hidden');
            copyStatus.textContent = '';
        } catch (error) {
            console.error('リンク生成エラー:', error);
            showError(error.message || 'リンクの生成に失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    });

    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    }

    function flashCopyStatus(message) {
        copyStatus.textContent = message;
        setTimeout(() => { copyStatus.textContent = ''; }, 2000);
    }

    copyLinkButton.addEventListener('click', async () => {
        if (await copyToClipboard(sharedLink.value)) {
            flashCopyStatus('通常リンクをコピーしました！');
        }
    });

    copyAutoLinkButton.addEventListener('click', async () => {
        if (await copyToClipboard(autoSharedLink.value)) {
            flashCopyStatus('✅ 自動実行リンクをコピーしました！（推奨）');
        }
    });

    pathInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateButton.click();
        }
    });
})();
