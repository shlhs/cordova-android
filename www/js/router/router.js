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
            url: 'overview/?sn',
            templateUrl: '/templates/site/overview.html',
            onEnter: function () {
                console.log('onEnter');
            },
            onExit: function () {
                console.log('onExit');
            }
        })
        .state('index.graphs', { // 站点总览
            url: 'graphs/?sn',
            templateUrl: '/templates/site/monitor-list.html',
        })
        .state('index.monitorDevices', { // 设备监控
            url: 'monitor-devices/?sn',
            templateUrl: '/templates/site/device-monitor-list.html',
        })
        .state('index.monitorDevices.detail', { // 设备监控详情
            url: 'detail/?deviceSn',
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
        .state('index.staticDevices', { // 设备档案
            url: 'static-devices/?sn',
            templateUrl: '/templates/site/static-devices/device-home.html',
        })
        .state('index.videos', { // 视频监控
            url: 'videos/?sn',
            templateUrl: '/templates/video-monitor/video-monitor.html',
        })
        .state('index.videos.records', { // 视频巡检记录
            url: 'records/',
            templateUrl: '/templates/video-monitor/ipc-record-history.html',
        })
        .state('index.videos.records.detail', { // 视频巡检详情
            url: 'detail/?id',
            templateUrl: '/templates/video-monitor/ipc-pic-record-detail.html',
        })
        .state('index.reports', { // 月度报告
            url: 'reports/?sn',
            templateUrl: '/templates/site/reports.html',
        })
        .state('index.docs', { // 电子档案
            url: 'docs/?sn',
            templateUrl: '/templates/site/docs.html',
        })
        .state('index.dataline', { // 历史曲线
            url: 'dataline/?sn',
            templateUrl: '/templates/site-monitor/data-line.html',
        })
        .state('index.dataHistory', { // 历史报表
            url: 'data-history/?sn',
            templateUrl: '/templates/site-monitor/data-history.html',
        })
        .state('index.security', { // 安全评测
            url: 'security/?sn',
            templateUrl: '/templates/evaluate/evaluate-history.html',
        })
        .state('index.security.record', { // 安全评测单个记录
            url: 'record?id',
            templateUrl: '/templates/evaluate/security-evaluate-home.html',
        })
        .state('index.security.record.detail', { // 安全评测单个记录
            url: 'detail/',
            templateUrl: '/templates/evaluate/security-evaluate-first-classify.html',
        })
        .state('index.poweroff', { // 停电维护
            url: 'poweroff/?sn',
            templateUrl: '/templates/maintenance-check/check-history.html',
        })
        .state('index.energyStatistics', { // 用能统计
            url: 'energy-statistics/?sn',
            templateUrl: '/templates/energy/statistics.html',
        })
        .state('index.energyReport', { // 用能报表
            url: 'energy-report/?sn',
            templateUrl: '/templates/energy/energy-report.html',
        })
        .state('index.meterreading', { // 抄表
            url: 'meterreading/?sn',
            templateUrl: '/templates/energy/meter-reading.html',
        })
        .state('index.allApp', { // 应用中心
            url: 'appApp',
            templateUrl: '/templates/app-store/app-store.html',
        })
        .state('index.dts', {
            url: 'dts-list/?sn',
            templateUrl: '/templates/dts/dts-list.html'
        })
    ;
    // 能效管理
    $stateProvider
        .state('index.energyOverview', { // 用能统计
            url: 'energy-overview/?sn',
            templateUrl: '/templates/energy/overview.html',
        })
        .state('index.energyCost', { // 电费分析
            url: 'energy-cost/?sn',
            templateUrl: '/templates/energy/cost-analysis.html',
        })
        .state('index.energyLoad', { // 负荷统计
            url: 'energy-load/?sn',
            templateUrl: '/templates/energy/load-analysis.html',
        })
        .state('index.maxDemand', { // 最大需量
            url: 'max-demand/?sn',
            templateUrl: '/templates/energy/max-demand.html',
        })
        .state('index.energyQuality', { // 电能质量
            url: 'energy-overview/?sn',
            templateUrl: '/templates/energy/quality-monitor.html',
        })
        .state('index.energyQualityReport', { // 电能质量报告
            url: 'energy-overview/?sn',
            templateUrl: '/templates/energy/quality-report.html',
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
