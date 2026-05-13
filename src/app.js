const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const apiRouter = require('./routes/api');
const shareRouter = require('./routes/share');
const downloadRouter = require('./routes/download');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'リクエストが多すぎます。しばらく時間をおいてからお試しください。' }
});

const shareLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: '共有リンク生成のリクエストが多すぎます。1分後に再度お試しください。' }
});

app.use(globalLimiter);

app.get('/', (req, res) => {
    res.render('index');
});

app.use('/api/share', shareLimiter);
app.use('/api', apiRouter);
app.use('/s', shareRouter);
app.use('/download', downloadRouter);

module.exports = app;
