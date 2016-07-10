var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var morgan = require('morgan');
var _ = require('underscore');

var app = express();
module.exports = app;

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug');

var users = [];
var messages = [];

app.get('/', renderIndexHandler);
app.get('/active-users', renderActiveUsersHandler);
app.get('/chat', renderChatHandler);
app.get('/users', queryUsersHandler);
app.get('/messages', queryMessagesHandler);
app.post('/user', addUserHandler);
app.put('/user', refreshUserHandler);
app.post('/message', addMessageHandler);
app.use(errorHandler);

var cleanInactiveUsersInterval = 30000; // 30 seconds
var cleanStaleMessagesInterval = 60000 * 5; // 5 minutes
setInterval(cleanInactiveUsers, cleanInactiveUsersInterval);
setInterval(cleanStaleMessages, cleanStaleMessagesInterval);

function renderIndexHandler(req, res) {
    res.render('index', {});
}

function renderActiveUsersHandler(req, res) {
    res.render('active-users', {users});
}

function renderChatHandler(req, res) {
    var usersForClient = getUsersListForClient();
    res.render('chat', {messages, users:usersForClient});
}

function queryUsersHandler(req, res) {
    var usersForClient = getUsersListForClient();
    res.status(200).json({users:usersForClient});
}

function getUsersListForClient() {
    var usersForClient = [];
    // client side should only know its own id
    // and we'll calculate each user's last active time
    _.each(users, function(user) {
        var cleanedUser = _.omit(user, 'id');
        cleanedUser.lastActiveInMS = Date.now() - cleanedUser.lastActiveInMS;
        usersForClient.push(cleanedUser);
    });
    return usersForClient;
}

function queryMessagesHandler(req, res) {
    res.status(200).json({messages});
}

function addUserHandler(req, res, next) {
    if (!req.body || !req.body.name) {
        next('body did not contain a valid name');
        return;
    }
    var userInfo = {name: req.body.name, id: uuid.v4(), lastActiveInMS: Date.now()};
    users.push(userInfo);
    res.status(201).json(userInfo);
}

function refreshUserHandler(req, res, next) {
    if (!req.body || !req.body.id) {
        next('body did not contain an id');
        return;
    }

    if (refreshUser(getUserById(req.body.id))) {
        res.status(200).end();
        return;
    }
    else {
        res.status(400).json({error:'invalid user'});
    }
}

function refreshUser(user) {
    if (user) {
        user.lastActiveInMS = Date.now();
        return true;
    }
    return false;
}

function getUserById(id) {
    var user;
    if (id) {
        user = _.find(users, {id});
    }
    return user;
}

function addMessageHandler(req, res, next) {
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
    var user = getUserById(req.body.id);
    if (user) {
        messages.push({name: user.name, message: req.body.message, time: Date()});
        refreshUser(user);
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

function cleanInactiveUsers() {
    users = _.filter(users, function(user) {
        var lastActiveInMS = Date.now() - user.lastActiveInMS;
        return lastActiveInMS < cleanInactiveUsersInterval;
    });
}

function cleanStaleMessages() {
    var currentTime = new Date().getTime();
    messages = _.filter(messages, function(message) {
        var messageAgeInMS = currentTime - new Date(message.time).getTime();
        return messageAgeInMS < cleanStaleMessagesInterval;
    });
}
