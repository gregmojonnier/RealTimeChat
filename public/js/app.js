var app = angular.module('chatApp', ['ngRoute', 'chatAppControllers']);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: '/templates/register.html',
        controller: 'RegisterCtrl'
    }).when('/chat', {
        templateUrl: '/templates/chat.html',
        controller: 'ChatCtrl'
    }).otherwise({redirectTo: '/'});
}]);
