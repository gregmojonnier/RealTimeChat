var test = require('blue-tape');
var request = require('supertest-as-promised');
var ChatApp = require('../server/ChatApp');
var isValidUuid = require('uuid-validate');
var _ = require('underscore');

test('POST /user - a name is all that\'s needed to add a user', function(t) {
    var req = request(ChatApp());
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
            return req.get('/users')
                .then(function(res) {
                    console.log('Added user can then be queried with GET /users');
                    var body = res.body;
                    t.ok(body.users, 'response has a users key');
                    t.true(_.find(body.users, {'name':'foobar'}), 'found name in users array');
                });
        });
});

test('GET /users - querying all users information', function(t) {
    var req = request(ChatApp());
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
        .then(function(res) {
            var userInfo = {'name': 'foobar'};
            return addUserToChat(userInfo, req)
                    .then(function() {
                        return req
                            .get('/users')
                            .then(function(res) {
                                var body = res.body;
                                t.isEqual(body.users.length, 1, 'adding a user results in the users array growing by 1');
                            })
                        console.log(res);
                    });
        });
});

test('POST /message - can be used to add a message', function(t) {
    var userInfo = {'name':'foobar'};
    var message = 'hello world';
    var id; // assigned by server

    var req = request(ChatApp());
    return addUserToChat(userInfo, req)
            .then(function(res) {
                id = userInfo.id;
                return req.post('/message')
                        .send({id, message})
                        .expect(201)
                        .expect(function() {
                            t.pass('a valid user id can add a message');
                        });
            })
            .then(function(res) {
                return req
                        .get('/messages')
                        .then(function(res) {
                            var body = res.body;
                            t.ok(_.find(body.messages, {id, message}), 'GET /messages contains the message we just added');
                        });
            })
            .then(function(res) {
                return req
                        .post('/message')
                        .send({'id':'a_bad_id', 'message':'hello world'})
                        .expect(403)
                        .then(function(res) {
                            console.log('Trying to add a message for a user id that doesn\'t exist fails');
                            var body = res.body;
                            t.ok(body.error, 'response has an error key');
                            t.isEqual(body.error, 'invalid user', 'error cites invalid user');
                        });
            });
});

test('GET /messages - can be used to query messages', function(t) {
    var userInfo = {'name':'foobar'};
    var req = request(ChatApp());
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
                return req.get('/messages')
                        .then(function(res) {
                            t.isEqual(res.body.messages.length, 1, 'adding a message results in the messages array growing by 1');
                        });
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
