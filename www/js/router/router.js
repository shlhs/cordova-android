"use strict";

/**
 * Created by liucaiyun on 2017/7/22.
 */

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

    $stateProvider
        // .state('base', {
        //     url: '/'
        // })
        // .state('welcome', {
        //     url:'/welcome',
        //     // template: '<div>alskdjf</div>'
        //     templateUrl: '/templates/welcome.html'
        // })
        // .state('login', {
        //     url: '/login',
        //     templateUrl: '/templates/login.html'
        // })
        .state('index', {
            url: '/',
            // templateUrl: '/templates/home.html'
            // controller: 'HomeCtrl'
        })
    ;
/*
    // 战点相关
    $stateProvider
        // .state('index.sites', {
        //     url: '/sites',
        //     views: {
        //         'sites': {
        //             templateUrl: '/templates/site/site-list.html',
        //             controller: 'SiteListCtrl'
        //         }
        //     }
        // })
        .state('index.siteDetail', {
            url: '/siteDetail',
            params: {
                name: null,
                sn: null
            },
            templateUrl: '/templates/site/site-detail.html',
            controller: 'SiteDetailCtrl'
        })

        .state('index.siteDetail.docs', {
            url: '/siteDocs',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/docs.html',
            controller: 'SiteDocsCtrl'
        })
        .state('index.siteDetail.deviceList', {
            url: '/siteDevices',
            params:{
                sn: null
            },
            templateUrl: '/templates/site/device-list.html',
            controller: "DeviceListCtrl"
        })
        .state('index.siteDetail.eventList', {
            url: '/siteEvents',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/event-list.html',
            controller: 'EventListCtrl'
        })
        .state('index.siteDetail.kanban', {
            url: '/kanban',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/kanban.html',
            controller: 'KanbanCtrl'
        })
        .state('index.siteDetail.monitorList', {
            url: '/monitors',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/monitor-list.html',
            controller: 'MonitorListCtrl'
        })
        .state('index.siteDetail.monitorList.detail', {
            url: '/detail',
            params: {
                url: null
            },
            templateUrl: '/templates/site/monitor-detail.html',
            controller: 'MonitorDetailCtrl'
        })
        .state('index.siteDetail.deviceList.deviceDetail', {
            url: '/deviceDetail',
            params: {
                sn: null,
                deviceSn: null,
                deviceName: null
            },
            templateUrl: '/templates/site/device-detail.html',
            controller: 'DeviceDetailCtrl'
        })
        ;
        */
    // 设置相关
    $stateProvider
        .state('index.setting', {
            url: 'setting/',
            templateUrl: '/templates/setting/setting.html'

        })
        .state('index.account', {
            url: 'account/',
            templateUrl: '/templates/setting/account.html'
        })
        .state('index.company', {
            url: 'company',
            templateUrl: '/templates/setting/company.html',
            params: {
                company: null
            }
        })
        .state('index.share', {
            url: 'share',
            templateUrl: '/templates/setting/share.html'
        })
        .state('index.setting.password', {
            url: 'password',
            templateUrl: '/templates/setting/password_setter.html',
            controller: 'PasswordCtrl'
        })
        .state('index.overview', { // 站点总览
            url: 'overview/:sn/',
            templateUrl: '/templates/site/overview2.html',
            controller: 'SiteOverviewCtrl',
        })
        .state('index.graphs', { // 站点总览
            url: 'graphs/:sn/',
            templateUrl: '/templates/site/monitor-list.html',
        })
        .state('index.monitorDevices', { // 设备监控
            url: 'monitor-devices/:sn/',
            templateUrl: '/templates/site/device-monitor-list.html',
        })
        .state('index.monitorDevices.detail', { // 设备监控详情
            url: 'detail/:deviceSn/',
            templateUrl: '/templates/site/device-monitor.html',
            params: {
                deviceSn: null,
                name: null
            }
        })
        .state('index.monitorDevices.detail.control', { // 设备监控-控制中心
            url: 'control/',
            templateUrl: '/templates/site/device-monitor/remote-control.html',
            params: {
                deviceSn: null,
                name: null
            }
        })
        .state('index.videos', { // 站点总览
            url: 'videos/:sn/',
            templateUrl: '/templates/video-monitor/video-monitor.html',
        })
        .state('index.videos.records', { // 站点总览
            url: 'records/',
            templateUrl: '/templates/video-monitor/ipc-record-history.html',
        })
        .state('index.videos.records.detail', { // 站点总览
            url: 'detail/:id/',
            templateUrl: '/templates/video-monitor/ipc-pic-record-detail.html',
        })
        .state('index.reports', {
            url: 'reports/:sn/',
            templateUrl: '/templates/site/reports.html',
        })
        .state('index.docs', {
            url: 'docs/:sn/',
            templateUrl: '/templates/site/docs.html',
        })
    ;

    $urlRouterProvider.when('', '/');
    $urlRouterProvider.otherwise('/');
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
