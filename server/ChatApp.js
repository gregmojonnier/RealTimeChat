var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var morgan = require('morgan');
var app = express();

module.exports = app;

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}
app.use(bodyParser.json());

var users = [];

app.get('/users', queryUsersHandler);
app.post('/user', addUserHandler);
app.use(errorHandler);

function queryUsersHandler(req, res) {
    res.status(200).json({'users':users});
}

function addUserHandler(req, res, next) {
    if (!req.body || !req.body.name) {
        next('body did not contain a valid name');
        return;
    }
    var userInfo = {'name':req.body.name, 'id':uuid.v4()};
    users.push(userInfo);
    res.status(201).json(userInfo);
}

function errorHandler(err, req, res, next) {
    //console.log(err);
    res.status(400).end();
}
