var controllers = angular.module('chatAppControllers', []);
controllers.controller('RegisterCtrl', function($scope, $http, $state, credentials, socket_connection) {
    var info = credentials.get();
    if (info) {
        $state.go('chat');
    } else {
        $scope.createUser = function() {
            socket_connection.send('user-join',
                                  {'name': $scope.username},
                                    function(data) {
                                                    if (data && data.id) {
                                                        credentials.set($scope.username, data.id);
                                                        $state.go('chat');
                                                    } else {
                                                        $scope.username = '';
                                                        $scope.registrationError = (data && data.error) ? data.error : 'Failed to register user';
                                                    }
                                                });
        };
    }
});

controllers.controller('ChatCtrl', function($scope, $http, $state, credentials, socket_connection) {
    $scope.users = [];
    var info = credentials.get();
    var userId;
    var intervalId;
    if (!info) {
        $state.go('register');
    } else {
        $scope.loggedInUser = info.user;
        userId = info.id;
        refreshChatData();
        intervalId = setInterval(refreshChatData, 2000);
        angular.element(document).ready(function() {
            $("#message-input").focus();
            scrollToBottomOfMessages();
        });
    }

    $scope.addMessage = function() {
        $http.post('/message', {id: userId, message: $scope.newMessage})
            .then(function success(response) {
                $scope.newMessage = '';
                refreshChatData();
            });
    };

    $scope.logout = function() {
        credentials.logOut();
        $http.post('/logout', {id: userId})
            .then(function success(response) {
                $state.go('register');
            });
    };

    function refreshChatData() {
        // stop when user is no longer logged in, otherwise poll chat info
        var info = credentials.get();
        if (!info) {
            clearInterval(intervalId);
        } else {
            $http.get('/latest', {params: {id: info.id}})
                .then(function success(response) {
                    $scope.users = response.data.users;
                    response.data.messages.forEach(function(message) {
                        if (message.time) {
                            message.time = new Date(message.time);
                        }
                    });
                    var newMessages = $scope.messages !== response.data.messages;
                    $scope.messages = response.data.messages;
                    if (newMessages) {
                        scrollToBottomOfMessages()
                    }
                }, function error(response) {
                    // user probably closed tab but kept browser window open, so user is considered stale server side
                    credentials.logOut();
                    alert('You\'ve been logged out due to inactivity!');
                    $state.go('register');
                });
        }
    };

    function scrollToBottomOfMessages() {
        $("#messages-row").scrollTop(function() { return this.scrollHeight; })
    }

    $scope.daSocketMessage = [];
});
