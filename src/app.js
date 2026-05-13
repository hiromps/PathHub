const express = require('express');
const path = require('path');
const cors = require('cors');

const apiRouter = require('./routes/api');
const shareRouter = require('./routes/share');
const downloadRouter = require('./routes/download');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.use('/api', apiRouter);
app.use('/s', shareRouter);
app.use('/download', downloadRouter);

module.exports = app;
