"use strict";

/**
 * Created by liucaiyun on 2017/7/22.
 */

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

    $stateProvider
        .state('index', {
            url: '/'
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
        .state('index.dtsList', {
            url: 'dts-list/?sn',
            templateUrl: '/templates/dts/dts-list.html'
        })
        .state('index.dtsList.dts', {
            url: 'dts/?id',
            templateUrl: '/templates/dts/dts-detail.html'
        })
        .state('index.dtsList.newDts', {
            url: 'newDts',
            templateUrl: '/templates/dts/dts-create.html',
            params: {
                stationSn: null,
                deviceSns: null
            }
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
        .state('index.newTask', {
            url: 'newTask',
            templateUrl: '/templates/task/add-task.html',
            params: {
                stationSn: null,
                eventId: null
            }
        })
        .state('index.newDts', {
            url: 'newDts',
            templateUrl: '/templates/dts/dts-create.html',
            params: {
                stationSn: null,
                deviceSns: null,
                eventId: null
            }
        })
    ;
    var taskRouters = {
        'task': {
            url: 'task/?id&taskType',
            templateUrl: '/templates/task/task-detail.html'
        },
        'task.securityRecord': { // 安全评测报告
            url: 'security/:id/',
            templateUrl: '/templates/evaluate/security-evaluate-home.html',
        },
        'task.securitRecord.detail': {
            url: 'detail/',
            templateUrl: '/templates/evaluate/security-evaluate-first-classify.html',
        },
        'task.newDts': {
            url: 'newDts',
            templateUrl: '/templates/dts/dts-create.html',
            params: {
                stationSn: null,
                deviceSns: null
            }
        },
        'task.inspectDevices': {
            url: 'inspectDevices/',
            templateUrl: '/templates/task/device-list.html',
            params: {
                taskData: {},
                canEdit: false,
                recountFunc: null
            }
        },
        'task.inspectDevices.detail': {
            url: 'detail/',
            templateUrl: '/templates/task/inspect-device-check.html',
            params: {
                device: {},
                taskData: {},
                canEdit: false
            }
        },
        'task.inspectDevices.newDts': {
            url: 'newDts',
            templateUrl: '/templates/dts/dts-create.html?taskId&stationSn&deviceSns',
            params: {
                notOpenDetail: true, // 创建完成后不打开缺陷详情
                taskId: null,
                stationSn: null,
                deviceSns: null
            }
        },
        'dts': {
            url: 'dts/?id&taskType',
            templateUrl: '/templates/dts/dts-detail.html'
        },
        'task.dts': {
            url: 'dts/?dtsId&dtsType',
            templateUrl: '/templates/dts/dts-detail.html'
        }
    };
    ['index'].forEach(function (parentIndex) {
        Object.keys(taskRouters).forEach(function (index) {
            $stateProvider.state(parentIndex + '.' + index, taskRouters[index]);
        });
    });
    $urlRouterProvider.when('', '/');
    $urlRouterProvider.otherwise('/');
}]);