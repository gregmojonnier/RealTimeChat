var app = angular.module('chatApp', ['ui.router', 'chatAppControllers']);

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('');
    $stateProvider
        .state('register', {
            url: '',
            templateUrl: '/templates/register.html',
            controller: 'RegisterCtrl'
        })
        .state('chat', {
            url: '/chat',
            templateUrl: '/templates/chat.html',
            controller: 'ChatCtrl'
        });
}]);
