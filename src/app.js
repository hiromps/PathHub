const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

module.exports = app;
