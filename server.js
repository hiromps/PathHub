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

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

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

// メインページ
app.get('/', (req, res) => {
    res.render('index');
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
            return res.status(404).render('not-found');
        }

        // アクセス数を増加
        const updateStmt = db.prepare('UPDATE shared_paths SET access_count = access_count + 1 WHERE id = ?');
        updateStmt.run(shareId);

        const meta = describePath(row.original_path);
        const { name, isFile, isUNC } = meta;
        const encodedPath = encodeWindowsPath(row.original_path);
        const protocolUrl = `pathhub://${encodedPath}`;

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
