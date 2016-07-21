var controllers = angular.module('chatAppControllers', []);
controllers.controller('RegisterCtrl', function($scope, $http, $location) {
    $scope.createUser = function() {
        $http.post('/user', {'name': $scope.username})
            .then(function success(response) {
                $.cookie('_chatUser', response.data.name);
                $.cookie('_chatId', response.data.id);
                $location.url('/chat');
            }, function error(response) {
                $scope.registrationError = response.data.error;
                $scope.username = '';
            });
    };
});

controllers.controller('ChatCtrl', function($scope, $http, $location) {
    $scope.users = [];
    var user = $.cookie('_chatUser');
    var userId = $.cookie('_chatId');
    if (!user || !userId) {
        $location.url('/');
    } else {
        $scope.loggedInUser = user;
        refreshChatData();
        setInterval(refreshChatData, 3000);
        angular.element(document).ready(function() {
            $("#message-input").focus();
            scrollToBottomOfMessages();
        });
    }

    $scope.addMessage = function() {
        $http.post('/message', {id: userId, message: $scope.newMessage})
            .then(function success(response) {
                $scope.newMessage = '';
            }, function error(response) {
            });
        refreshChatData();
    };
    $scope.logout = function() {
        alert('logout!');
    };

    function refreshChatData() {
        console.log("refreshing");
        $http.get('/latest', {params: {id: userId}})
            .then(function success(response) {
                $scope.users = response.data.users;
                console.log(response.data);
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
            });
    };

    function scrollToBottomOfMessages() {
        $("#messages-col").scrollTop(function() { return this.scrollHeight; })
    }
});
