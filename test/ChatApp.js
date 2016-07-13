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
                return req.get('/messages')
                            .query({id: userInfo.id});
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
            .expect(400)
            .then(function() {
                t.pass('We get 400 when trying to get messages without specifying a user id');
                return req.get('/messages')
                            .query({id: 'a_bad_id'})
                            .expect(403);
            })
            .then(function(res) {
                var body = res.body;
                t.ok(body.error, 'We get 403 and the response has an error when trying to get messages with a bad user id');
            })
            .then(function() {
                return addUserToChat(userInfo, req);
            })
            .then(function() {
                return req.get('/messages')
                            .query({id: userInfo.id})
                            .expect('Content-Type', /json/)
                            .expect(200)
                            .expect({messages: []})
                            .then(function(res) {
                                var messages = res.body.messages;
                                t.ok(messages, 'A valid messages response has a messages key');
                                t.ok(_.isArray(messages), 'messages is an array');
                                t.isEqual(messages.length, 0, 'starts with 0 messages');
                            })
            })
            .then(function() {
                return addMessageForId(userInfo.id, 'hello world', req);
            })
            .then(function() {
                return req.get('/messages')
                            .query({id: userInfo.id});
            })
            .then(function(res) {
                t.isEqual(res.body.messages.length, 1, 'adding a message results in the messages array growing by 1');
                var message = res.body.messages[0];
                t.ok(message.name, 'each message has a\nname');
                t.ok(message.message, 'each message has a message');
                t.ok(message.time, 'each message has a time');
            });
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
                return req.get('/messages')
                            .query({id: userInfo.id});
            })
            .then(function(res) {
                t.isEqual(res.body.messages.length, 1, 'able to add a user and a message from that user');
            })
            .then(function() {
                clock.tick(60000*5); // messages should expire every 5 minutes
                return addUserToChat(userInfo, req); // readd user as valid user is required to get messages & we've expired in this time
            })
            .then(function() {
                return req.get('/messages')
                            .query({id: userInfo.id});
            })
            .then(function(res) {
                t.isEqual(res.body.messages.length, 0, 'after 5 mintues a message is cleaned up');
                clock.restore();
            });
});

test('User expiration', function(t) {
    var userInfo = {'name': 'foobar'};
    var clock = sinon.useFakeTimers();

    var req = freshChatAppRequest();
    return addUserToChat(userInfo, req)
            .then(function() {
                return req.get('/messages')
                            .query({id: userInfo.id})
                            .expect(200)
                            .then(function() {
                                t.pass('A valid user gets 200 when trying to GET messages.');
                            });
            })
            .then(function() {
                clock.tick(31000); // users expire every 30 seconds
            })
            .then(function() {
                return req.get('/messages')
                            .query({id: userInfo.id})
                            .expect(403)
                            .then(function() {
                                t.pass('After 30 seconds of inactivity a previously valid user gets 403 when trying to GET messages');
                            });
            })
            .then(function() {
                return addUserToChat(userInfo, req);
            })
            .then(function() {
                clock.tick(29500); // users expire every 30 seconds, 1/2 second until expiration
            })
            .then(function() {
                // GET /messages prevents user expiration
                return req.get('/messages')
                            .query({id: userInfo.id})
                            .expect(200);
            })
            .then(function() {
                clock.tick(29500); // 59 seconds have now passed since user added to chat
            })
            .then(function() {
                return req.get('/messages')
                            .query({id: userInfo.id})
                            .expect(200)
                            .then(function(res) {
                                t.pass('GET /messages refreshes a user\'s 30 second expiration');
                            });
            })
            .then(function() {
                clock.restore();
            });
});

test('POST /logout - can be used to log a user out', function(t) {
    var userInfo = {'name':'foobar'};
    var req = freshChatAppRequest();
    return req
            .post('/logout')
            .send({'id':'some_fake_id'})
            .expect(403)
            .then(function(res) {
                var body = res.body;
                t.ok(body.error, 'response has an error key when an unknown user id is given');
            })
            .then(function() {
                return addUserToChat(userInfo, req); // populates userInfo w/a valid id
            })
            .then(function() {
                return addMessageForId(userInfo.id, 'hello world', req)
                        .expect(201);
            })
            .then(function() {
                return req
                        .post('/logout')
                        .send({'id': userInfo.id})
                        .expect(200)
                        .expect(function() {
                            t.pass('logging a valid user out returns 200');
                        });
            })
            .then(function() {
                return addMessageForId(userInfo.id, 'hello world', req)
                        .expect(403);
            })
            .then(function(res) {
                var body = res.body;
                t.ok(body.error, 'response has an error key when trying to add a message for a user that just logged out');
            })
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
