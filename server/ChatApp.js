var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var morgan = require('morgan');
var _ = require('underscore');
var path = require('path');
var io = require('socket.io');

var app = express();
//module.exports = app;
module.exports = StartChatApp;

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var users = [];
var messages = [];

var publicDirectory = path.join(__dirname, '..', '/public');
var angularAppIndex = path.join(publicDirectory, 'templates', 'index.html');
app.use(express.static(publicDirectory));
app.get('/latest', queryLatestChatInfoHandler);
app.post('/message', addMessageHandler);
app.post('/logout', logOutHandler);
app.get('/', renderIndexHandler);
app.get('*', redirectToIndex);
app.use(errorHandler);

var cleanInactiveUsersInterval = 30000; // 30 seconds
var cleanStaleMessagesInterval = 60000 * 5; // 5 minutes
setInterval(cleanInactiveUsers, cleanInactiveUsersInterval);
setInterval(cleanStaleMessages, cleanStaleMessagesInterval);

function redirectToIndex(req, res) {
    res.redirect('/');
}

function renderIndexHandler(req, res) {
    res.sendFile(angularAppIndex);
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

function queryLatestChatInfoHandler(req, res, next) {
    if (!req.query.id) {
        next('request query missing id');
        return;
    }

    var user = getUserById(req.query.id);
    if (user) {
        refreshUser(user);
        res.status(200).json({messages, users: getUsersListForClient()});
    } else {
        res.status(403).json({error:'invalid user'});
    }
}

function addUser(name) {
    var response = {};
    if (!name) {
        response.error = 'Must specify username to join!';
    } else if (!_.isString(name)) {
        response.error = 'Username must be a string!';
    } else if (name.length > 20) {
        response.error = 'Username must be less than or equal to 20 characters!';
    } else if (getUserByName(name)) {
        response.error = 'Username is already in use, yours must be unique!';
    } else {
        var userInfo = {name, id: uuid.v4(), lastActiveInMS: Date.now()};
        users.push(userInfo);
        response.id = userInfo.id;
    }
    return response
}

function populateuUsersFirstChatInfoRequest(id) {
    var response = {};
    if (!id) {
        response.error = 'Must specify username to join!';
    } else if (!_.isString(id)) {
        response.error = 'Id must be a string!';
    } else {
        var user = getUserById(id);
        if (!user) {
            response.error = 'Invalid user id!';
        } else {
            response.messages = messages;
            response.users = getUsersListForClient();
        }
    }

    return response;
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

function getUserByName(name) {
    var user;
    if (name) {
        user = _.find(users, {name});
    }
    return user;
}

function deleteUserById(id) {
    var idx = _.findIndex(users, function(user) {
                    return id == user.id;
                });
    if (idx >= 0) {
        users.splice(idx, 1);
        return true;
    } else {
        return false;
    }
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
        res.status(201).end();
    }
    else {
        res.status(403).json({error:'invalid user'});
    }
}

function logOutHandler(req, res, next) {
    if (!req.body) {
        next('request body missing');
        return;
    } else if (!req.body.id) {
        next('request body missing id');
        return;
    }

    if (deleteUserById(req.body.id)) {
        res.status(200).end();
    } else {
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

function StartChatApp(port) {
    io = io.listen(
        app.listen(port, 
            function() {
                console.log('ChatApp listening on port', port + '!');
    }));

    io.sockets.on('connection', function(socket) {
        console.log("got a connection...");

        socket.on('user-join', function(data, fn) {
            console.log('user join');
            console.log(data);
            console.log(data.name);
            var name = data && data.name;
            var response = addUser(name);
            fn(response);
        });

        socket.on('ready-for-chat-info', function(data, fn) {
            console.log('ready for chat info');
            console.log(data);
            console.log(data.id);
            var id = data && data.id;
            var response = populateuUsersFirstChatInfoRequest(id);
            console.log(response);
            fn(response);
            socket.broadcast.emit('all-users-update', {users: getUsersListForClient()});
            // evertime a user joins everyone gets update of all users
            // TODO: what about when a user quits?
        });
    });
}
