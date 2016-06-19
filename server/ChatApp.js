var express = require('express');
var app = express();

module.exports = app;

app.get('/users', function(req, res) {
    res.status(200).json({'users':[]});
});
