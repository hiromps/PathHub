const app = require('./src/app');
const db = require('./src/db');
const cleanup = require('./src/jobs/cleanup');
const backup = require('./src/jobs/backup');

const PORT = process.env.PORT || 3000;

cleanup.start();
backup.start();

const server = app.listen(PORT, () => {
    console.log(`PathHub サーバーが起動しました: http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nサーバーを終了しています...');
    cleanup.stop();
    backup.stop();
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
