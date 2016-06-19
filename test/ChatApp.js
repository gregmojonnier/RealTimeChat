var test = require('tape');
var request = require('supertest');
var chatApp = require('../server/ChatApp');

test('GET /users', function(t) {
    request(chatApp)
        .get('/users')
		.expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
            t.error(err, 'no errors');
            t.deepEqual(res.body, {users: []}, 'begins with 0 users');
            t.end();
        });
});
