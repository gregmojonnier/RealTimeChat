var services = angular.module('credentialsService', []);
services.factory('credentials', function() {
    var userCookie = '_chatUser';
    var userIdCookie = '_chatId';

    return {
        get: function() {
            var user = $.cookie(userCookie);
            var userId = $.cookie(userIdCookie);
            if (user && userId) {
                return {
                    user: $.cookie(userCookie),
                    id: $.cookie(userIdCookie)
                }
            } else {
                return undefined;
            }
        },
        set: function(user, id) {
            $.cookie(userCookie, user);
            $.cookie(userIdCookie, id);
        },
        logOut: function() {
            $.removeCookie(userCookie);
            $.removeCookie(userIdCookie);
        }
    };
});

services.factory('socket_connection', function() {
    var socket;

    function lazyConnect() {
        if (!socket) {
            socket = io.connect('http://localhost:3000');
        }
    }
    return {
        onMessage: function(msg, cb) {
            angular.element(document).ready(function() {
                lazyConnect();
                socket.on(msg, cb);
            });
        },
        send: function(msg, dataObj, ackCb) {
            angular.element(document).ready(function() {
                lazyConnect();
                socket.emit(msg, dataObj, ackCb);
            });
        }
    };
});
