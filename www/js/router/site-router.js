
app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){

    $stateProvider
        .state('index', {
            url: '/'
        })
        .state('index.siteDetail', {
            url: '/siteDetail',
            params: {
                name: null,
                sn: null
            },
            templateUrl: '/templates/site/site-detail.html',
            controller: 'SiteDetailCtrl'
        })

        .state('index.docs', {
            url: '/siteDocs',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/docs.html',
            controller: 'SiteDocsCtrl'
        })
        .state('index.deviceList', {
            url: '/siteDevices',
            params:{
                sn: null
            },
            templateUrl: '/templates/site/device-list.html',
            controller: "DeviceListCtrl"
        })
        .state('index.eventList', {
            url: '/siteEvents',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/event-list.html',
            controller: 'EventListCtrl'
        })
        .state('index.kanban', {
            url: '/kanban',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/kanban.html',
            controller: 'KanbanCtrl'
        })
        .state('index.monitorList', {
            url: '/monitors',
            params: {
                sn: null
            },
            templateUrl: '/templates/site/monitor-list.html',
            controller: 'MonitorListCtrl'
        })
        .state('index.monitorList.detail', {
            url: '/detail',
            params: {
                url: null
            },
            templateUrl: '/templates/site/monitor-detail.html',
            controller: 'MonitorDetailCtrl'
        })
        .state('index.deviceList.deviceDetail', {
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
}]);