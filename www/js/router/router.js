"use strict";

/**
 * Created by liucaiyun on 2017/7/22.
 */

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

    $stateProvider
        .state('base', {
            url: '/'
        })
        .state('welcome', {
            url:'/welcome',
            // template: '<div>alskdjf</div>'
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

    // 战点相关
    $stateProvider
        .state('index.search', {
            url: '/search',
            params: {
                sitesTree: null,
                onSelect: null,
                selectedSn: null,
            },
            templateUrl: 'templates/site/site-select-page.html'
        })
        .state('index.eventList', {
            url: '/siteEvents',
            params: {
                sn: null
            },
            templateUrl: 'templates/site/event-list.html'
        })
        .state('index.kanban', {
            url: '/kanban',
            params: {
                sn: null
            },
            templateUrl: 'templates/site/kanban.html'
        })
        .state('index.kanban.eventList', {
            url: '/siteEvents',
            params: {
                sn: null
            },
            templateUrl: 'templates/site/event-list.html'
        })
        .state('index.monitorList', {
            url: '/monitors',
            params: {
                sn: null
            },
            templateUrl: 'templates/site/monitor-list.html',
            controller: 'MonitorListCtrl'
        })
        .state('index.monitorList.detail', {
            url: '/detail',
            params: {
                url: null
            },
            templateUrl: 'templates/site/monitor-detail.html',
        })
        .state('index.monitorDevices', {
            url: '/monitordevices',
            params: {
                sn: null
            },
            templateUrl: 'templates/site/device-monitor-list.html'
        })
        .state('index.monitorDevices.detail', {
            url: '/detail',
            params: {
                sn: null,
                deviceSn: null,
                deviceName: null
            },
            templateUrl: 'templates/site/device-monitor.html'
        })
        .state('index.devicedocs', {
            url: '/devicedocs',
            params: {
                sn: null
            },
            templateUrl: 'templates/site/static-devices/device-home.html'
        })
        .state('index.devicedocs.detail', {
            url: '/detail',
            params: {
                id: null
            },
            templateUrl: 'templates/site/static-devices/device-detail.html'
        })
        .state('index.docs', {
            url: '/docs',
            params: {
                sn: null
            },
            templateUrl: 'templates/site/docs.html'
        })
        .state('index.reports', {
            url: '/reports',
            params: {
                sn: null,
                name: null
            },
            templateUrl: 'templates/site/reports.html'
        })
        .state('index.reports.detail', {
            url: '/detail',
            params: {
                link: null,
                name: null
            },
            templateUrl: 'templates/base-image-zoom.html'
        })
        .state('index.securityReports', {
            url: '/security',
            params: {
                sn: null
            },
            templateUrl: 'templates/evaluate/evaluate-history.html'
        })
        .state('index.poweroffReports', {
            url: '/poweroff-reports',
            params: {
                sn: null,
                name: null
            },
            templateUrl: 'templates/maintenance-check/check-history.html'
        })
        .state('index.dtsList', {
            url: '/dts-list',
            params: {
                sn: null,
                name: null
            },
            templateUrl: 'templates/dts/dts-list.html'
        })
        .state('index.historyLine', {
            url: '/history-line',
            params: {
                sn: null,
                name: null
            },
            templateUrl: 'templates/site-monitor/data-line.html'
        })
        .state('index.historyReport', {
            url: '/history-report',
            params: {
                sn: null,
                name: null
            },
            templateUrl: 'templates/site-monitor/data-history.html'
        })
        ;

    // 设置相关
    $stateProvider
        // .state('index.setting', {
        //     url: '/setting',
        //     views: {
        //         'setting': {
        //             templateUrl: 'templates/setting/setting.html',
        //             controller: 'SettingCtrl'
        //         }
        //     }
        // })
        .state('index.account', {
            url: 'account/',
            templateUrl: 'templates/setting/account.html'
        })
        .state('index.company', {
            url: 'company',
            templateUrl: 'templates/setting/company.html'
        })
        .state('index.share', {
            url: 'share',
            templateUrl: 'templates/setting/share.html'
        })
        .state('index.account.password', {
            url: 'password',
            templateUrl: 'templates/setting/password_setter.html',
            controller: 'PasswordCtrl'
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
