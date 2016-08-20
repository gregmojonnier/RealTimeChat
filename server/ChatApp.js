var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var morgan = require('morgan');
var _ = require('underscore');
var path = require('path');
var io = require('socket.io');

var app = express();
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
app.get('/', renderIndexHandler);
app.get('*', redirectToIndex);
app.use(errorHandler);

var cleanStaleMessagesInterval = 60000 * 5; // 5 minutes of history
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

function addNewMessage(id, message) {
    var newMessage;
    if (!id || !_.isString(id)) {
        console.log('Id must be a valid string to add a new message!');
    } else if (!message || !_.isString(message)) {
        console.log('Message must be a valid string to add a new message!');
    } else {
        var user = getUserById(id);
        if (user) {
            newMessage = {name: user.name, message, time: Date()};
            messages.push(newMessage);
        }
    }
    return newMessage;
}

function logUserOut(id) {
    if (!id || !_.isString(id)) {
        console.log('id must be a valid string to log a user out!');
        return false;
    }

    return deleteUserById(id);
}

function errorHandler(err, req, res, next) {
    console.log(err);
    res.status(400).end();
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
        socket.on('user-join', function(data, fn) {
            var name = data && data.name;
            var response = addUser(name);
            fn(response);
            socket.broadcast.emit('all-users-update', {users: getUsersListForClient()});
        });
        socket.on('logout', function(data) {
            var id = data && data.id;
            if (logUserOut(id)) {
                socket.broadcast.emit('all-users-update', {users: getUsersListForClient()});
            }
        });

        socket.on('ready-for-chat-info', function(data, fn) {
            var id = data && data.id;
            var response = populateuUsersFirstChatInfoRequest(id);
            fn(response);
        });

        socket.on('new-message', function(data) {
            var id = data && data.id;
            var message = data && data.message;

            var addedMessage = addNewMessage(id, message)
            if (addedMessage) {
                io.emit('new-message', addedMessage);
            }
        });
    });
}
