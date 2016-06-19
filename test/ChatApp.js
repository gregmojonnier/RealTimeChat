var test = require('tape');
var request = require('supertest');
var chatApp = require('../server/ChatApp');
var validUuid = require('uuid-validate');
var _ = require('underscore');

test('GET /users - querying all users information', function(t) {
    request(chatApp)
        .get('/users')
		.expect('Content-Type', /json/)
        .expect(200)
        .expect({users: []})
        .end(function(err, res) {
            t.error(err, 'starts with 0 users');
            t.end();
        });
});

test('POST /user', function(t) {
    var req = request(chatApp);
    req
        .post('/user')
        .send({'name':'foobar'})
        .expect(201)
        .expect(function(res) {
            var body = res.body || {};
            if (!body.name || !body.id || body.name !== 'foobar' || !validUuid(body.id)) {
                throw new Error('Response body "' + JSON.stringify(body) + '" did not contain expected name and id.');
            }
        })
        .end(function(err, res) {
            t.error(err, 'can be used to add a user');

            req.get('/users')
            .expect(function(res) {
                var body = res.body || {};
                if (!body.users || !_.find(body.users, {'name':'foobar'})) {
                    throw new Error('Did not find user in response body: ' + JSON.stringify(body));
                }
            })
            .end(function(err, res) {
                t.error(err, 'an added user can then be queried');
                t.end();
            });
        })
});
