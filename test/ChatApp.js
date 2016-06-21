var test = require('blue-tape');
var sinon = require('sinon');
var request = require('supertest-as-promised');
var isValidUuid = require('uuid-validate');
var _ = require('underscore');
var reload = require('require-reload')(require);

test('POST /user - a name is all that\'s needed to add a user', function(t) {
    var req = freshChatAppRequest();
    return req
        .post('/user')
        .send({'name':'foobar'})
        .expect(201)
        .then(function(res) {
            var body = res.body;
            t.ok(body.name, 'response has a name key');
            t.ok(body.id, 'response has an id key');
            t.isEqual(body.name, 'foobar', 'response name matches what we sent');
            t.true(isValidUuid(body.id), 'response id is a valid uuid');
        })
        .then(function(res) {
            return req.get('/users');
        })
        .then(function(res) {
            console.log('Added user can then be queried with GET /users');
            var body = res.body;
            t.ok(body.users, 'response has a users key');
            t.true(_.find(body.users, {'name':'foobar'}), 'found name in users array');
        });
});

test('GET /users - querying all users information', function(t) {
    var req = freshChatAppRequest();
    return req
        .get('/users')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(function(res) {
            var body = res.body;
            t.ok(body.users, 'response has users key');
            t.ok(_.isArray(body.users), 'users is an array');
            t.isEqual(body.users.length, 0, 'starts with 0 users');
        })
        .then(function() {
            return addUserToChat({'name':'foobar'}, req);
        })
        .then(function() {
            return req.get('/users');
        })
        .then(function(res) {
            var body = res.body;
            t.isEqual(body.users.length, 1, 'adding a user results in the users array growing by 1');
            var user = body.users[0];
            t.ok(_.isObject(user), 'each user in the array is an object');
            t.ok(user.name, 'user has a name key');
            t.ok(user.lastActiveInMS, 'user has a lastActiveInMS key');
        });
});

test('POST /message - can be used to add a message', function(t) {
    var userInfo = {'name':'foobar'};
    var message = 'hello world';
    var id; // assigned by server

    var req = freshChatAppRequest();
    return addUserToChat(userInfo, req)
            .then(function() {
                id = userInfo.id;
                return req.post('/message')
                        .send({id, message})
                        .expect(201)
                        .expect(function() {
                            t.pass('a valid user id can add a message');
                        });
            })
            .then(function() {
                return req.get('/messages');
            })
            .then(function(res) {
                t.ok(_.find(res.body.messages, {name: userInfo.name, message}), 'GET /messages contains the message we just added');
            })
            .then(function() {
                return req
                        .post('/message')
                        .send({'id':'a_bad_id', 'message':'hello world'})
                        .expect(403)
            })
            .then(function(res) {
                console.log('Trying to add a message for a user id that doesn\'t exist fails');
                var body = res.body;
                t.ok(body.error, 'response has an error key');
                t.isEqual(body.error, 'invalid user', 'error cites invalid user');
            });
});

test('GET /messages - can be used to query messages', function(t) {
    var userInfo = {'name':'foobar'};
    var req = freshChatAppRequest();
    return req
            .get('/messages')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect({messages: []})
            .then(function(res) {
                var messages = res.body.messages;
                t.ok(messages, 'response has a messages key');
                t.ok(_.isArray(messages), 'messages is an array');
                t.isEqual(messages.length, 0, 'starts with 0 messages');
            })
            .then(function() {
                return addUserToChat(userInfo, req);
            })
            .then(function() {
                return addMessageForId(userInfo.id, 'hello world', req);
            })
            .then(function() {
                return req.get('/messages');
            })
            .then(function(res) {
                t.isEqual(res.body.messages.length, 1, 'adding a message results in the messages array growing by 1');
                var message = res.body.messages[0];
                t.ok(message.name, 'each message has a\nname');
                t.ok(message.message, 'each message has a message');
                t.ok(message.time, 'each message has a time');
            });
});

test('User expiration', function(t) {
    var userInfo = {'name': 'foobar'};
    var clock = sinon.useFakeTimers();

    var req = freshChatAppRequest();
    return addUserToChat(userInfo, req)
            .then(function() {
                return req.get('/users');
            })
            .then(function(res) {
                t.isEqual(res.body.users.length, 1, 'able to add and then query a user');
            })
            .then(function() {
                clock.tick(30000); // fast forward - users should expire every 30 seconds
                return req.get('/users');
            })
            .then(function(res) {
                t.isEqual(res.body.users.length, 0, 'after 30 seconds of inactivity, a user is removed');
            })
            .then(function() {
                return addUserToChat(userInfo, req);
            })
            .then(function() {
                clock.tick(29000); // fast forward 29 seconds
                return req.put('/user').send({'id': userInfo.id});
            })
            .then(function() {
                clock.tick(20000); // fast forward 20 more, 29 + 20 > 30 seconds
                return req.get('/users');
            })
            .then(function(res) {
                t.isEqual(res.body.users.length, 1, 'PUT /user with a valid id refreshes their last active time, preventing removal');
                clock.restore();
            })
            .then(function() {
                return req.put('/user')
                        .send({'id': 'bad_id'})
                        .expect(400);
            })
            .then(function(res) {
                t.isEqual(res.body.error, 'invalid user', 'PUT /user with an invalid id has error citing invalid user');
            })
});

test('Message expiration', function(t) {
    var userInfo = {'name': 'foobar'};
    var clock = sinon.useFakeTimers();

    var req = freshChatAppRequest();
    return addUserToChat(userInfo, req)
            .then(function() {
                return addMessageForId(userInfo.id, 'hello world', req);
            })
            .then(function() {
                return req.get('/messages');
            })
            .then(function(res) {
                t.isEqual(res.body.messages.length, 1, 'able to add a user and a message from that user');
            })
            .then(function() {
                clock.tick(60000*5); // messages should expire every 5 minutes
                return req.get('/messages');
            })
            .then(function(res) {
                t.isEqual(res.body.messages.length, 0, 'after 5 mintues a message is cleaned up');
                clock.restore();
            });
});

//
// helper functions to simplify some actions in tests that are not the main focus in the tests
//

// adds 1 user to chat app and gets their server generated id
function addUserToChat(userInfo, req) {
    if (!userInfo || !_.isObject(userInfo) || !userInfo.name) {
        throw 'Can\'t add a no name to the chat!';
    }
    return req.post('/user')
            .send(userInfo)
            .then(function(res) {
                userInfo.id = res.body.id;
            });
}

// adds a message for the given id
function addMessageForId(id, message, req) {
    if (!id || !message || !req) {
        throw 'Unable to add message for id!';
    }
    return req
            .post('/message')
            .send({id, message});
}

// clears require cache to ensure tests isolation of module's globals
function freshChatAppRequest() {
    return request(reload('../server/ChatApp'));
}
