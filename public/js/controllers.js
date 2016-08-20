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
        requestAndSetUpChatDataHandler();
        angular.element(document).ready(function() {
            $("#message-input").focus();
            scrollToBottomOfMessages();
        });
    }

    $scope.addMessage = function() {
        socket_connection.send('new-message', {id: userId, message: $scope.newMessage});
        $scope.newMessage = '';
    };

    $scope.logout = function() {
        credentials.logOut();
        $http.post('/logout', {id: userId})
            .then(function success(response) {
                $state.go('register');
            });
    };

    function requestAndSetUpChatDataHandler() {
        // stop when user is no longer logged in, otherwise poll chat info
        var info = credentials.get();
        if (!info) {
            clearInterval(intervalId);
        } else {
            socket_connection.onMessage('all-users-update', function(data) {
                if (data && data.users) {
                    $scope.$applyAsync(function () {
                        $scope.users = data.users;
                    });
                }
            });

            socket_connection.send('ready-for-chat-info', {'id': info.id}, function(data) {
                if (data) {
                    $scope.$applyAsync(function () {
                        if (data.messages) {
                            $scope.messages = data.messages;
                        }
                        if(data.users) {
                            $scope.users = data.users;
                        }
                    });
                } 
                if (!data || data.error) {
                    alert('unable to receive chat info');
                    // user probably closed tab but kept browser window open, so user is considered stale server side
                    credentials.logOut();
                    alert('You\'ve been logged out due to inactivity!');
                    $state.go('register');
                }
            });
            socket_connection.onMessage('new-message', function(message) {
                $scope.$applyAsync(function () {
                    if (message) {
                        $scope.messages.push(message);
                    }
                });
            });
        }
    };

    function scrollToBottomOfMessages() {
        $("#messages-row").scrollTop(function() { return this.scrollHeight; })
    }
});
