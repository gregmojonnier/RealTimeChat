var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var morgan = require('morgan');
var _ = require('underscore');

module.exports = createApp;

function createApp() {
    var app = express();
    if (process.env.NODE_ENV !== 'test') {
        app.use(morgan('dev'));
    }
    app.use(bodyParser.json());

    var users = [];
    var messages = [];

    app.get('/users', queryUsersHandler);
    app.get('/messages', queryMessagesHandler);
    app.post('/user', addUserHandler);
    app.post('/message', addMessage);
    app.use(errorHandler);

    function queryUsersHandler(req, res) {
        res.status(200).json({users});
    }

    function queryMessagesHandler(req, res) {
        res.status(200).json({messages});
    }

    function addUserHandler(req, res, next) {
        if (!req.body || !req.body.name) {
            next('body did not contain a valid name');
            return;
        }
        var userInfo = {'name':req.body.name};
        var uniqueName = !_.find(users, userInfo);

        if (uniqueName) {
            userInfo.id = uuid.v4();
            users.push(userInfo);
            res.status(201).json(userInfo);
        }
        else {
            res.status(409).json({error:'duplicate user'});
        }
    }

    function addMessage(req, res, next) {
        if (!req.body) {
            next('request body missing');
            return;
        } else if (!req.body.id) {
            next('request body missing id');
            return;
        } else if (!req.body.message) {
            next('request body missing message');
            return;
        }
        if (_.find(users, {id:req.body.id})) {
            messages.push({id:req.body.id, message:req.body.message});
            res.status(201).end();
        }
        else {
            res.status(403).json({error:'invalid user'});
        }
    }

    function errorHandler(err, req, res, next) {
        console.log(err);
        res.status(400).end();
    }

    return app;
}
