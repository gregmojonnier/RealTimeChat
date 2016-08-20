var controllers = angular.module('chatAppControllers', []);
controllers.controller('RegisterCtrl', function($scope, $state, credentials, socket_connection) {
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

controllers.controller('ChatCtrl', function($scope, $state, credentials, socket_connection) {
    $scope.users = [];
    var info = credentials.get();
    var userId;
    if (!info) {
        $state.go('register');
    } else {
        $scope.loggedInUser = info.user;
        userId = info.id;
        setUpChatMessageHandlers();
        requestInitialChatData();
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
        socket_connection.send('logout', {id: userId});
        $state.go('register');
    };

    function setUpChatMessageHandlers() {
        socket_connection.onMessage('all-users-update', function(data) {
            if (data && data.users) {
                $scope.$applyAsync(function () {
                    $scope.users = data.users;
                });
            }
        });

        socket_connection.onMessage('new-message', function(message) {
            $scope.$applyAsync(function () {
                if (message) {
                    $scope.messages.push(message);
                }
            });
        });
    };

    function requestInitialChatData() {
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
    };

    function scrollToBottomOfMessages() {
        $("#messages-row").scrollTop(function() { return this.scrollHeight; })
    }
});
