"use strict";

/**
 * Created by liucaiyun on 2017/7/22.
 */

app.provider('myRouter', function () {
    this.$get = function () {
        return {};
    }
});

app.provider('myState', function (myRouterProvider) {

    var allStates = {};

    this.state = function (index, config) {
        /**
         * index: 该页面的标示
         * url: 该页面显示在地址栏上的链接
         * config: {
                        url: '',
                        templateUrl: '',
                        config: {}
                    }
         */
        allStates[index] = config;
        return this;
    };

    function go(index, params, config) {
        var stateConfig = allStates[index];
    }

    this.when = function (url, defaultUrl) {
        if (window.location.pathname === url) {
            for (var index in allStates) {
                if (allStates[index].url === defaultUrl) {
                    go(index);
                    break;
                }
            }
        }
    };

    this.$get = function () {
        return {
            go: go
        };
    }
});

app.config(['myStateProvider', function(myStateProvider){

    myStateProvider
        .state('base', {
            url: '/'
        })
        .state('welcome', {
            url:'/welcome',
            templateUrl: 'templates/welcome.html'
        })
        .state('login', {
            url: '/login',
            templateUrl: 'templates/login.html'
        })
        .state('index', {
            url: '/index',
            templateUrl: 'templates/home.html',
            controller: 'HomeCtrl'
        })
    ;

    // 设置相关
    myStateProvider
        .state('index.account', {
            url: '/account',
            templateUrl: 'templates/setting/account.html'
        })
        .state('index.company', {
            url: '/company',
            templateUrl: 'templates/setting/company.html',
            params: {
                company: {}
            }
        })
        .state('index.share', {
            url: '/share',
            templateUrl: 'templates/setting/share.html'
        })
        .state('index.account.password', {
            url: '/password',
            templateUrl: 'templates/setting/password_setter.html',
            controller: 'PasswordCtrl'
        })
    ;

    myStateProvider.when('/', '/welcome');
    myStateProvider.when('', '/welcome');
}]);

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

    $stateProvider
        .state('base', {
            url: '/'
        })
        .state('welcome', {
            url:'/welcome',
            templateUrl: 'templates/welcome.html'
        })
        .state('login', {
            url: '/login',
            templateUrl: 'templates/login.html'
        })
        .state('index', {
            url: '/index',
            templateUrl: 'templates/home.html'
        })
    ;

    // 设置相关
    $stateProvider
        .state('index.account', {
            url: 'account/',
            templateUrl: 'templates/setting/account.html'
        })
        .state('index.company', {
            url: 'company',
            templateUrl: 'templates/setting/company.html',
            params: {
                company: null
            }
        })
        .state('index.share', {
            url: 'share',
            templateUrl: 'templates/setting/share.html'
        })
        .state('index.account.password', {
            url: 'password',
            templateUrl: 'templates/setting/password_setter.html'
        })
    ;

    $urlRouterProvider.when('/', '/welcome');
    $urlRouterProvider.when('', '/welcome');
}]);

/*
app.run(function ($rootScope, $state, $stateParams) {
   $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParam) {
        console.log("chage start");
   });
    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParam) {
        console.log("chage success");
        if (toState.name.split('.').length > 2){        //  进入二级页面，则将footer隐藏
            angular.element('#menu').hide();
        }
        else if (toState.name.split('.').length <= 2 && fromState.name.split('.').length > 2){
            angular.element('#menu').show();

        }

    });
});
*/
