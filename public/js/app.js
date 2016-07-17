var app = angular.module('chatApp', ['ngRoute', 'chatAppControllers']);

app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: '/templates/register.html',
        controller: 'RegisterCtrl'
    }).otherwise({redirectTo: '/'});
}]);
