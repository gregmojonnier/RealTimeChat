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
        refreshChatData();
        setInterval(refreshChatData, 3000);
    }

    $scope.addMessage = function() {
        $http.post('/message', {id: userId, message: $scope.newMessage})
            .then(function success(response) {
                $scope.newMessage = '';
            }, function error(response) {
            });
        refreshChatData();
    };

    function refreshChatData() {
        console.log("refreshing");
        $http.get('/latest', {params: {id: userId}})
            .then(function success(response) {
                $scope.users = response.data.users;
                response.data.messages.forEach(function(message) {
                    if (message.time) {
                        message.time = new Date(message.time);
                    }
                });
                $scope.messages = response.data.messages;
                nicePageUi();
            }, function error(response) {
            });
    };

    function nicePageUi() {
        $("#message-input").focus();
        $("p:contains(" + user + ")").css("color", "green")
        $("#messages-col").scrollTop(function() { return this.scrollHeight; })
    }
});
