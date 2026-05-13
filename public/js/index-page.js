(function () {
    'use strict';

    const pathInput = document.getElementById('pathInput');
    const pathCount = document.getElementById('pathCount');
    const tagsInput = document.getElementById('tagsInput');
    const noteInput = document.getElementById('noteInput');
    const expiresInput = document.getElementById('expiresInput');
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

    const previewNote = document.getElementById('previewNote');
    const previewTags = document.getElementById('previewTags');
    const previewList = document.getElementById('previewList');
    const previewExpiry = document.getElementById('previewExpiry');

    const folderIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>';
    const fileIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>';

    function describePath(pathValue) {
        const parts = pathValue.replace(/\\/g, '/').split('/').filter(p => p);
        const name = parts.pop() || pathValue;
        const isFile = name.includes('.') && !pathValue.endsWith('/') && !pathValue.endsWith('\\');
        const isUNC = pathValue.startsWith('\\\\');
        return { name, isFile, isUNC };
    }

    function parsePaths(raw) {
        return raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }

    function updateCount() {
        const n = parsePaths(pathInput.value).length;
        pathCount.textContent = `${n} 件`;
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
        generateButton.disabled = loading;
        buttonText.classList.toggle('hidden', loading);
        buttonLoader.classList.toggle('hidden', !loading);
    }

    function renderPreview(paths, tags, note, expiresAt) {
        previewList.innerHTML = '';
        for (const p of paths) {
            const { name, isFile, isUNC } = describePath(p);
            const li = document.createElement('li');
            li.className = 'py-2 flex items-center gap-3';
            li.innerHTML = `${isFile ? fileIconSvg : folderIconSvg}
                <div class="min-w-0 flex-1">
                    <div class="font-medium truncate">${escapeHtml(name)}</div>
                    <div class="text-xs text-gray-400 font-mono break-all">${escapeHtml(p)}${isUNC ? ' 🌐' : ''}</div>
                </div>`;
            previewList.appendChild(li);
        }

        previewTags.innerHTML = '';
        for (const tag of tags) {
            const badge = document.createElement('span');
            badge.className = 'inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded';
            badge.textContent = '#' + tag;
            previewTags.appendChild(badge);
        }

        if (note) {
            previewNote.textContent = note;
            previewNote.classList.remove('hidden');
        } else {
            previewNote.classList.add('hidden');
        }

        if (expiresAt) {
            previewExpiry.textContent = `有効期限: ${expiresAt}`;
        } else {
            previewExpiry.textContent = '有効期限: 無期限';
        }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    pathInput.addEventListener('input', updateCount);
    updateCount();

    pasteButton.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            pathInput.value = pathInput.value
                ? pathInput.value.replace(/\s*$/, '') + '\n' + text
                : text;
            updateCount();
            hideError();
        } catch (err) {
            showError('クリップボードへのアクセスが許可されていません。手動でパスを入力してください。');
        }
    });

    generateButton.addEventListener('click', async () => {
        const paths = parsePaths(pathInput.value);
        if (paths.length === 0) {
            showError('パスを入力してください。');
            return;
        }

        const tagsRaw = tagsInput.value.trim();
        const note = noteInput.value.trim();
        const expiresInDays = Number(expiresInput.value);

        hideError();
        setLoading(true);

        try {
            const response = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paths, tags: tagsRaw, note, expiresInDays })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'サーバーエラーが発生しました');
            }

            sharedLink.value = data.shareUrl;
            if (paths.length === 1) {
                autoSharedLink.value = data.autoShareUrl;
                autoSharedLink.disabled = false;
                copyAutoLinkButton.disabled = false;
                copyAutoLinkButton.classList.remove('opacity-50');
            } else {
                autoSharedLink.value = '（複数パスの場合は通常リンクをお使いください）';
                autoSharedLink.disabled = true;
                copyAutoLinkButton.disabled = true;
                copyAutoLinkButton.classList.add('opacity-50');
            }

            const tagList = data.tags || [];
            renderPreview(paths, tagList, note, data.expiresAt);

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
            const ok = document.execCommand('copy');
            document.body.removeChild(textArea);
            return ok;
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
        if (copyAutoLinkButton.disabled) return;
        if (await copyToClipboard(autoSharedLink.value)) {
            flashCopyStatus('✅ 自動実行リンクをコピーしました！（推奨）');
        }
    });

    pathInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            generateButton.click();
        }
    });
})();
