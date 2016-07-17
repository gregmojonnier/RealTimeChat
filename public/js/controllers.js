var controllers = angular.module('chatAppControllers', []);
controllers.controller('RegisterCtrl', function($scope, $http) {
    $scope.createUser = function() {
        $http.post('/user', {'name': $scope.username})
            .then(function success(response) {
                $.cookie('_chatUser', response.data.name);
                $.cookie('_chatId', response.data.id);
                window.location.replace('#/chat');
            }, function error(response) {
                $scope.registrationError = response.data.error;
                $scope.username = '';
            });
    };
});
