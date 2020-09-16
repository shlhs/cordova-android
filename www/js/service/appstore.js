var DEFAULT_MENUS = [
    {
        name: '站点监控',
        key: 'menu.parent.station',
        children: [
            // {
            //     name: '站点看板',
            //     icon: 'icon-kanban',
            //     templateUrl: '/templates/site/kanban.html',
            //     url: 'site-kanban',
            //     defaultChecked: true
            // },
            {
                name: '站点总览',
                key: 'menu.station.overview',
                icon: 'icon-kanban',
                templateUrl: '/templates/site/overview.html',
                url: 'site-overview',
                defaultChecked: true
            }, {
                name: '画面',
                key: 'menu.monitor.screen',
                icon: 'icon-monitor',
                templateUrl: '/templates/site/monitor-list.html',
                url: 'site-monitors',
                sn: 'station-monitor/monitor-screen-v2',
                defaultChecked: true
            }, {
                name: '设备监测',
                key: 'menu.monitor.device',
                icon: 'icon-device-monitor',
                templateUrl: '/templates/site/device-monitor-list.html',
                url: 'device-monitor',
                sn: 'station-monitor/device-monitor',
                defaultChecked: true
            },
            {
                name: '视频监控',
                key: 'menu.monitor.video',
                icon: 'icon-video-monitor',
                templateUrl: '/templates/video-monitor/video-monitor.html',
                url: 'video-monitor',
                sn: 'station-monitor/video-monitor',
                defaultChecked: true
            },
            {
                name: '设备档案',
                key: 'menu.device.document',
                icon: 'icon-archives',
                templateUrl: '/templates/site/static-devices/device-home.html',
                url: 'static-devices',
                sn: 'station-monitor/device-documents',
                defaultChecked: true && !gIsEnergyPlatform
            }, {
                name: '月度报告',
                key: 'menu.station.report',
                icon: 'icon-reports',
                templateUrl: '/templates/site/reports.html',
                url: 'monthly-report',
                sn: 'station-monitor/month-report',
                defaultChecked: true && !gIsEnergyPlatform
            }, {
                name: '电子档案',
                key: 'menu.device.efile',
                icon: 'icon-docs',
                templateUrl: '/templates/site/docs.html',
                url: 'site-documents',
                sn: 'station-monitor/e-file',
                defaultChecked: true && !gIsEnergyPlatform
            }, {
                name: '历史曲线',
                key: 'menu.station.dataline',
                icon: 'icon-history-line',
                templateUrl: '/templates/site-monitor/data-line.html',
                url: 'data-line',
                sn: 'station-monitor/data-line',
                defaultChecked: true && !gIsEnergyPlatform
            }, {
                name: '历史报表',
                key: 'menu.station.history',
                icon: 'icon-history-report',
                templateUrl: '/templates/site-monitor/data-history.html',
                url: 'data-history',
                sn: 'station-monitor/data-report-v2',
                defaultChecked: true && !gIsEnergyPlatform
            }
        ]
    }, {
        name: '运维中心',
        key: 'menu.parent.ops',
        children: [
            {
                name: '服务申请',
                key: 'menu.ops.create',
                icon: 'icon-add-task',
                templateUrl: '/templates/task/add-task.html',
                url: 'add-task',
                sn: 'ops-management/add-task',
                defaultChecked: true,
                role: ['USER']
            }, {
                name: '缺陷记录',
                key: 'menu.ops.defect',
                icon: 'icon-dashboard-dts',
                templateUrl: '/templates/dts/dts-list.html',
                url: 'dts-list',
                sn: 'ops-management/defect-tasks',
                defaultChecked: true,
                role: ['OPS_OPERATOR', 'OPS_ADMIN']
            }, {
                name: '安全评测',
                key: 'menu.ops.security',
                icon: 'icon-security',
                templateUrl: '/templates/evaluate/evaluate-history.html',
                sn: 'ops-management',
                url: 'evaluate-security',
                defaultChecked: true,
                role: ['OPS_OPERATOR', 'OPS_ADMIN']
            }, {
                name: '停电维护',
                key: 'menu.ops.poweroff',
                icon: 'icon-poweroff',
                templateUrl: '/templates/maintenance-check/check-history.html',
                sn: 'ops-management',
                url: 'poweroff-maintenance',
                defaultChecked: true,
                role: ['OPS_OPERATOR', 'OPS_ADMIN']
            }
        ]
    }, {
        name: '能源管理',
        key: 'menu.parent.energy',
        children: [
            {
                name: '用能统计',
                key: 'menu.energy.stat',
                icon: 'icon-energy-statistics',
                templateUrl: '/templates/energy/statistics.html',
                url: 'energy-overview',
                sn: 'energy/overview',
                defaultChecked: true
            }, {
                name: '用能报表',
                key: 'menu.energy.dataline',
                icon: 'icon-energy-history',
                templateUrl: '/templates/energy/energy-report.html',
                url: 'energy-report',
                sn: 'energy/report',
                defaultChecked: true
            }, {
                name: '抄表',
                key: 'menu.energy.meterreading',
                icon: 'icon-energy-reading',
                templateUrl: '/templates/energy/meter-reading.html',
                sn: 'energy/meter-reading',
                url: 'energy-meter-reading',
                defaultChecked: true
            }
        ]
    }
];

var DEFAULT_ENERGY_MENUS = [
    {
        name: '用电概况',
        key: 'menu.energy.overview',
        icon: 'icon-dashboard-energy-overview',
        templateUrl: '/templates/energy/overview.html'
    }, {
        name: '电费分析',
        key: 'menu.energy.cost',
        icon: 'icon-dashboard-energy-cost-analysis',
        templateUrl: '/templates/energy/cost-analysis.html'
    }, {
        name: '用电负荷',
        key: 'menu.energy.load',
        icon: 'icon-dashboard-energy-charge',
        templateUrl: '/templates/energy/load-analysis.html'
    }, {
        name: '最大需量',
        key: 'menu.energy.maxdemand',
        icon: 'icon-dashboard-energy-max-demand',
        templateUrl: '/templates/energy/max-demand.html'
    }, {
        name: '电能质量',
        key: 'menu.energy.quality.monitor',
        icon: 'icon-dashboard-energy-monitor',
        templateUrl: '/templates/energy/quality-monitor.html'
    }, {
        name: '质量报告',
        key: 'menu.energy.quality.report',
        icon: 'icon-dashboard-energy-quality-report',
        templateUrl: '/templates/energy/quality-report.html'
    },
    // {
    //     name: '设备监控',
    //     icon: 'icon-device-monitor-new',
    //     templateUrl: '/templates/site/device-monitor-list.html'
    // }, {
    //     name: '设备档案',
    //     icon: 'icon-archives-new',
    //     templateUrl: '/templates/site/static-devices/device-home.html'
    // }
];

app.service('appStoreProvider', ['$translate', function ($translate) {
    var defaultApps = DEFAULT_MENUS;
    this.setDefaultApps = function (apps) {
        defaultApps = apps;
    };

    // this.$get = function () {
    //     return {
    //         setPlatFunction: setPlatFunction,
    //         getAllApps: getAllApps,
    //         getSelectedApps: getSelectedApps,
    //         saveSelectedApps: saveSelectedApps,
    //         appHasUpdated: appHasUpdated,
    //         setMenuSns: setMenuSns,     // 设置最新的菜单
    //         hasOpsAuth: hasOpsAuth      // 用户是否有运维权限
    //     }
    // };

    function setPlatFunction(data) {        // 设置平台的功能列表
        if (data.opsManagement) {
            setStorageItem("ops-management", 1);
        } else {
            setStorageItem("ops-management", 0);
        }
        setStorageItem("platFunctions", JSON.stringify(data));
    }

    function getAllApps() {
        var allApps = JSON.parse(getStorageItem("allApps"));
        allApps.forEach(function (group) {
            group.name = $translate.instant(group.key);
            if (group.children) {
                group.children.forEach(function (app) {
                    app.name = $translate.instant(app.key);
                });
            }
        });
        return allApps;
    }

    function setMenuSns(userRole, snsObj, platFuncs) {
        var platFormHasOpsAuth = platFuncs ? platFuncs.opsManagement : true;

        // 再判断菜单是否配置了运维权限
        var menuHasOpsAuth = false, opsExist = false;
        for (var sn in snsObj) {
            if (sn.indexOf('ops-management') >= 0) {
                opsExist = true;
                if (snsObj[sn]) {
                    // 只要配置了一个，就认为是有运维权限的
                    menuHasOpsAuth = true;
                    break;
                }
            }
        }
        if (!opsExist) {        // 如果未保存过运维菜单，则默认具有运维权限
            menuHasOpsAuth = true;
        }
        var hasOpsAuth = platFormHasOpsAuth && menuHasOpsAuth;
        setStorageItem("ops-management", hasOpsAuth ? 1 : 0);

        var allApps = [];
        // 将站点菜单与平台菜单比较，计算有权限的所有菜单
        defaultApps.forEach(function (group) {
            var children = [];
            group.children.forEach(function (child) {
                var sn = child.sn;
                if (!sn) {
                    children.push(child);
                    return;
                }
                var enabled = snsObj[sn];
               if (enabled === undefined || enabled) {
                   // 如果没有保存过该菜单的配置，则根据平台功能权限显示菜单
                   if (sn.indexOf('ops-management') >= 0) {
                       if (hasOpsAuth) {
                           // 根据是用户还是运维人员，判断增加哪个菜单
                           if (child.role && child.role.indexOf(userRole) >= 0) {
                               children.push(child);
                           }
                       }
                       return;
                   }
                   if (sn === 'station-monitor/video-monitor') {
                       if (!platFuncs || platFuncs.videoMonitor) {
                           children.push(child);
                       }
                       return;
                   }
                   // 其他菜单根据默认显示
                   children.push(child);
               }
            });
            if (children.length) {
                allApps.push({
                    name: group.name,
                    key: group.key,
                    children: children
                });
            }
        });
        setStorageItem("allApps", JSON.stringify(allApps));
    }

    function hasOpsAuth() {
        var value = getStorageItem('ops-management');
        if (value === null || value === '1') {
            return true;
        }
        return false;
    }

    function getSelectedApps() {
        var allApps = getAllApps();
        var appsStr = getStorageItem('apps');
        var apps = appsStr ? JSON.parse(appsStr) : null;
        var selectedApps = [];
        allApps.forEach(function (group) {
            group.children.forEach(function (app) {
                if (!apps) {
                    if (app.defaultChecked) {
                        app.selected = true;
                        selectedApps.push(app);
                    }
                } else {
                    if (apps.indexOf(app.url) >= 0) {
                        app.selected = true;
                        selectedApps.push(app);
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

    function saveSelectedApps(apps) {
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

    this.setPlatFunction = setPlatFunction;
    this.getAllApps = getAllApps;
    this.getSelectedApps = getSelectedApps;
    this.saveSelectedApps = saveSelectedApps;
    this.appHasUpdated = appHasUpdated;
    this.setMenuSns = setMenuSns;     // 设置最新的菜单
    this.hasOpsAuth = hasOpsAuth;      // 用户是否有运维权限
}]);

//
// app.config(['appStoreProviderProvider', function (appStoreProvider) {
//     appStoreProvider.setDefaultApps([
//         {
//             name: '站点监控',
//             key: 'menu.parent.station',
//             children: [
//                 // {
//                 //     name: '站点看板',
//                 //     icon: 'icon-kanban',
//                 //     templateUrl: '/templates/site/kanban.html',
//                 //     url: 'site-kanban',
//                 //     defaultChecked: true
//                 // },
//                 {
//                     name: '站点总览',
//                     key: 'menu.station.overview',
//                     icon: 'icon-kanban',
//                     templateUrl: '/templates/site/overview.html',
//                     url: 'site-overview',
//                     defaultChecked: true
//                 }, {
//                     name: '画面',
//                     key: 'menu.monitor.screen',
//                     icon: 'icon-monitor',
//                     templateUrl: '/templates/site/monitor-list.html',
//                     url: 'site-monitors',
//                     sn: 'station-monitor/monitor-screen-v2',
//                     defaultChecked: true
//                 }, {
//                     name: '设备监测',
//                     key: 'menu.monitor.device',
//                     icon: 'icon-device-monitor',
//                     templateUrl: '/templates/site/device-monitor-list.html',
//                     url: 'device-monitor',
//                     sn: 'station-monitor/device-monitor',
//                     defaultChecked: true
//                 },
//                 {
//                     name: '视频监控',
//                     key: 'menu.monitor.video',
//                     icon: 'icon-video-monitor',
//                     templateUrl: '/templates/video-monitor/video-monitor.html',
//                     url: 'video-monitor',
//                     sn: 'station-monitor/video-monitor',
//                     defaultChecked: true
//                 },
//                 {
//                     name: '设备档案',
//                     key: 'menu.device.document',
//                     icon: 'icon-archives',
//                     templateUrl: '/templates/site/static-devices/device-home.html',
//                     url: 'static-devices',
//                     sn: 'station-monitor/device-documents',
//                     defaultChecked: true && !gIsEnergyPlatform
//                 }, {
//                     name: '月度报告',
//                     key: 'menu.station.report',
//                     icon: 'icon-reports',
//                     templateUrl: '/templates/site/reports.html',
//                     url: 'monthly-report',
//                     sn: 'station-monitor/month-report',
//                     defaultChecked: true && !gIsEnergyPlatform
//                 }, {
//                     name: '电子档案',
//                     key: 'menu.device.efile',
//                     icon: 'icon-docs',
//                     templateUrl: '/templates/site/docs.html',
//                     url: 'site-documents',
//                     sn: 'station-monitor/e-file',
//                     defaultChecked: true && !gIsEnergyPlatform
//                 }, {
//                     name: '历史曲线',
//                     key: 'menu.station.dataline',
//                     icon: 'icon-history-line',
//                     templateUrl: '/templates/site-monitor/data-line.html',
//                     url: 'data-line',
//                     sn: 'station-monitor/data-line',
//                     defaultChecked: true && !gIsEnergyPlatform
//                 }, {
//                     name: '历史报表',
//                     key: 'menu.station.history',
//                     icon: 'icon-history-report',
//                     templateUrl: '/templates/site-monitor/data-history.html',
//                     url: 'data-history',
//                     sn: 'station-monitor/data-report-v2',
//                     defaultChecked: true && !gIsEnergyPlatform
//                 }
//             ]
//         }, {
//             name: '运维中心',
//             key: 'menu.parent.ops',
//             children: [
//                 {
//                     name: '服务申请',
//                     key: 'menu.ops.create',
//                     icon: 'icon-add-task',
//                     templateUrl: '/templates/task/add-task.html',
//                     url: 'add-task',
//                     sn: 'ops-management/add-task',
//                     defaultChecked: true,
//                     role: ['USER']
//                 }, {
//                     name: '缺陷记录',
//                     key: 'menu.ops.defect',
//                     icon: 'icon-dashboard-dts',
//                     templateUrl: '/templates/dts/dts-list.html',
//                     url: 'dts-list',
//                     sn: 'ops-management/defect-tasks',
//                     defaultChecked: true,
//                     role: ['OPS_OPERATOR', 'OPS_ADMIN']
//                 }, {
//                     name: '安全评测',
//                     key: 'menu.ops.security',
//                     icon: 'icon-security',
//                     templateUrl: '/templates/evaluate/evaluate-history.html',
//                     sn: 'ops-management',
//                     url: 'evaluate-security',
//                     defaultChecked: true,
//                     role: ['OPS_OPERATOR', 'OPS_ADMIN']
//                 }, {
//                     name: '停电维护',
//                     key: 'menu.ops.poweroff',
//                     icon: 'icon-poweroff',
//                     templateUrl: '/templates/maintenance-check/check-history.html',
//                     sn: 'ops-management',
//                     url: 'poweroff-maintenance',
//                     defaultChecked: true,
//                     role: ['OPS_OPERATOR', 'OPS_ADMIN']
//                 }
//             ]
//         }, {
//             name: '能源管理',
//             key: 'menu.parent.energy',
//             children: [
//                 {
//                     name: '用能统计',
//                     key: 'menu.energy.stat',
//                     icon: 'icon-energy-statistics',
//                     templateUrl: '/templates/energy/statistics.html',
//                     url: 'energy-overview',
//                     sn: 'energy/overview',
//                     defaultChecked: true
//                 }, {
//                     name: '用能报表',
//                     key: 'menu.energy.dataline',
//                     icon: 'icon-energy-history',
//                     templateUrl: '/templates/energy/energy-report.html',
//                     url: 'energy-report',
//                     sn: 'energy/report',
//                     defaultChecked: true
//                 }, {
//                     name: '抄表',
//                     key: 'menu.energy.meterreading',
//                     icon: 'icon-energy-reading',
//                     templateUrl: '/templates/energy/meter-reading.html',
//                     sn: 'energy/meter-reading',
//                     url: 'energy-meter-reading',
//                     defaultChecked: true
//                 }
//             ]
//         }
//     ]);
// }]);

app.controller('AppStoreCtrl', ['$scope', 'appStoreProvider', '$translate', function ($scope, appStoreProvider, $translate) {
    $scope.allApps = appStoreProvider.getAllApps();
    $scope.selectedApps = appStoreProvider.getSelectedApps();
    $scope.isEditing = false;

    function setSelectedState() {
        var selectedAppUrls = [];
        $scope.selectedApps.forEach(function (t) {
            selectedAppUrls.push(t.url);
        });
        $scope.allApps.forEach(function (group) {
            group.children.forEach(function (app) {
                if (selectedAppUrls.indexOf(app.url) >= 0) {
                    app.selected = true;
                } else {
                    app.selected = false;
                }
            });
        });
    }

    $scope.onAddOrDelete = function (app) {
        if (app.selected) {
            app.selected = false;
            $scope.selectedApps.forEach(function (item, i) {
                if (item.url === app.url) {
                    $scope.selectedApps.splice(i ,1);
                    return false;
                }
            });
            $scope.allApps.forEach(function (group) {
                group.children.forEach(function (item) {
                    if (item.url === app.url) {
                        item.selected = false;
                        return false;
                    }
                })
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
    };
    setSelectedState();
}]);
