const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');
const { nanoid } = require('nanoid');
const { describePath } = require('./src/utils/path-meta');
const { encodeWindowsPath } = require('./src/utils/path-encoder');
const { validateFilePath } = require('./src/utils/validate');

const app = express();
const PORT = process.env.PORT || 3000;

// データベースパスを環境変数で設定可能に
const DB_PATH = process.env.DATABASE_PATH || 'pathhub.db';

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// データベース初期化
const db = new Database(DB_PATH);

// テーブル作成
db.exec(`CREATE TABLE IF NOT EXISTS shared_paths (
    id TEXT PRIMARY KEY,
    original_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0
)`);

// 静的ファイル配信（メインページ）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// パス共有リンク生成API
app.post('/api/share', (req, res) => {
    const { filePath } = req.body;
    const validation = validateFilePath(filePath);

    if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
    }

    const cleanPath = validation.value;
    const shareId = nanoid(8);
    const shareUrl = `${req.protocol}://${req.get('host')}/s/${shareId}`;
    const autoShareUrl = `${req.protocol}://${req.get('host')}/s/${shareId}?auto=true`;

    try {
        const stmt = db.prepare('INSERT INTO shared_paths (id, original_path) VALUES (?, ?)');
        stmt.run(shareId, cleanPath);

        res.json({
            shareId: shareId,
            shareUrl: shareUrl,
            autoShareUrl: autoShareUrl,
            originalPath: cleanPath
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// 共有リンクアクセス用ページ
app.get('/s/:id', (req, res) => {
    const shareId = req.params.id;

    try {
        const stmt = db.prepare('SELECT * FROM shared_paths WHERE id = ?');
        const row = stmt.get(shareId);

        if (!row) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html lang="ja">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>PathHub - リンクが見つかりません</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-gray-50 flex items-center justify-center min-h-screen">
                    <div class="text-center">
                        <h1 class="text-2xl font-bold text-gray-800 mb-4">リンクが見つかりません</h1>
                        <p class="text-gray-600 mb-4">指定されたリンクは存在しないか、期限切れです。</p>
                        <a href="/" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            PathHubに戻る
                        </a>
                    </div>
                </body>
                </html>
            `);
        }

        // アクセス数を増加
        const updateStmt = db.prepare('UPDATE shared_paths SET access_count = access_count + 1 WHERE id = ?');
        updateStmt.run(shareId);

        const meta = describePath(row.original_path);
        const { name, isFile, isUNC: isUNCPath } = meta;
        const encodedPath = encodeWindowsPath(row.original_path);
        const protocolUrl = `pathhub://${encodedPath}`;
        
        // 本番環境: デバッグ情報ログを削除
        // console.log(`原始パス: ${row.original_path}`);
        // console.log(`UNCパス判定: ${isUNCPath}`);
        // console.log(`エンコードされたパス: ${encodedPath}`);
        // console.log(`プロトコルURL: ${protocolUrl}`);

        res.send(`
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PathHub - ${name}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', 'Noto Sans JP', sans-serif; }
                </style>
            </head>
            <body class="bg-gray-50 text-gray-800">
                <div class="container mx-auto p-4 md:p-8 max-w-2xl">
                    <header class="text-center mb-8">
                        <h1 class="text-3xl font-bold text-gray-800">PathHub</h1>
                        <p class="text-gray-500 mt-1">共有されたファイル</p>
                    </header>

                    <main class="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200">
                        <div class="flex items-center mb-6">
                            <div class="mr-4">
                                ${isFile ? `
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                                    </svg>
                                ` : `
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                    </svg>
                                `}
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-gray-800">${name}</h2>
                                <p class="text-gray-500 text-sm">${isFile ? 'ファイル' : 'フォルダ'}${isUNCPath ? ' (ネットワークパス)' : ''}</p>
                            </div>
                        </div>

                        <div class="bg-gray-50 p-4 rounded-lg mb-6">
                            <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">ファイルパス</label>
                            <p class="text-sm break-all mt-1 font-mono">${row.original_path}</p>
                            ${isUNCPath ? '<p class="text-xs text-blue-600 mt-1">🌐 ネットワークパス (UNC)</p>' : ''}
                        </div>

                        <div class="space-y-3">
                            <button onclick="openInExplorer()" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                                エクスプローラーで開く
                            </button>
                            
                            <button onclick="copyPath()" class="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                                </svg>
                                パスをコピー
                            </button>
                        </div>
                        
                        <div id="clientStatus" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p class="text-sm text-yellow-800">
                                <strong>📱 クライアントアプリについて:</strong><br>
                                「エクスプローラーで開く」機能を使用するには、PathHubクライアントアプリが必要です。<br>
                                <a href="/download" class="text-blue-600 hover:text-blue-800 underline">こちらからダウンロード</a>してインストールしてください。
                            </p>
                        </div>

                        <div class="mt-6 pt-6 border-t border-gray-200 text-center">
                            <a href="/" class="text-blue-600 hover:text-blue-800 font-medium">
                                新しいリンクを作成する
                            </a>
                        </div>
                    </main>
                </div>

                <script>
                    const originalPath = "${row.original_path.replace(/\\/g, '\\\\')}";
                    const protocolUrl = "${protocolUrl}";
                    const isUNCPath = ${isUNCPath};
                    
                    // 自動実行フラグ
                    let autoExecuted = false;
                    
                    // 実行管理用の変数
                    let executionAttempts = 0;
                    let executionSuccess = false;
                    let fallbackTimeouts = [];
                    
                    function openInExplorer() {
                        console.log('プロトコルURL:', protocolUrl);
                        console.log('元のパス:', originalPath);
                        
                        // エラーダイアログを回避する直接実行
                        executeProtocolHandlerSilently();
                    }
                    
                    function executeProtocolHandlerSilently() {
                        console.log('サイレントモードでプロトコルハンドラーを実行:', protocolUrl);
                        
                        // 既に成功している場合は実行しない
                        if (executionSuccess) {
                            console.log('✅ 既に実行済みのためスキップ');
                            return;
                        }
                        
                        // 進行中のタイムアウトをクリア
                        fallbackTimeouts.forEach(timeout => clearTimeout(timeout));
                        fallbackTimeouts = [];
                        
                        executionAttempts++;
                        console.log(\`実行試行回数: \${executionAttempts}\`);
                        
                        // デバッグ情報表示
                        console.log('=== デバッグ情報 ===');
                        console.log('ブラウザ:', navigator.userAgent);
                        console.log('プロトコルURL:', protocolUrl);
                        console.log('元のパス:', originalPath);
                        
                        // 複数の方法で実行を試行
                        executeMultipleMethods();
                    }
                    
                    function executeMultipleMethods() {
                        let methodIndex = 0;
                        let executionTimer = null;
                        const methods = [
                            executeViaUserClick,
                            executeViaHiddenLink,
                            executeViaIframe,
                            executeViaWindowOpen,
                            executeViaWindowLocation
                        ];
                        
                        // フィードバック表示
                        showExecutionFeedback();
                        
                        function tryNextMethod() {
                            // 既に成功している場合は停止
                            if (executionSuccess) {
                                console.log('✅ 既に実行成功済み - 他の方法をキャンセル');
                                return;
                            }
                            
                            if (methodIndex >= methods.length) {
                                console.log('❌ すべての方法が失敗しました');
                                showProtocolHandlerFailed();
                                return;
                            }
                            
                            const method = methods[methodIndex];
                            console.log(\`方法\${methodIndex + 1}を試行: \${method.name}\`);
                            
                            try {
                                method();
                                methodIndex++;
                                
                                // 成功確認のための短い待機後、次の方法を実行
                                executionTimer = setTimeout(() => {
                                    if (!executionSuccess) {
                                        tryNextMethod();
                                    } else {
                                        console.log('✅ 実行成功 - 残りの方法をスキップ');
                                    }
                                }, 800); // 間隔を短縮
                                
                            } catch (error) {
                                console.log(\`方法\${methodIndex + 1}でエラー:, error.message\`);
                                methodIndex++;
                                setTimeout(tryNextMethod, 300);
                            }
                        }
                        
                        // 成功時のクリーンアップ
                        function markExecutionSuccess(methodName) {
                            if (executionSuccess) {
                                console.log(\`⚠️ 重複実行検出: \${methodName} - 無視\`);
                                return false;
                            }
                            
                            executionSuccess = true;
                            console.log(\`✅ \${methodName}で実行成功\`);
                            
                            // タイマーをクリア
                            if (executionTimer) {
                                clearTimeout(executionTimer);
                                executionTimer = null;
                            }
                            
                            // 実行完了後のリセット処理
                            const resetTimeout = setTimeout(() => {
                                console.log('🔄 実行状態をリセット');
                                executionSuccess = false;
                                executionAttempts = 0;
                                fallbackTimeouts = [];
                            }, 8000);
                            fallbackTimeouts.push(resetTimeout);
                            
                            return true;
                        }
                        
                        // 各実行方法に成功マーキング機能を追加
                        window.markExecutionSuccess = markExecutionSuccess;
                        
                        tryNextMethod();
                    }
                    
                    // 方法1: ユーザークリック操作をシミュレート
                    function executeViaUserClick() {
                        console.log('方法1: ユーザークリック操作');
                        
                        const clickButton = document.createElement('button');
                        clickButton.textContent = 'PathHubクライアントを起動';
                        clickButton.style.position = 'fixed';
                        clickButton.style.top = '10px';
                        clickButton.style.right = '10px';
                        clickButton.style.zIndex = '10000';
                        clickButton.style.backgroundColor = '#3B82F6';
                        clickButton.style.color = 'white';
                        clickButton.style.padding = '8px 16px';
                        clickButton.style.border = 'none';
                        clickButton.style.borderRadius = '4px';
                        clickButton.style.cursor = 'pointer';
                        
                        clickButton.onclick = () => {
                            if (window.markExecutionSuccess && window.markExecutionSuccess('ユーザークリック')) {
                                console.log('ユーザークリックで実行');
                                window.location.href = protocolUrl;
                                clickButton.remove();
                            }
                        };
                        
                        document.body.appendChild(clickButton);
                        
                        // 5秒後に自動削除
                        setTimeout(() => {
                            if (clickButton.parentNode) {
                                clickButton.remove();
                            }
                        }, 5000);
                    }
                    
                    // 方法2: 隠しリンククリック
                    function executeViaHiddenLink() {
                        console.log('方法2: 隠しリンククリック');
                        
                        const link = document.createElement('a');
                        link.href = protocolUrl;
                        link.style.display = 'none';
                        link.target = '_blank';
                        
                        document.body.appendChild(link);
                        
                        // プログラム的クリック前に成功をマーク
                        if (window.markExecutionSuccess && window.markExecutionSuccess('隠しリンククリック')) {
                            link.click();
                        }
                        
                        setTimeout(() => {
                            if (link.parentNode) {
                                link.remove();
                            }
                        }, 1000);
                    }
                    
                    // 方法3: iframe実行
                    function executeViaIframe() {
                        console.log('方法3: iframe実行');
                        
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.style.width = '1px';
                        iframe.style.height = '1px';
                        iframe.style.position = 'absolute';
                        iframe.style.left = '-9999px';
                        
                        iframe.onload = () => {
                            if (window.markExecutionSuccess && window.markExecutionSuccess('iframe実行')) {
                                console.log('✅ iframe実行成功');
                            }
                        };
                        
                        iframe.onerror = () => {
                            if (window.markExecutionSuccess && window.markExecutionSuccess('iframe実行（エラー）')) {
                                console.log('⚠️ iframe実行（エラーは正常）');
                            }
                        };
                        
                        try {
                            document.body.appendChild(iframe);
                            iframe.src = protocolUrl;
                            
                            setTimeout(() => {
                                if (iframe.parentNode) {
                                    iframe.remove();
                                }
                            }, 2000);
                        } catch (error) {
                            console.log('iframe作成エラー:', error.message);
                        }
                    }
                    
                    // 方法4: window.open実行
                    function executeViaWindowOpen() {
                        console.log('方法4: window.open実行');
                        
                        try {
                            const popup = window.open(protocolUrl, '_blank');
                            if (popup) {
                                if (window.markExecutionSuccess && window.markExecutionSuccess('window.open')) {
                                    console.log('✅ window.open成功');
                                    setTimeout(() => {
                                        try {
                                            popup.close();
                                        } catch (e) {
                                            console.log('ポップアップクローズエラー（正常）');
                                        }
                                    }, 1000);
                                }
                            } else {
                                console.log('❌ window.openがブロックされました');
                            }
                        } catch (error) {
                            console.log('window.openエラー:', error.message);
                        }
                    }
                    
                    // 方法5: window.location直接実行
                    function executeViaWindowLocation() {
                        console.log('方法5: window.location直接実行');
                        
                        try {
                            if (window.markExecutionSuccess && window.markExecutionSuccess('window.location')) {
                                window.location.href = protocolUrl;
                                console.log('✅ window.location実行');
                            }
                        } catch (error) {
                            console.log('window.locationエラー:', error.message);
                        }
                    }
                    
                    // プロトコルハンドラー失敗時の対処
                    function showProtocolHandlerFailed() {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'fixed top-4 left-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md';
                        errorDiv.innerHTML = \`
                            <div class="flex items-center">
                                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>
                                    <p class="font-bold">プロトコルハンドラーが動作しません</p>
                                    <p class="text-sm">手動でパスをコピーしてご利用ください</p>
                                    <button onclick="copyPathManually()" class="mt-2 bg-red-800 hover:bg-red-900 px-3 py-1 rounded text-xs">
                                        パスをコピー
                                    </button>
                                </div>
                            </div>
                        \`;
                        
                        document.body.appendChild(errorDiv);
                        
                        setTimeout(() => {
                            if (errorDiv.parentNode) {
                                errorDiv.remove();
                            }
                        }, 10000);
                    }
                    
                    function copyPathManually() {
                        navigator.clipboard.writeText(originalPath).then(() => {
                            alert('パスをコピーしました:\\n' + originalPath + '\\n\\nエクスプローラーのアドレスバーに貼り付けてください。');
                        }).catch(() => {
                            alert('パス: ' + originalPath);
                        });
                    }

                    function showExecutionFeedback() {
                        // ボタンのフィードバック
                        const button = document.querySelector('button[onclick="openInExplorer()"]');
                        if (button) {
                            const originalText = button.innerHTML;
                            button.innerHTML = '<div class="flex items-center justify-center"><div class="loading-spinner mr-2"></div>実行中...</div>';
                            button.disabled = true;
                            button.classList.add('bg-green-600');
                            button.classList.remove('bg-blue-600');
                            
                            setTimeout(() => {
                                button.innerHTML = '✅ 実行しました';
                                setTimeout(() => {
                                    button.innerHTML = originalText;
                                    button.disabled = false;
                                    button.classList.remove('bg-green-600');
                                    button.classList.add('bg-blue-600');
                                }, 3000);
                            }, 1500);
                        }
                        
                        // 通知表示
                        showNotification();
                    }
                    
                    function showNotification() {
                        const notification = document.createElement('div');
                        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md';
                        notification.innerHTML = \`
                            <div class="flex items-center">
                                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>
                                    <p class="font-bold">PathHub クライアントを実行中</p>
                                    <p class="text-sm">エクスプローラーが開くまでお待ちください...</p>
                                </div>
                            </div>
                        \`;
                        
                        document.body.appendChild(notification);
                        
                        setTimeout(() => {
                            notification.remove();
                        }, 5000);
                    }
                    
                    function copyPath() {
                        console.log('パスをコピー中:', originalPath);
                        
                        navigator.clipboard.writeText(originalPath).then(() => {
                            console.log('✅ パスのコピーが成功しました');
                            
                            try {
                                // 成功フィードバック
                                const button = event?.target?.closest('button') || document.querySelector('button[onclick="copyPath()"]');
                                if (button) {
                                    const originalText = button.innerHTML;
                                    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 inline" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>コピーしました！';
                                    button.classList.add('bg-green-600');
                                    button.classList.remove('bg-gray-600');
                                    
                                    setTimeout(() => {
                                        button.innerHTML = originalText;
                                        button.classList.remove('bg-green-600');
                                        button.classList.add('bg-gray-600');
                                    }, 2000);
                                }
                                
                                // 成功通知を表示
                                showCopySuccessNotification();
                                
                            } catch (uiError) {
                                console.log('UI更新エラー（コピー自体は成功）:', uiError.message);
                                // UI更新エラーでも成功通知は表示
                                showCopySuccessNotification();
                            }
                            
                        }).catch(err => {
                            console.error('パスのコピーに失敗:', err);
                            // フォールバック: 古いブラウザ対応
                            try {
                                const textArea = document.createElement('textarea');
                                textArea.value = originalPath;
                                document.body.appendChild(textArea);
                                textArea.select();
                                const success = document.execCommand('copy');
                                document.body.removeChild(textArea);
                                
                                if (success) {
                                    console.log('✅ フォールバック方式でコピー成功');
                                    showCopySuccessNotification();
                                } else {
                                    throw new Error('フォールバック方式も失敗');
                                }
                            } catch (fallbackError) {
                                console.error('フォールバック方式も失敗:', fallbackError);
                                alert('パスをコピーできませんでした。手動でコピーしてください:\\n' + originalPath);
                            }
                        });
                    }
                    
                    function showCopySuccessNotification() {
                        const notification = document.createElement('div');
                        notification.className = 'fixed top-4 left-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md';
                        notification.innerHTML = \`
                            <div class="flex items-center">
                                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>
                                    <p class="font-bold">パスをコピーしました！</p>
                                    <p class="text-sm">エクスプローラーのアドレスバーに貼り付けてください</p>
                                </div>
                            </div>
                        \`;
                        
                        document.body.appendChild(notification);
                        
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.remove();
                            }
                        }, 4000);
                    }

                    // クライアントアプリの状態を確認
                    function checkClientApp() {
                        console.log('=== PathHub 基本情報 ===');
                        console.log('クライアントアプリの検出を行っています...');
                        console.log('デバッグ情報:');
                        console.log('- 元のパス:', originalPath);
                        console.log('- UNCパス判定:', isUNCPath);
                        console.log('- プロトコルURL:', protocolUrl);
                        
                        // エラーハンドリングを強化
                        try {
                            console.log('- ブラウザ:', navigator.userAgent);
                        } catch (e) {
                            console.log('- ブラウザ情報取得エラー:', e.message);
                        }
                    }

                    // 自動実行機能
                    function attemptAutoExecution() {
                        // URL パラメータで自動実行が要求されている場合
                        const urlParams = new URLSearchParams(window.location.search);
                        const autoOpen = urlParams.get('auto') === 'true';
                        
                        if (autoOpen && !autoExecuted) {
                            autoExecuted = true;
                            console.log('🚀 自動実行モード: エクスプローラーを自動で開きます');
                            
                            // 少し遅延して実行（ページ読み込み完了後）
                            setTimeout(() => {
                                // 自動実行でも重複チェック
                                if (!executionSuccess && executionAttempts === 0) {
                                    executeProtocolHandlerSilently();
                                } else {
                                    console.log('⚠️ 自動実行スキップ: 既に実行中または完了済み');
                                }
                            }, 1000);
                        }
                    }

                    // ページ読み込み時にクライアントアプリの状態を確認
                    window.addEventListener('load', function() {
                        checkClientApp();
                        attemptAutoExecution();
                    });
                    
                    // CSS for loading spinner
                    const style = document.createElement('style');
                    style.textContent = \`
                        .loading-spinner {
                            width: 16px;
                            height: 16px;
                            border: 2px solid #ffffff40;
                            border-top: 2px solid #ffffff;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    \`;
                    document.head.appendChild(style);
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// 統計情報API
app.get('/api/stats/:id', (req, res) => {
    const shareId = req.params.id;

    try {
        const stmt = db.prepare('SELECT access_count, created_at FROM shared_paths WHERE id = ?');
        const row = stmt.get(shareId);

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

// クライアントアプリダウンロードページ
app.get('/download', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>PathHub - クライアントアプリ</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', 'Noto Sans JP', sans-serif; }
            </style>
        </head>
        <body class="bg-gray-50 text-gray-800">
            <div class="container mx-auto p-4 md:p-8 max-w-4xl">
                <header class="text-center mb-10">
                    <h1 class="text-4xl font-bold text-gray-800">PathHub クライアントアプリ</h1>
                    <p class="text-gray-500 mt-2">エクスプローラーで直接ファイルを開く</p>
                </header>

                <main class="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div class="text-center mb-8">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6.42 2.502 2.502 0 0116 6a2.5 2.5 0 012.5 2.5v.5h.5A2.5 2.5 0 0021.5 11a2.5 2.5 0 01-2.5 2.5h-5a2.5 2.5 0 01-2.5-2.5H7" />
                        </svg>
                        <h2 class="text-2xl font-bold mt-4">インストール手順</h2>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <h3 class="font-bold text-lg mb-3">📦 1. Node.jsをインストール</h3>
                            <p class="text-gray-700 mb-3">PathHubクライアントアプリを実行するには、Node.jsが必要です。</p>
                            <a href="https://nodejs.org/" target="_blank" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block">
                                Node.jsをダウンロード
                            </a>
                        </div>

                        <div class="bg-green-50 p-6 rounded-lg border border-green-200">
                            <h3 class="font-bold text-lg mb-3">⚡ 2. クライアントアプリをセットアップ</h3>
                            <p class="text-gray-700 mb-3">以下のコマンドをPowerShellまたはコマンドプロンプトで実行してください：</p>
                            <div class="bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm">
                                <div class="mb-2"># PathHubプロジェクトフォルダに移動</div>
                                <div class="mb-2">cd PathHub\\client-app</div>
                                <div class="mb-2"># 依存関係をインストール</div>
                                <div class="mb-2">npm install</div>
                                <div class="mb-2"># プロトコルハンドラーを登録</div>
                                <div>npm run install-protocol</div>
                            </div>
                        </div>

                        <div class="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                            <h3 class="font-bold text-lg mb-3">🧪 3. テスト</h3>
                            <p class="text-gray-700 mb-3">ブラウザのアドレスバーに以下を入力してテストしてください：</p>
                            <div class="bg-gray-100 p-3 rounded-lg font-mono text-sm">
                                pathhub://C:\\Users
                            </div>
                            <p class="text-gray-600 text-sm mt-2">エクスプローラーでUsersフォルダが開けば成功です！</p>
                        </div>

                        <div class="bg-red-50 p-6 rounded-lg border border-red-200">
                            <h3 class="font-bold text-lg mb-3">🔧 トラブルシューティング</h3>
                            <ul class="space-y-2 text-gray-700">
                                <li>• Windows Defenderやウイルス対策ソフトが実行をブロックする場合があります</li>
                                <li>• 管理者権限でコマンドプロンプトを実行してみてください</li>
                                <li>• ブラウザを再起動してからテストしてください</li>
                            </ul>
                        </div>
                    </div>

                    <div class="mt-8 text-center">
                        <a href="/" class="text-blue-600 hover:text-blue-800 font-medium">
                            PathHubに戻る
                        </a>
                    </div>
                </main>
            </div>
        </body>
        </html>
    `);
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`PathHub サーバーが起動しました: http://localhost:${PORT}`);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
    console.log('\nサーバーを終了しています...');
    try {
        db.close();
        console.log('データベース接続を閉じました。');
        process.exit(0);
    } catch (err) {
        console.error('データベース終了エラー:', err.message);
        process.exit(1);
    }
}); 