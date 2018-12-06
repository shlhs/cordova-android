

app.provider('appStoreProvider', function () {
    var defaultApps = [];
    this.setDefaultApps = function (apps) {
        defaultApps = apps;
    };

    this.$get = function () {
        return {
            getAllApps: getAllApps,
            getSelectedApps: getSelectedApps,
            saveSelectedApps: saveSelectedApps,
            appHasUpdated: appHasUpdated
        }
    };

    function getAllApps() {
        var enabledMenuSns = getMenuSns();
        if (!enabledMenuSns) {
            return defaultApps;
        } else {
            var appGroups = [];
            defaultApps.forEach(function (group) {
                var children = [];
                group.children.forEach(function (child) {
                    if (!child.sn) {    // sn为空，则说明所有人都有权限
                        children.push(child);
                    } else if (enabledMenuSns.indexOf(child.sn) >= 0) {
                        children.push(child);
                    }
                });
                if (children.length) {
                    appGroups.push({
                        name: group.name,
                        children: children
                    });
                }
            });
            return appGroups;
        }
    }

    function getMenuSns() {
        var menuStr = getStorageItem("menuSns");
        if (!menuStr) {
            return null;
        }
        return JSON.parse(menuStr);
    }

    function getSelectedApps() {
        var enabledMenuSns = getMenuSns();
        var allApps = getAllApps();
        var appsStr = getStorageItem('apps');
        var apps = appsStr ? JSON.parse(appsStr) : null;
        var selectedApps = [];
        allApps.forEach(function (group) {
            group.children.forEach(function (app) {
                if (!apps) {
                    if (app.defaultChecked) {
                        if (app.sn && enabledMenuSns) {
                            if (enabledMenuSns.indexOf(app.sn) >= 0) {
                                app.selected = true;
                                selectedApps.push(app);
                            }
                        } else {
                            // 如果第一次登录，那么使用默认配置
                            app.selected = true;
                            selectedApps.push(app);
                        }
                    }
                } else {
                    if (apps.indexOf(app.url) >= 0) {
                        if (app.sn && enabledMenuSns) {
                            if (enabledMenuSns.indexOf(app.sn) >= 0) {
                                app.selected = true;
                                selectedApps.push(app);
                            }
                        } else {
                            app.selected = true;
                            selectedApps.push(app);
                        }
                        return false;
                    }
                }
            });
        });
        // 根据上一次选择结果，对selectedApps进行排序
        if (apps) {
            selectedApps.sort(function (app1, app2) {
                var index1 = apps.indexOf(app1.url);
                var index2 = apps.indexOf(app2.url);
                return index1 - index2;
            });
        }
        return selectedApps;
    }

    function  saveSelectedApps(apps) {
        var urls = [];
        apps.forEach(function (app) {
            urls.push(app.url);
        });
        setStorageItem('apps', JSON.stringify(urls));
    }

    function appHasUpdated() {
        // app是否有更新
        var appUpdateTime = getStorageItem("appUpdateTime");
    }
});

app.config(['appStoreProviderProvider', function (appStoreServiceProvider) {
    appStoreServiceProvider.setDefaultApps([
        {
            name: '站点监控',
            children: [
                {
                    name: '站点看板',
                    icon: 'icon-kanban',
                    templateUrl: '/templates/site/kanban.html',
                    url: 'site-kanban',
                    defaultChecked: true
                }, {
                    name: '画面',
                    icon: 'icon-monitor',
                    templateUrl: '/templates/site/monitor-list.html',
                    url: 'site-monitors',
                    sn: 'station-monitor/monitor-screen-v2',
                    defaultChecked: true
                }, {
                    name: '设备监测',
                    icon: 'icon-device-monitor',
                    templateUrl: '/templates/site/device-monitor-list.html',
                    url: 'device-monitor',
                    sn: 'station-monitor/device-monitor',
                    defaultChecked: true
                }, {
                    name: '设备档案',
                    icon: 'icon-archives',
                    templateUrl: '/templates/site/static-devices/device-home.html',
                    url: 'static-devices',
                    sn: 'station-monitor/device-documents',
                    defaultChecked: true
                }, {
                    name: '月度报告',
                    icon: 'icon-reports',
                    templateUrl: '/templates/site/reports.html',
                    url: 'monthly-report',
                    defaultChecked: true
                }, {
                    name: '电子档案',
                    icon: 'icon-docs',
                    templateUrl: '/templates/site/docs.html',
                    url: 'site-documents',
                    sn: 'station-monitor/device-documents',
                    defaultChecked: true
                }, {
                    name: '历史曲线',
                    icon: 'icon-history-line',
                    templateUrl: '/templates/site-monitor/data-line.html',
                    url: 'data-line',
                    sn: 'station-monitor/data-line',
                    defaultChecked: true
                }, {
                    name: '历史报表',
                    icon: 'icon-history-report',
                    templateUrl: '/templates/site-monitor/data-history.html',
                    url: 'data-history',
                    sn: 'station-monitor/data-report-v2',
                    defaultChecked: true
                }
            ]
        }, {
            name: '运维中心',
            children: [
                {
                    name: '缺陷记录',
                    icon: 'icon-dashboard-dts',
                    templateUrl: '/templates/dts/dts-list.html',
                    url: 'dts-list',
                    sn: 'ops-management/defect-tasks',
                    defaultChecked: true
                }, {
                    name: '安全评测',
                    icon: 'icon-security',
                    templateUrl: '/templates/evaluate/evaluate-history.html',
                    sn: 'ops-management',
                    url: 'evaluate-security',
                    defaultChecked: true
                }, {
                    name: '停电维护',
                    icon: 'icon-poweroff',
                    templateUrl: '/templates/maintenance-check/check-history.html',
                    sn: 'ops-management',
                    url: 'poweroff-maintenance',
                    defaultChecked: true
                }
            ]
        }, {
            name: '能源管理',
            children: [
                {
                    name: '用能统计',
                    icon: 'icon-energy-statistics',
                    templateUrl: '/templates/energy/overview.html',
                    url: 'energy-overview',
                    sn: 'energy/overview',
                    defaultChecked: true
                }, {
                    name: '用能报表',
                    icon: 'icon-energy-history',
                    templateUrl: '/templates/energy/energy-report.html',
                    url: 'energy-report',
                    sn: 'energy/report',
                    defaultChecked: true
                }, {
                    name: '抄表',
                    icon: 'icon-energy-reading',
                    templateUrl: '/templates/energy/meter-reading.html',
                    sn: 'energy/meter-reading',
                    url: 'energy-meter-reading',
                    defaultChecked: true
                }
            ]
        }
    ]);
}]);

app.controller('AppStoreCtrl', function ($scope, appStoreProvider) {
    $scope.allApps = appStoreProvider.getAllApps();
    $scope.selectedApps = appStoreProvider.getSelectedApps();
    $scope.isEditing = false;

    $scope.onAddOrDelete = function (app) {
        if (app.selected) {
            app.selected = false;
            $scope.selectedApps.forEach(function (item, i) {
                if (item.url === app.url) {
                    $scope.selectedApps.splice(i ,1);
                    return false;
                }
            });
        } else {
            app.selected = true;
            $scope.selectedApps.push(app);
        }
    };

    $scope.toggleEdit = function () {
        $scope.isEditing = !$scope.isEditing;
    };

    $scope.onSave = function () {
        appStoreProvider.saveSelectedApps($scope.selectedApps);
        $scope.toggleEdit();

        // 回到
        if (window.android) {
            window.android.onJsCallbackForPrevPage('onAndroidCb_updateAppList', '');
        }
        $scope.$emit('onNotifyAppUpdate');
    }
});