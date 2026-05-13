const app = require('./src/app');
const db = require('./src/db');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`PathHub サーバーが起動しました: http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nサーバーを終了しています...');
    server.close(() => {
        try {
            db.close();
            console.log('データベース接続を閉じました。');
            process.exit(0);
        } catch (err) {
            console.error('データベース終了エラー:', err.message);
            process.exit(1);
        }
    });
});
