"use strict";
/**
 * Created by liucaiyun on 2017/7/20.
 */
var TaskTypes = {
    Security: 1,    // 安全评测,
    Jianxiu: 2,     // 检修
    Qiangxiu: 3,    // 抢修
    Other: 4,       // 其他
    Baoyang: 5,     // 保养
    Poweroff: 6,    // 停电维护
    NormalDts: 8,   // 一般缺陷
    SeriousDts: 9,  // 严重缺陷
    FatalDts: 10,   // 致命缺陷
    Xunjian: 11,    // 巡检
    Xunshi: 12,     // 巡视
    Baodian: 13,    // 保电
    YufangTest: 14, // 预防试验
    Xiaoque: 15,    // 消缺
    Tingsong: 16,   // 停送操作,
    Install: 17,    // 安装调试
    HiddenDanger: 20, // 隐患
};
var OpsTaskType = [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15, 16, 17];
var DtsTaskType = [8, 9, 10];
var TaskAction = {
    Create: 0,
    Accept: 1,
    Refuse: 2,
    Assign: 3,
    Go: 4,
    Apply: 5,
    Reject: 6,
    Close: 7,
    Comment: 8,
    Grab: 9,
    Arrive: 10,
    Update: 11,
    Transfer: 12,
    Cancel: 13,
    RECHECK: 20
};
var TaskStatus = {ToAccept: 1, ToAssign: 2, Accepted: 3, ToClose: 4, Closed: 5, Competition: 6, Coming: 7, Arrived: 8};
var TaskSource = {Repaire: 1, Event: 2, Inspect: 3};
var TaskActionName = {
    1: '接单',
    2: {
        name: '拒绝',
        color: '#ff9800'
    },
    3: '指定责任人',
    4: '现在出发',
    5: {
        name: '提交审核',
        color: '#00BFA5'
    },
    6: {
        name: '驳回',
        color: '#ff9800'
    },
    7: '关闭任务',
    8: '评论',
    9: {
        name: '抢单',
        color: '#00BFA5'
    },
    10: '已到达，开始处理',
    11: '提交处理结果',
    12: '转给他人',
    13: {
        name: '撤单',
        color: '#ff9800'
    },
    20: '复测'
};

function formatTaskStatusName(task) {   // 根据任务状态转换任务描述
    var userAccount = gUserAccount;
    var stage = task.stage, status = '';
    var userIsCurrentHandler = accountInHandlers(userAccount, task.current_handler);
    var userIsRechecker = accountInHandlers(userAccount, task.recheck_handlers);
    task.recheck_stage_name = '';
    if (task.stage_id !== TaskStatus.Closed && userIsRechecker) {
        if (!userIsCurrentHandler || task.stage_id === TaskStatus.ToClose) { // 如果用户是复测人，但不是处理人，且任务不处于待审批状态，则只显示 复测 状态
            stage = '';
        }
        task.recheck_stage_name = gIsEnglish ? 'To retest' : '待复测';
    }
    task.stage_name = task.stage;
    task.status = status;
    task.isToStart = task.create_time.substring(0, 16) > new Date().Format('yyyy-MM-dd HH:mm');      // 任务待开始
    // 任务图标
    var icon = 'other';
    switch (task.task_type_id) {
        case TaskTypes.NormalDts:
            icon = 'defect';
            break;
        case TaskTypes.SeriousDts:
            icon = 'defect warning';
            break;
        case TaskTypes.FatalDts:
            icon = 'defect danger';
            break;
        case TaskTypes.Jianxiu:
            icon = 'jianxiu';
            break;
        case TaskTypes.Qiangxiu:
            icon = 'qiangxiu danger';
            break;
        case TaskTypes.Poweroff:
            icon = 'poweroff';
            break;
        case TaskTypes.Baoyang:
            icon = 'baoyang';
            break;
        case TaskTypes.Xunjian:
        case TaskTypes.Xunshi:
            icon = 'inspect';
            break;
        case TaskTypes.HiddenDanger:
            icon = 'hidden-danger warning';
            break;
    }
    task.iconClass = icon;
    return task;
}

function sortByUpdateTime(t1, t2) {
    // 排序顺序：待处理、待审核、已关闭。 相同状态下按更新时间排序
    if (t1.last_modified_time > t2.last_modified_time) {
        return -1;
    }
    if (t1.last_modified_time === t2.last_modified_time) {
        return 0;
    }
    return 1;
}

function sortByCreateTime(t1, t2) {
    if (t1.create_time > t2.create_time) {
        return -1;
    }
    if (t1.create_time === t2.create_time) {
        return 0;
    }
    return 1;
}

function formatExpiredTime(t) {     // 格式化截止时间，只有日期没有时间
    var day = new Date().getDate(), month = new Date().getMonth() + 1, year = new Date().getFullYear();
    var m = parseInt(t.substring(5, 7)), d = parseInt(t.substring(8, 10)), y = parseInt(t.substring(0, 4));
    if (m === month && d === day) {
        return '今日';
    }
    if ((m === month && d === (day + 1)) || (d === 1 && m === (month - 1)) || (m === 1 && d === 1 && y === (year - 1))) {
        return '明日';
    }
    return t.substring(5, 10);
}

function formatUpdateTime(t) {      // 格式化更新时间，有日期和时间
    var day = new Date().getDate(), month = new Date().getMonth() + 1, year = new Date().getFullYear();
    var m = parseInt(t.substring(5, 7)), d = parseInt(t.substring(8, 10)), y = parseInt(t.substring(0, 4));
    if (m === month && d === day) {
        return '今日 ' + t.substring(11, 16);
    }
    if ((m === month && d === (day - 1)) || (d === 1 && m === (month - 1)) || (m === 1 && d === 1 && y === (year - 1))) {
        return '昨日 ' + t.substring(11, 16);
    }
    return t.substring(5, 16);
}

function accountInHandlers(account, handlers) {
    if (!handlers) {
        return false;
    }
    return handlers.split(',').indexOf(account) >= 0;
}

app.constant('TaskAction', TaskAction);
app.constant('TaskStatus', TaskStatus);
app.constant('UserRole', UserRole);

app.service('Permission', ['userService', 'UserRole', function (userService, UserRole) {      // 权限服务
    var role = userService.getUserRole();

    this.task = {
        'canView': role !== UserRole.Normal,
        'canEdit': role === UserRole.OpsAdmin || role === UserRole.OpsOperator
    };

    this.refresh = function () {
        this.task = {
            'canView': role !== UserRole.Normal,
            'canEdit': role === UserRole.OpsAdmin || role === UserRole.OpsOperator
        };
    };
}]);

app.controller('HomeCtrl', ['$scope', '$state', '$timeout', 'userService', 'appStoreProvider', 'platformService', 'ajax', 'routerService', '$myTranslate', function ($scope, $state, $timeout, userService, appStoreProvider, platformService, ajax, routerService, $myTranslate) {
    var role = userService.getUserRole();
    $scope.viewName = '';
    $scope.tabName = '';
    $scope.title = '';

    $scope.sitesTree = [];
    $scope.sites = [];
    $scope.currentSite = {};
    $scope.isLoading = true;
    $scope.popup_visible = false;
    $scope.searchSiteResult = [];
    $scope.role = userService.getUserRole();
    $scope.navMenus = [_getDefaultHomeMenu()];
    if (gShowEnergyPage) {
        $scope.navMenus.push(_getEnergyMenu());
    }
    if (platformService.platHasOpsFunc()) {
        if ($scope.role === 'OPS_ADMIN' || $scope.role === 'OPS_OPERATOR') {
            $scope.navMenus.push(_getGrabTasksMenu());
            $scope.navMenus.push(_getTaskTodoMenu());
        } else if ($scope.role === 'USER') {
            // 普通用户或平台管理员，不能看到抢单页
            $scope.navMenus.push(_getTaskTodoMenu());
        }
    }
    var menuInited = false;     // 导航栏菜单是否初始化

    $scope.isEnglish = gIsEnglish;

    $scope.$on('taskUpdateSuccess', function (event, taskId, taskData) { // 监听任务更新
       $scope.$broadcast('toUpdateTask', taskId, taskData);
    });

    $scope.$on('onBaseNotifyAppUpdate', function () { // appstore修改
        $scope.$broadcast('onNotifyAppUpdate');
    });

    $scope.openApp = function(app) {
        $state.go('.' + app.sref, {sn: $scope.currentSite.sn});
    };

    $scope.getDataList = function () {
        $scope.isLoading = true;
        ajax.get({
            url: "/stations",
            success: function (result) {
                $scope.isLoading = false;
                var sites = [];
                var stationSns = [];
                result.forEach(function (s) {
                    var width = window.screen.width, height = Math.round(width / 2);
                    if (s.photo_src_link) {
                        s.site_image = platformService.getImageUrl(width, height, platformService.getCloudHost() + s.photo_src_link);
                    } else {
                        s.site_image = '/img/site-default.png';
                    }
                    if (!s.is_group) {
                        s.search_key = s.name.toLowerCase() + ' ' + s.sn.toLowerCase();
                        stationSns.push(s.sn);
                    }
                    s.urlName = encodeURIComponent(s.name);
                    s.full_address = (s.address_province || '') + (s.address_city || '') + (s.address_district || '') + (s.address || '');
                    sites.push(s);
                });
                setStorageItem('stationSns', stationSns.join(','));     // 记录用户有权限查看的站点sn
                $scope.sites = sites;
                if (sites.length) {
                    // 更新站点状态
                    $scope.sitesTree = formatSiteTree(sites)[0].children;
                    $scope.searchSiteResult = sites;
                    getCurrentSite();
                    $scope.refreshAllSiteStatus();        // 获取站点详情
                }
                $scope.$apply();
            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                $.notify.error('获取站点列表失败');
                console.log('get fail');
                $scope.$apply();
            }
        });
    };

    function _formatSiteStatus(data) {
        if (data.communication_status === null || data.communication_status === '') {
            data.status = 'unknown';
            data.status_name = $myTranslate.instnat('status.unknown');
        } else if (data.communication_status == 1) {
            if (data.running_status == 1) {
                data.status = 'abnormal';
                data.status_name = $myTranslate.instant('status.abnormal');
            } else {
                data.status = 'normal';
                data.status_name = $myTranslate.instant('status.normal');
            }
        } else {
            data.status = 'offline';
            data.status_name = $myTranslate.instant('status.offline');
        }
    }

    $scope.refreshAllSiteStatus = function () {      // 获取站点详情
        if (!$scope.sites.length) {
            return;
        }
        ajax.get({
            url: "/stations/details",
            success: function (result) {
                $scope.isLoading = false;
                var sites = $scope.sites;
                result.forEach(function (s) {
                    _formatSiteStatus(s);
                    s.events_amount = s.unclosed_envet_amount > 99 ? '99+' : s.unclosed_envet_amount;
                    for (var i = 0; i < sites.length; i++) {
                        if (sites[i].sn === s.station.sn) {
                            delete s['station'];
                            $.extend(sites[i], s);
                            break;
                        }
                    }
                });
                // 更新站点状态
                $scope.sitesTree = formatSiteTree(sites)[0].children;
                $scope.isLoading = false;
                $scope.$apply();
            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                // $.notify.error('获取站点列表失败');
                console.log('get fail');
                $scope.$apply();
            }
        });
    };

    $scope.refreshStationStatus = function (sn) {
        ajax.get({
            url: "/stations/details/" + sn,
            success: function (result) {
                _formatSiteStatus(result);
                for (var i = 0; i < $scope.sites.length; i++) {
                    if ($scope.sites[i].sn === sn) {
                        $.extend($scope.sites[i], {
                            events_amount: result.unclosed_envet_amount > 99 ? '99+' : result.unclosed_envet_amount,
                            status: result.status,
                            status_name: result.status_name,
                            communication_status: result.communication_status,
                            running_status: result.running_status
                        });
                        break;
                    }
                }
                // 更新站点状态
                $scope.$apply();
            }
        });
    };

    $scope.searchInputChange = function (input) {
        var value = input.value.toLowerCase().trim();
        if (!value) {
            $scope.searchSiteResult = $scope.sites;
        } else {
            $scope.searchSiteResult = [];
            $scope.sites.forEach(function (site) {
                if (site.search_key.indexOf(value) >= 0) {
                    $scope.searchSiteResult.push(site);
                }
            });
        }
        $scope.$apply();
    };

    $scope.updateSiteData = function () {
        var url = "/stations/" + $scope.currentSite.sn + "/events";
        ajax.get({
            url: url,
            success: function (data) {
            },
            error: function () {

            }
        })
    };

    $scope.showPopover = function () {
        $scope.popup_visible = true;
    };
    $scope.closePopover = function () {
        $scope.popup_visible = false;
    };

    $scope.chooseSite = function (site) {
        if (!$scope.currentSite || $scope.currentSite.sn !== site.sn) {
            $scope.currentSite = site;
            $scope.searchSiteResult = $scope.sites;
            localStorage.setItem("currentSite", JSON.stringify(site));
            ajax.setTzOffset(site);
            $scope.closePopover();
            $scope.$broadcast('onSiteChange', site);
        }
    };

    function getCurrentSite() {
        var sites = $scope.sites;
        var siteStr = localStorage.getItem("currentSite");
        if (siteStr) {
            // 检查站点是否在当前站点中
            var site = JSON.parse(siteStr);
            for (var i = 0; i < sites.length; i++) {
                if (sites[i].sn === site.sn) {
                    $scope.currentSite = sites[i];
                    $scope.$broadcast('onSiteChange', sites[i]);
                    return;
                }
            }
        }
        $scope.currentSite = findFirstLeafOfTree(sites);
        if ($scope.currentSite) {
            localStorage.setItem("currentSite", JSON.stringify($scope.currentSite));
            $scope.$broadcast('onSiteChange', $scope.currentSite);
        }
    }

    $scope.openSiteSelectPage = function () {
        $scope.refreshAllSiteStatus();
        routerService.openPage($scope, '/templates/site/site-select-page.html',
            {treeData: $scope.sitesTree, onSelect: $scope.chooseSite, selectedSn: $scope.currentSite.sn},
            {hidePrev: false});
        // $state.go('.siteSelector', {treeData: $scope.sitesTree, onSelect: $scope.chooseSite, selectedSn: $scope.currentSite.sn});
    };

    function _getDefaultHomeMenu() {
        return {
            id: 'sites',
            name: $myTranslate.instant('tab.home'),
            templateUrl: '/templates/site/site-home.html',
            icon: 'nav-sites'
        };
    }

    function _getEnergyMenu() {
        return {
            id: 'energy_mgmt',
            name: $myTranslate.instant('tab.energy'),
            templateUrl: '/templates/energy/energy-home.html',
            icon: 'nav-energy'
        };
    }

    function _getGrabTasksMenu() {
        return {
            id: 'grab_tasks',
            name: $myTranslate.instant('tab.competition'),
            templateUrl: '/templates/task/task-competition-list.html',
            icon: 'nav-task-grab'
        };
    }

    function _getTaskTodoMenu() {
        if (role === 'OPS_ADMIN' || role === 'OPS_OPERATOR') {
            return {
                id: 'my_tasks',
                name: $myTranslate.instant('tab.om'),
                templateUrl: '/templates/task/task-todo-list.html',
                icon: 'nav-all-tasks'
            };
        } else if (role === 'USER') {
            return {
                id: 'my_tasks',
                name: $myTranslate.instant('tab.om'),
                templateUrl: '/templates/task/user-task-list.html',
                icon: 'nav-all-tasks'
            };
        }
        return null;
    }

    $scope.chooseNav = function ($event, tabId) {
        $event && $event.preventDefault();
        if (tabId === $scope.tabName) {
            return;
        }
        $scope.tabName = tabId;
        var element = angular.element('#' + tabId).children().first(), scope = element.scope();
        if (scope && scope.getDataList && !element.data('inited')) {
            scope.getDataList();
            element.data('inited', true);
        } else {
            $scope.$broadcast('onChooseNav', tabId);
        }
        angular.element('#' + tabId).addClass('mui-active').siblings().removeClass('mui-active');
    };

    function initMenu() {
        // 所有用户都可看到这两个页面
        $timeout(function () {
            $scope.chooseNav(null, $scope.navMenus[0].id);
        }, 500);
    }

    function updateMenus(platHasOps) {
        // 判断是否包含ops-management权限
        if (!platHasOps && !menuInited) {
            // 没有运维权限，需要将待办或我的服务删除
            if (gShowEnergyPage) {
                // 保留两个菜单
                $scope.navMenus = $scope.navMenus.slice(0, 2);
            } else {
                // 保留一个菜单
                $scope.navMenus = [$scope.navMenus[0]];
            }
            menuInited = true;
        }
    }

    $scope.openTaskCreate = function () {
        mui('#taskPopover').popover('hide', document.getElementById('taskAddBtn'));
        $state.go('.newTask');
    };

    $scope.openDtsCreate = function () {
        mui('#taskPopover').popover('hide', document.getElementById('taskAddBtn'));
        $state.go('.newDts');
    };

    $scope.$on('$onMenuUpdate', function (event, opsEnabled, menuSns) {
        updateMenus(opsEnabled);
    });
    initMenu();
}]);

function isTodoTask(task, username, userRole) {
    if (task.stage_id !== TaskStatus.Closed) {
        if (task.current_handler && task.current_handler.split(',').indexOf(username) >= 0) {
            return true;
        }
        // 复测只有在提交审核之前才能算作是待办
        if (task.stage_id !== TaskStatus.Closed && task.recheck_handlers && task.recheck_handlers.split(',').indexOf(username) >= 0) {
            return true;
        }
    } else if (task.stage_id === TaskStatus.Closed && task.finish_time && !task.has_comment && userRole === 'USER') {
        // 未评价过的工单业主可评价
        return true;
    }
    return false;
}

app.controller('TaskBaseCtrl', ['$scope', '$stateParams', 'ajax', 'userService', 'appStoreProvider', '$myTranslate', '$state', function ($scope, $stateParams, ajax, userService, appStoreProvider, $myTranslate, $state) {
    var stationSn = $stateParams.sn || GetQueryString("sn");
    var deviceSn = GetQueryString("device_sn");     // 如果设备sn不为空，则获取的是设备的运维记录
    $scope.pageTitle = deviceSn ? $myTranslate.instant('task.ops.services') : $myTranslate.instant('task.history');
    $scope.hasOpsAuth = appStoreProvider.hasOpsAuth();
    $scope.isEnglish = gIsEnglish;
    var map = null;
    $scope.openTask = function (task) {
        // if (deviceSn && task.task_type_id === TaskTypes.Xunjian) {
        //     // 如果是查看单个设备的巡检任务，那么进入特殊的巡检页面
        //     location.href = '/templates/task/xunjian-device-detail.html?id=' + task.id + '&device_sn=' + deviceSn;
        // } else
        if (task.is_defect || task.task_type_id === TaskTypes.HiddenDanger) {
            $state.go('.dts', {id: task.id, taskType: task.task_type_id});
        } else {
            $state.go('.task', {id: task.id, taskType: task.task_type_id});
        }
    };

    $scope.taskTimeout = function (task) {
        // 如果任务已关闭或已提交审核，则认为已完成
        if (task.stage_id === TaskStatus.Closed || task.stage_id === TaskStatus.ToClose) {
            return false;
        }
        var today = new Date().Format('yyyy-MM-dd HH:mm:ss.S');
        if (task.expect_complete_time < today) {
            // task.stage = '已超时';
            task.is_timeout = true;
            return true;
        }
        return false;
        //data.expect_complete_time
    };

    $scope.$on('taskUpdateSuccess', function (event, taskId, taskData) {
        $scope.$broadcast('toUpdateTask', taskId, taskData);
    });

    var companyId = userService.getTaskCompanyId();
    $scope.commonPostAction = function (taskId, actionType, description, images, cb) {
        var data = {};
        if (description) {
            data.description = description;
        }
        if (images && images.length) {
            data['pictures'] = images;
        }
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId + '/' + taskId + '/actions?action_type=' + actionType,
            data: JSON.stringify(data),
            contentType: "application/json",
            headers: {
                Accept: "application/json"
            },
            timeout: 30000,
            success: function (data) {
                $.notify.progressStop();
                $.notify.info();
                $scope.$emit('taskUpdateSuccess', taskId, data); // 工单更新完成事件
                cb && cb(data);
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error($myTranslate.instant('submit failed'));
            }
        });
    };

    $scope.commonPostActionWithParams = function (taskId, actionType, params, cb) {
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId + '/' + taskId + '/actions?action_type=' + actionType,
            data: params ? JSON.stringify(params) : '{}',
            contentType: "application/json",
            headers: {
                Accept: "application/json"
            },
            timeout: 30000,
            success: function (data) {
                $.notify.progressStop();
                $.notify.info($myTranslate.instant('submit successful'));
                $scope.$emit('taskUpdateSuccess', taskId, data); // 工单更新完成事件
                cb && cb(data);
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error($myTranslate.instant('submit failed'));
            }
        });
    };

    $scope.getDriveDistance = function (start, stationPosition, cb) {        // 获取实际开车的距离
        if (null === map) {
            map = new BMap.Map("map");          // 创建地图实例
        }
        var driving = new BMap.DrivingRoute(map, {
            renderOptions: {
                map: map,
                panel: "results",
                autoViewport: true
            },
            onSearchComplete: function (result) {
                if (result && result.getPlan(0)) {
                    var distance = parseFloat(result.getPlan(0).getDistance());
                    cb && cb(distance);
                } else {
                    cb && cb(null); // 不存在路径
                }
            }
        });
        var end = new BMap.Point(stationPosition.longitude, stationPosition.latitude);
        driving.search(start, end);
    };

    $scope.getStraightDistance = function (startPosint, endLocation) {
        if (null === map) {
            map = new BMap.Map("map");          // 创建地图实例
        }
        var end = new BMap.Point(endLocation.longitude, endLocation.latitude);
        return map.getDistance(startPosint, end);
    };

    $scope.callPhone = function (phone) {
        if (phone && window.android && window.android.callPhone) {
            window.android.callPhone(phone);
        }
    };

    $scope.checkActuallyArrived = function (taskId, siteLongitude, siteLatitude, cb) {
        // 不检查，直接返回
        cb && cb(taskId, TaskAction.Arrive);
        // //  如果站点的坐标为空，则直接提交操作
        // if (!siteLongitude || !siteLatitude || !window.android){
        //     cb && cb(taskId, TaskAction.Arrive);
        //     return;
        // }
        // $.notify.progressStart();
        // apiLocation.start(function (longtitude, latitude, errorInfo) {     // 获取用户的当前位置
        //     // 判断位置是否一致
        //     if (longtitude && latitude){
        //         var start = new BMap.Point(longtitude, latitude);
        //         // 坐标转换
        //         var convertor = new BMap.Convertor();
        //         var pointArr = [start];
        //         convertor.translate(pointArr, 3, 5, function (data) {
        //             // 计算用户与站点的直线距离
        //             if (!map){
        //                 map = new BMap.Map("map");          // 创建地图实例
        //             }
        //             var sitePoint = new BMap.Point(siteLongitude, siteLatitude);
        //             var distance = map.getDistance(data.points[0], sitePoint);
        //             if (distance > 1000){    // 因泰来：距离大于1000米，无法确认到达
        //                 $.notify.progressStop();
        //                 $.notify.error('检测到您未到达现场');
        //             }else{
        //                 // 需要先检查是否真的已到现场
        //                 cb && cb(taskId, TaskAction.Arrive);
        //                 return;
        //             }
        //         });
        //     } else{
        //         $.notify.progressStop();
        //         if (errorInfo) {
        //             $.notify.error(errorInfo);
        //         } else {
        //             $.notify.error('无法获取当前位置');
        //         }
        //     }
        // });
    };

    $scope.openDtsCreatePage = function () {
        $state.go('.newDts', {
            stationSn: stationSn || '',
            deviceSns: deviceSn || ''
        });
    };

    $scope.getUserNameAndPhone = function (user) {
        if (!user) {
            return '';
        }
        return user.name;
    };

    $scope.isEnglish = gIsEnglish;
}]);

app.controller('CompetitionTaskListCtrl', ['$scope', '$rootScope', 'scrollerService', 'userService', 'ajax', '$myTranslate', function ($scope, $rootScope, scrollerService, userService, ajax, $myTranslate) {
    $scope.tasks = [];
    var opsTeams = [];
    $scope.toAcceptUsers = [];      // 抢单时能选的其他运维工
    $scope.isLoading = false;
    $scope.userPickerVisible = false;
    var userAccount = userService.getUser().account;
    var companyId = userService.getCompanyId();

    moment.locale('en', {
        relativeTime: {
            future: "in %s",
            past: "%s前",
            s: "秒",
            m: "1分钟",
            mm: "%d分钟",
            h: "1小时",
            hh: "%d小时",
            d: "1天",
            dd: "%d天",
            M: "1个月",
            MM: "%d个月",
            y: "1年",
            yy: "%d年"
        }
    });

    function formatTime(task) {
        task.create_time_desp = moment(task.create_time).fromNow();
        task.create_time = formatUpdateTime(task.create_time);
        return task;
    }

    function getTeamAndUsers() {
        $scope.isLoading = true;
        ajax.get({
            url: '/OpsTeams?company_id=' + companyId + '&with_user=true',
            success: function (teams) {
                opsTeams = teams;
                // 如果当前用户存在运维班组中，则请求数据列表
                var inTeam = false;
                for (var i = 0; i < teams.length; i++) {
                    var team = teams[i];
                    if (team.users) {
                        for (var j = 0; j < team.users.length; j++) {
                            if (team.users[j].account === userAccount) {
                                inTeam = true;
                                break;
                            }
                        }
                        if (inTeam) {
                            break;
                        }
                    }
                }
                if (inTeam) {
                    $scope.getTaskDatas();
                } else {
                    $scope.isLoading = false;
                }
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $scope.$apply();
            }
        });
    }

    // 计算距离
    function getAllDistance(taskList) {
        if (!taskList || !taskList.length) {
            return;
        }
        // 先找到配置了位置的站点
        var needCalcStations = {};
        taskList.forEach(function (t) {
            if (needCalcStations[t]) {
                return;
            }
            if (t.station_latitude) {
                needCalcStations[t.station_sn] = {
                    latitude: t.station_latitude,
                    longitude: t.station_longitude
                };
            }
        });

        if (Object.keys(needCalcStations).length === 0) {       // 不需要计算距离
            return;
        }
        // 先获取自己的位置
        apiLocation.start(function (longitude, latitude) {
            // 列表页计算直线距离即可
            if (!longitude || !latitude) {
                return;
            }
            var start = new BMap.Point(longitude, latitude);
            // 先做坐标转换
            var convertor = new BMap.Convertor();
            var pointArr = [start];
            convertor.translate(pointArr, 3, 5, function (data) {
                var startPoint = data.points[0];
                Object.keys(needCalcStations).forEach(function (stationSn) {
                    // 计算直线距离
                    var location = needCalcStations[stationSn];
                    var distance = $scope.getStraightDistance(startPoint, needCalcStations[stationSn]);
                    if (distance) {
                        var strDis = distance > 1000 ? ((distance / 1000).toFixed(2) + 'km') : (Number.parseInt(distance) + 'm');
                        // 设置所有同一个站点的任务的距离
                        taskList.forEach(function (t) {
                            if (t.station_sn === stationSn) {
                                t.distance = strDis;
                            }
                        });
                        $scope.$apply();
                    }
                });
            });
        });
    }

    $scope.getTaskDatas = function () {
        scrollerService.initScroll('#competition_tasks_scroller', $scope.getDataList);
        if (!companyId) {
            return;
        }
        $scope.isLoading = true;
        ajax.get({
            url: "/opstasks/competition",
            data: {
                stage: TaskStatus.Competition
            },
            success: function (result) {
                $scope.isLoading = false;
                if (!result || !result.length) {
                    $scope.tasks = [];
                    $scope.$apply();
                    return;
                }
                for (var i in result) {
                    var t = result[i];
                    formatTaskStatusName(formatTime(t));
                    t.task_type_name = $myTranslate.instant(t.task_type_name);
                }
                $scope.tasks = result;
                $scope.tasks.sort(sortByCreateTime);
                $scope.$apply();
                // getAllDistance(result);
            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                $scope.$apply();
                $.notify.error('读取抢单任务失败');
            }
        });
    };
    $scope.getDataList = function () {
        getTeamAndUsers();
    };

    $scope.$on('toUpdateTask', function (event, taskId, taskData) {
        $scope.afterGrabTask(taskData);
    });

    $scope.afterGrabTask = function (taskData) {
        for (var i in $scope.tasks) {
            var task = $scope.tasks[i];
            if (parseInt(task.id) === parseInt(taskData.id)) {
                // 从任务列表中删除
                $scope.tasks.splice(i, 1);
                // 给我的待办增加一条
                var scope = angular.element('#taskListWrapper').scope();
                scope.updateTask && scope.updateTask(taskData);
                break;
            }
        }
        $scope.$apply();
    };

    var currentGrabTask = null;
    $scope.onClickGrab = function ($event, task) {
        $event.stopPropagation();
        var users = [];
        for (var i = 0; i < opsTeams.length; i++) {
            if (opsTeams[i].id === task.operator_team) {
                opsTeams[i].users.forEach(function (user) {
                    if (user.account !== userAccount) {
                        users.push(user);
                    }
                });
                break;
            }
        }
        $scope.toAcceptUsers = users;
        $scope.userPickerVisible = true;
        currentGrabTask = task;
    };

    $scope.onHideGrab = function () {
        $scope.userPickerVisible = false;
    };

    $scope.postGrabTask = function (users) {
        var accounts = [];
        users.forEach(function (user) {
            accounts.push(user.account);
        });
        var params = {
            transfer_user: accounts.join(','),
        };
        $scope.commonPostActionWithParams(currentGrabTask.id, TaskAction.Grab, params, function (data) {
            $.notify.info("抢单成功");
            $scope.afterGrabTask(data);
            $scope.onHideGrab();
            $scope.$apply();
        });
    };

    // setTimeout(function () {
    //     getTeamAndUsers();
    // }, 1000);
}]);

app.controller('TaskTodoListCtrl', ['$scope', '$rootScope', 'scrollerService', 'userService', 'ajax', 'TaskStatus', '$myTranslate', function ($scope, $rootScope, scrollerService, userService, ajax, TaskStatus, $myTranslate) {
    var allTasks = [];
    var username = userService.user.account;
    var userRole = userService.getUserRole();
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.showType = 'todo';    // all, open, closed, todo
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;
    $scope.title = $myTranslate.instant('tab.todo');

    if (userRole !== 'OPS_OPERATOR' && userRole !== 'OPS_ADMIN') {
        $scope.title = $myTranslate.instant('tab.om');
    }

    $scope.getDataList = function () {
        scrollerService.initScroll("#taskList", $scope.getDataList);
        $scope.isLoading = true;
        $scope.loadingFailed = false;

        ajax.get({
            url: "/opstasks",
            data: {
                handler: username,
                rechecker: username,
                page_size: 100,
                page_index: 0,
                s_echo: 0
            },
            success: function (result) {
                $scope.isLoading = false;
                allTasks = result;
                var task = null;
                var current = new Date().Format('yyyy-MM-dd');
                for (var i in allTasks) {
                    task = allTasks[i];
                    formatTaskStatusName(task);
                    task.isTimeout = $scope.taskTimeout(task);
                    task.isToStart = task.create_time.substring(0, 10) > current;      // 任务待开始
                    task.expect_complete_time = task.expect_complete_time ? task.expect_complete_time.substring(0, 10) : null;
                    task.next_recheck_time = task.next_recheck_time ? task.next_recheck_time.substring(0, 10) : null;
                    var sortTime = task.expect_complete_time;
                    if (task.next_recheck_time && (!sortTime || task.next_recheck_time < task.expect_complete_time)) {
                        sortTime = task.next_recheck_time;
                    }
                    if (task.expect_complete_time) {
                        if (task.expect_complete_time < current) {
                            task.expect_time_timeout = true;
                        } else if (task.expect_complete_time === current) {
                            task.expect_complete_time = $myTranslate.instant('today');
                        }
                    }
                    if (task.next_recheck_time) {
                        if (task.next_recheck_time < current) {
                            task.next_recheck_timeout = true;
                        } else if (task.next_recheck_time === current) {
                            task.next_recheck_time = $myTranslate.instant('today');
                        }
                    }
                    task.sortTime = sortTime;
                }
                allTasks.sort(function (t1, t2) {
                    // 如果工单处于待指派状态，则优先级比较高
                    if (t1.stage_id === TaskStatus.ToAssign && t2.stage_id !== TaskStatus.ToAssign) {
                        return -1;
                    } else if (t1.stage_id !== TaskStatus.ToAssign && t2.stage_id === TaskStatus.ToAssign) {
                        return 1;
                    } else if (t1.stage_id === TaskStatus.ToAssign && t2.stage_id === TaskStatus.ToAssign) { // 如果两个都处于待指派状态，则先提交的在前
                        return t1.create_time < t2.create_time;
                    }
                    if (t1.sortTime && t2.sortTime) {
                        if (t1.sortTime < t2.sortTime) {
                            return -1;
                        }
                        if (t1.sortTime > t2.sortTime) {
                            return 1;
                        }
                        return 0;
                    } else if (t1.sortTime && t1.sortTime <= current) {
                        return -1;
                    } else if (t2.sortTime && t2.sortTime <= current) {
                        return 1;
                    }
                    // 如果sortTime都为空，则比较last_modified_time
                    return sortByUpdateTime(t1, t2);
                });

                $scope.changeTaskType(null, $scope.showType);
                $scope.$apply();
            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    $scope.$on('toUpdateTask', function (event, taskId, taskData) {
        $scope.updateTask(taskData);
    });

    $scope.updateTask = function (taskData) {
        // 查找任务是否存在
        formatTaskStatusName(taskData);
        var exist = false;
        for (var i in allTasks) {
            if (allTasks[i].id === taskData.id) {
                // 如果责任人不是当前用户，则从列表中删除
                if (isTodoTask(taskData, username)) {
                    allTasks[i] = taskData;
                } else {
                    allTasks.splice(i, 1);
                }
                exist = true;
                break;
            }
        }
        if (!exist && isTodoTask(taskData, username)) {        // 如果不存在，则加入到最前面
            allTasks.unshift(taskData);
        }
        // allTasks.sort(sortByUpdateTime);
        $scope.changeTaskType(null, $scope.showType);
        $scope.$apply();
    };

    $scope.changeTaskType = function ($event, type) {
        console.log('change type');
        var showTasks = [], task = null, todoCount = 0;

        if (type === 'all') {
            showTasks = allTasks;
        }
        else if (type === 'closed') {
            for (var i in allTasks) {
                task = allTasks[i];
                if (task.stage_id === TaskStatus.Closed) {
                    showTasks.push(task);
                }
            }
        }
        else if (type === 'todo') {
            for (var i in allTasks) {
                task = allTasks[i];
                if (isTodoTask(task, username)) {
                    showTasks.push(task);
                }
            }
            $scope.todoCount = showTasks.length;
        }
        else {
            for (var i in allTasks) {
                task = allTasks[i];
                if (task.stage_id !== TaskStatus.Closed) {
                    showTasks.push(task);
                }
            }
        }
        $scope.tasks = showTasks;
        $scope.showType = type;
    };

    $scope.gotoTaskHistory = function () {
        window.location.href = '/templates/task/task-list.html';
    };

    $scope.toCreateTask = function () {
        // window.location.href = '/templates/task/add-task.html';
        mui('#taskPopover').popover('toggle', document.getElementById('taskAddBtn'));
    };
}]);

app.controller('TaskListCtrl', ['$scope', '$rootScope', 'scrollerService', 'userService', 'ajax', 'UserRole', '$myTranslate', function ($scope, $rootScope, scrollerService, userService, ajax, UserRole, $myTranslate) {
    $scope.TaskStatus = TaskStatus;
    $scope.TaskTypes = TaskTypes;
    $scope.tasks = [];
    $scope.showType = 'all';    // all, open, closed, todo
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;
    var deviceSn = GetQueryString("device_sn");     // 如果设备sn不为空，则获取的是设备的运维记录
    $scope.isDeviceOps = deviceSn ? true : false;
    $scope.pageTitle = deviceSn ? $myTranslate.instant('task.ops.services') : $myTranslate.instant('task.history');
    var role = userService.getUserRole();
    var userAccount = userService.getUser().account;
    var requestFilterParams = null;
    $scope.showFilter = false;
    var defaultFilterItems = [
        {
            key: 'creater',
            items: [{
                id: 'creater_my',
                name: $myTranslate.instant('task.mycreate'),
                value: userAccount
            }],
            userRole: [UserRole.Normal]
        },
        {
            title: $myTranslate.instant('status'),
            key: 'stage',
            items: [{
                id: 'stage_finished',
                name: $myTranslate.instant('finished'),
                value: [TaskStatus.Closed]
            }, {
                id: 'stage_unfinished',
                name: $myTranslate.instant('unfinished'),
                value: [TaskStatus.ToAssign, TaskStatus.ToAccept, TaskStatus.Accepted, TaskStatus.Coming, TaskStatus.Arrived]
            }]
        }, {
            title: $myTranslate.instant('task.source'),
            key: 'source',
            items: [{
                id: 'source_repair',
                name: $myTranslate.instant('task.new'),
                value: TaskSource.Repaire
            }, {
                id: 'source_inspect',
                name: $myTranslate.instant('inspection'),
                value: TaskSource.Inspect
            }, {
                id: 'source_event',
                name: $myTranslate.instant('alarm'),
                value: TaskSource.Event
            }]
        }, {
            title: $myTranslate.instant('type'),
            key: 'task_type',
            items: [{
                id: 'type_xunjian',
                name: $myTranslate.instant('巡检'),
                value: TaskTypes.Xunjian
            }, {
                id: 'type_qiangxiu',
                name: $myTranslate.instant('抢修'),
                value: TaskTypes.Qiangxiu
            }, {
                id: 'type_jianxiu',
                name: $myTranslate.instant('检修'),
                value: TaskTypes.Jianxiu
            }, {
                id: 'type_dts',
                name: $myTranslate.instant('缺陷'),
                value: [TaskTypes.NormalDts, TaskTypes.SeriousDts, TaskTypes.FatalDts]
            }, {
                id: 'type_baoyang',
                name: $myTranslate.instant('保养'),
                value: TaskTypes.Baoyang
            }, {
                id: 'type_other',
                name: $myTranslate.instant('其他'),
                value: [TaskTypes.Other, 12, 13, 14, 15, 16, 17]
            }, {
                id: 'type_security',
                name: $myTranslate.instant('安全评测'),
                value: TaskTypes.Security
            }, {
                id: 'type_poweroff',
                name: $myTranslate.instant('停电维护'),
                value: TaskTypes.Poweroff
            }]
        }
    ];
    $scope.filterItems = [];
    defaultFilterItems.forEach(function (item) {
        if (item.userRole) {
            if (item.userRole.indexOf(role) >= 0) {
                $scope.filterItems.push(item);
            }
        } else {
            $scope.filterItems.push(item);
        }
    });
    $scope.selectedFilter = {};     // 确定选中的
    $scope.tmpSelectedFilter = {};      // 在确定选中前，记录选中状态的

    $scope.toggleFilterItem = function (id) {
        $scope.tmpSelectedFilter[id] = !$scope.tmpSelectedFilter[id];
    };

    $scope.confirmFilter = function () {
        $scope.selectedFilter = $scope.tmpSelectedFilter;
        var filterParams = {};
        $scope.filterItems.forEach(function (group) {
            group.items.forEach(function (item) {
                if ($scope.selectedFilter[item.id]) {
                    var values = filterParams[group.key] || [];
                    if (typeof(item.value) === 'object') {
                        values = values.concat(item.value);
                    } else {
                        values.push(item.value);
                    }
                    filterParams[group.key] = values;
                }
            });
        });
        $scope.toggleFilter(false);
        requestFilterParams = filterParams;
        $scope.getDataList();
    };

    $scope.clearFilter = function () {
        $scope.selectedFilter = {};
        $scope.toggleFilter(false);
        requestFilterParams = null;
        $scope.getDataList();
    };

    $scope.toggleFilter = function (show) {
        if (show === undefined) {
            $scope.showFilter = !$scope.showFilter;
        } else {
            $scope.showFilter = show;
        }
        if ($scope.showFilter) {
            $scope.tmpSelectedFilter = $scope.selectedFilter;
        }
    };

    function sortFunc(d1, d2) {
        // 按更新时间倒叙排列
        if (d1.last_modified_time < d2.last_modified_time) {
            return 1;
        }
        if (d1.last_modified_time > d2.last_modified_time) {
            return -1;
        }
        return 0;
    }

    $scope.getDataList = function (filterParams) {
        scrollerService.initScroll("#taskList", $scope.getDataList);
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        var companyId = userService.getTaskCompanyId();
        var url = "/opstasks?company_id=" + companyId;
        if (deviceSn) {
            url = "/staticdevices/opstasks/" + deviceSn + '?types=' + OpsTaskType.join(',');
        } else if (role === 'USER') {  // 如果是用户的话，所有任务取的是所有站点的任务
            var stationSns = [];
            $scope.sites.map(function (s) {
                if (!s.is_group) {
                    stationSns.push(s.sn);
                }
            });
            url = '/opstasks?station=' + stationSns.join(',');
            // 筛选
        } else if (role === 'OPS_OPERATOR') {
            // 如果是运维工，则显示处理过的所有任务
            url = "/opstasks/history/" + companyId;
        }
        var params = {
            page_size: 100,
            page_index: 0,
            s_echo: 0
        };
        if (requestFilterParams) {
            Object.keys(requestFilterParams).forEach(function (key) {
                params[key] = requestFilterParams[key].join(',');
            });
        }
        ajax.get({
            url: url,
            data: params,
            success: function (result) {
                $scope.isLoading = false;
                var tasks = result.aaData ? result.aaData : result, task = null;
                var currentTime = new Date().Format('yyyy-MM-dd HH:mm');
                for (var i in tasks) {
                    task = tasks[i];
                    formatTaskStatusName(task);
                    // 如果是设备巡检记录的话，处理设备状态
                    if ($scope.isDeviceOps && task.device_record && task.device_record.length) {
                        task.device_record = task.device_record[0];
                    }
                    if (isTodoTask(task, userAccount, role)) {
                        task.isMyself = true;
                    }
                    task.isTimeout = $scope.taskTimeout(task);
                    if (task.expect_complete_time) {
                        task.expect_complete_time = task.expect_complete_time.substring(0, 16);
                    }
                    if (task.finish_time) {
                        task.finish_time = task.finish_time.substring(0, 16);
                    }
                    task.last_modified_time = task.last_modified_time.substring(0, 16);
                    task.isToStart = false; // 任务待启动
                    if (task.riplan_create_time) {
                        task.isToStart = task.create_time.substring(0, 16) > currentTime;
                    }
                    // 统计巡检信息
                    var dtsCount = 0;
                    var resolvedDtsCount = 0;
                    if (task.children_tasks) {
                        dtsCount = task.children_tasks.length;
                        task.children_tasks.forEach(function (t) {
                            if (t.statge_id === TaskStatus.Closed || t.statge_id === TaskStatus.ToClose) {
                                resolvedDtsCount += 1;
                            }
                        });
                    }
                    task.dts_count = dtsCount;
                    task.resolved_dts_count = resolvedDtsCount;
                }
                tasks.sort(sortFunc);
                $scope.tasks = tasks;
                $scope.$apply();
            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    $scope.$on('toUpdateTask', function (event, taskId, taskData) {
        $scope.updateTask(taskData);
    });

    $scope.updateTask = function (taskData) {
        // 查找任务是否存在
        var exist = false;
        for (var i in $scope.tasks) {
            if ($scope.tasks[i].id === taskData.id) {
                $scope.tasks[i] = taskData;
                exist = true;
                break;
            }
        }
        if (!exist) {        // 如果不存在，则加入到最前面
            $scope.tasks.unshift(taskData);
        }
        // $scope.tasks.sort(sortFunc);
        $scope.$apply();
    };

    $scope.toCreateTask = function () {
        mui('#taskPopover').popover('toggle', document.getElementById('taskAddBtn'));
    };

    if (role !== 'USER') {
        $scope.getDataList();
    }
}]);

function updateAfterGrab(strArgs) {     // 在任务详情页抢单后，需要将任务从主页中删除
    var taskData = JSON.parse(strArgs);
    // 更新到“抢单”
    var scope = angular.element('div[ng-controller="CompetitionTaskListCtrl"]').scope();
    scope.afterGrabTask(taskData);
}

function notifyPrevPageToUpdateTask(taskData) {
    var data = $.extend({}, taskData);
    if (data.device_record) {
        delete data.device_record;
    }
    if (data.events) {
        delete data.events;
    }
    window.android && window.android.onJsCallbackForPrevPage('updateTask', JSON.stringify(data));

}

function updateTask(strArgs) {  // json格式的参数， {data: taskData}
    var taskData = JSON.parse(strArgs);
    // 更新到“我的待办”
    var scope = angular.element('#taskListWrapper').scope();
    formatTaskStatusName(taskData);
    if (scope) {
        scope.updateTask && scope.updateTask(taskData);
    }
    // 更新"抢单"
    var competitionTaskWrapper = angular.element('#competitionTaskListWrapper');
    if (competitionTaskWrapper) {
        var scope2 = competitionTaskWrapper.scope();
        if (scope2) {
            scope2.afterGrabTask && scope2.afterGrabTask(taskData);
        }
    }
}

function setTaskReportId(reportId) {        // 安全检测和停电维护新建后返回到任务详情页时，设置任务的report_id
    var scope = angular.element('#taskDetail').scope();
    scope.setReportId(reportId);
}

function onAndroidCb_updateDeviceRecord(strRecord) {
    // 从巡检任务创建的缺陷单回到巡检任务时，需要更新巡检的设备状态
    if (strRecord) {
        var scope = angular.element('#xunjianTaskDevices').scope();
        if (scope) {
            scope.updateDeviceRecordWidthDts(JSON.parse(strRecord));
        }
    }
}

app.controller('TaskDetailCtrl', ['$scope', '$state', 'userService', 'platformService', '$window', 'ajax', 'routerService', '$myTranslate', '$stateParams',
    function ($scope, $state, userService, platformService, $window, ajax, routerService, $myTranslate, $stateParams) {
    $scope.TaskAction = TaskAction;
    $scope.TaskStatus = TaskStatus;
    $scope.TaskSource = TaskSource;
    $scope.TaskTypes = TaskTypes;
    $scope.history = [];
    $scope.lastHistory = null;
    $scope.checkedDeviceCount = 0;      // 已检设备数
    $scope.exceptionDeviceCount = 0;    // 异常设备数
    $scope.xunjianStage = '';
    $scope.host = platformService.getCloudHost();
    $scope.updateRecordsVisible = false;    // 是否显示操作历史
    $scope.requestPictures = null;        // 报修前图片
    $scope.createRecord = null;
    $scope.handleResult = null;           // 维修结果，{desp: '', picture_list: []}
    $scope.inspectUploadImages = [];        // 巡检签到的照片
    var userRole = userService.getUserRole();
    var taskType = $stateParams.taskType; // GetQueryString("taskType");
    if (taskType) {
        taskType = parseInt(taskType);
    }
    var translateName = 'task.order ';
    if (DtsTaskType.indexOf(taskType) >= 0) {
        translateName = 'defect ';
    } else if (taskType === TaskTypes.Xunjian) {
        translateName = 'inspection ';
    } else if (taskType === TaskTypes.HiddenDanger) {
        translateName = 'hiddenDanger ';
    }
    $scope.taskName = $myTranslate.instant(translateName);
    var companyId = userService.getCompanyId(); // 用户所在公司，运维公司或用户公司
    var opsCompanyId = null;            // 任务所在运维公司

    var id = $stateParams.id; //GetQueryString('id')
    var username = userService.username;
    $scope.taskData = {};
    $scope.taskComment = null;
    var commentActionIndex = -1;     //
    $scope.description = null;
    $scope.canHandle = false;   // 是否有编辑权限
    $scope.files = [];
    $scope.canDelete = false;
    $scope.distance = "";
    $scope.toAcceptUsers = [];          // 接单时，可选的运维工账号
    $scope.toTransferUsers = [];        // 转单时，可选的运维工账号
    $scope.teams = [];      // 运维班组和用户
    $scope.assignPickerVisible = false;     // 是否显示指派的对话框
    $scope.acceptPickerVisible = false;     // 是否显示接单时的对话框，可用于选择一起接单的维修工
    $scope.transferPickerVisible = false;     // 是否显示转单时的对话框，可用于选择一起接单的维修工
    $scope.recheckResult = null; // 复测结果
    $scope.taskDetailVisible = false; // 工单详情是否显示，缺陷单可用
    $scope.canEdit = false; // 是否可以编辑
    $scope.isSubmitting = false; // 正在提交动作
    var map = null, stationLongitude, stationLatitude;
    var innerPageQuery = null, historyState = [];    // 浏览器历史状态
    $scope.actions = [];

    var userAccount = userService.getUser().account;

    function getTaskDetail() {

        var option = {
            url: '/opstasks/' + companyId + '/' + id,
            success: function (data) {
                opsCompanyId = data.company_id;
                updateTaskInfo(data);
                taskCanEdit(data);
                // 如果是抢单任务，需要读取同组内其他人的信息，以便接单时选择其他人协助
                if (data.operator_team && !data.current_handler) {
                    ajax.get({
                        url: '/OpsTeams/' + data.operator_team + '?with_user=true&with_permission=false',
                        success: function (res) {
                            $scope.toAcceptUsers = [];
                            res.users.forEach(function (user) {
                                if (user.account != userAccount) {
                                    $scope.toAcceptUsers.push(user);
                                }
                            });
                        }
                    });
                }
                getTaskHistory();
                getAvailableActions(data);
                if (data.stage_id === TaskStatus.Closed) {
                    ajax.get({
                        url: '/opstasks/' + id + '/comments',       // 获取工单评价
                        success: function (res) {
                            if (res && res.length) {
                                $scope.taskComment = res[0];
                                if ($scope.taskComment.pictures) {
                                    var pictureList = [];
                                    $scope.taskComment.picture_list = $scope.taskComment.pictures.split(',');
                                }
                                $scope.$apply();
                            }
                        }
                    });
                }
            },
            error: function (a, b, c) {
                $.notify.error('get data failed');
            }
        };
        ajax.get(option);
    }

    function getAvailableActions(task) {
        // 获取用户当前可执行的操作
        ajax.get({
            url: '/opstasks/' + companyId + '/' + task.id + '/action_candidates',
            success: function (res) {
                var actions = [];
                var actionIdSort = [TaskAction.Grab, TaskAction.Assign, TaskAction.Accept, TaskAction.Transfer, TaskAction.Refuse,
                    TaskAction.Go, TaskAction.Arrive, TaskAction.Update, TaskAction.Apply, TaskAction.Close, TaskAction.Cancel];
                res.forEach(function (action, i) {
                    var obj = TaskActionName[action.id];
                    var name = action.name;
                    var color = obj.color;
                    if (action.id === TaskAction.Update && task.task_type_id === TaskTypes.Xunjian) {
                        name = $myTranslate.instant('task.action.checkdevice');
                    }
                    actions.push({
                        id: action.id,
                        name: name,
                        color: color
                    });
                });
                // 按actionIdSort的顺序对action进行排序
                actions.sort(function (a1, a2) {
                    var index1 = actionIdSort.indexOf(a1.id);
                    var index2 = actionIdSort.indexOf(a2.id);
                    return index1 - index2;
                });
                $scope.actions = actions;
                $scope.$apply();
            }
        });
    }

    function taskCanEdit(taskData) {
        // 未关闭跌缺陷单，管理员有权限编辑
        if (userRole === UserRole.OpsAdmin && taskData.is_defect && (taskData.stage_id !== TaskStatus.ToClose && taskData.stage_id !== TaskStatus.Closed)) {
            $scope.canEdit = true;
        } else {
            $scope.canEdit = false;
        }
    }

    getTaskDetail();

    $scope.onToggleUpdateRecord = function () {
        $scope.updateRecordsVisible = !$scope.updateRecordsVisible;
    };

    function updateTaskInfo(data) {
        $scope.taskData = formatTaskStatusName(data);
        $scope.taskData.expect_complete_time = data.expect_complete_time ? data.expect_complete_time.substring(0, 16) : '';
        $scope.taskData.isToStart = $scope.taskData.create_time.substring(0, 16) > new Date().Format('yyyy-MM-dd HH:mm');      // 任务待开始
        data.is_closed = data.stage_id === TaskStatus.ToClose || data.stage_id === TaskStatus.Closed;
        // 如果是待接单状态，则需要设置接单时需要选择的其他运维工的账号
        if ($scope.taskData.stage_id === TaskStatus.ToAccept) {
            $scope.toAcceptUsers = [];
            $scope.taskData.current_handler_users.forEach(function (user) {
                if (user.account !== userAccount) { // 除掉自身
                    $scope.toAcceptUsers.push(user);
                }
            });
        }
        $scope.$apply();
        stationLongitude = data.station_longitude;
        stationLatitude = data.station_latitude;
        // if (data.stage_id === TaskStatus.Competition && data.station_latitude && data.station_longitude) {
        //     drawMap($scope.taskData);
        // }
        formatTaskStatus();
        // if (DtsTaskType.indexOf(data.task_type_id) >= 0) {
        //     $scope.taskName = '缺陷';
        // } else if (data.source === TaskSource.Inspect) {
        //     $scope.taskName = '巡检';
        // } else {
        //     $scope.taskName = '报修';
        // }
        // $scope.taskName = data.source_name;
    }

    function drawMap(taskData) {
        if (!map) {
            map = new BMap.Map("map");
        }          // 创建地图实例
        // 导航
        var driving = new BMap.DrivingRoute(map, {
            renderOptions: {
                map: map,
                panel: "results",
                autoViewport: true
            },
            onSearchComplete: function (result) {
                if (result) {
                    $scope.distance = result.getPlan(0).getDistance();
                    $scope.$apply();
                }
            }
        });
        var end = new BMap.Point(stationLongitude, stationLatitude);
        map.centerAndZoom(end, 12);
        map.enableScrollWheelZoom();
        var marker = new BMap.Marker(end);
        var mgr = new BMapLib.MarkerManager(map, {
            maxZoom: 15,
            trackMarkers: true
        });
        mgr.addMarker(marker, 1, 15);
        mgr.showMarkers();

    }

    function formatTaskStatus() {   // 将任务状态转成适合页面显示的格式
        var taskData = $scope.taskData, stageId = taskData.stage_id, activeIndex = 0, finishIndex = 0, progress = 0,
            canHandle = false;
        if (isTodoTask(taskData, username) && [TaskStatus.Competition, TaskStatus.ToAccept, TaskStatus.Coming, TaskStatus.Accepted].indexOf(stageId) < 0) {
            canHandle = true;
        }
        switch (stageId) {
            case TaskStatus.Coming:
                progress = 18;
                break;
            case TaskStatus.Arrived:
                progress = 33;
                activeIndex = 1;
                break;
            case TaskStatus.Update:
                break;
            case TaskStatus.ToClose:
                activeIndex = 2;
                finishIndex = 1;
                progress = 66;
                break;
            case TaskStatus.Closed:
                activeIndex = 3;
                finishIndex = 3;
                progress = 100;
                break;
        }
        taskData.activeIndex = activeIndex;
        taskData.finishIndex = finishIndex;
        taskData.progress = progress + '%';
        $scope.canHandle = isTodoTask(taskData, username) && canHandle;

        $scope.recountCheckedDevices();
        // 设置巡检的阶段
        $scope.xunjianStage = '';
        if (taskData.task_type_id === TaskTypes.Xunjian) {
            switch (stageId) {
                case TaskStatus.Arrived:
                    $scope.xunjianStage = 'toHandle';
                    break;
                case TaskStatus.ToClose:
                case TaskStatus.Closed:
                    $scope.xunjianStage = 'toClose';
                    break;
                default:
                    $scope.xunjianStage = 'toStart';
            }
            taskData.dts_count = taskData.children_tasks ? taskData.children_tasks.length : 0;
            var resolved_dts_count = 0;
            if (taskData.children_tasks) {
                taskData.children_tasks.forEach(function (t) {
                    if (t.stage_id === TaskStatus.ToClose || t.stage_id === TaskStatus.Closed) {
                        resolved_dts_count += 1;
                    }
                })
            }
            taskData.resolved_dts_count = resolved_dts_count;
        }
        return taskData;
    }

    function formatActions(historyList) {      // 将操作历史格式化成界面显示
        var formattedList = [], taskData = $scope.taskData;
        var record = null;
        var handleResult = null;
        var recheckResult = null;
        for (var i = 0; i < historyList.length; i++) {
            record = historyList[i];
            formattedList.push(record);
            if (record.picture_list && record.picture_list.length) {
                var pictures = [];
                record.picture_list.forEach(function (url) {
                    pictures.push(platformService.getCloudHost() + url);
                });
                record.picture_list = pictures;
            }
            // 记录工单的报修图片和维修结果
            if (!handleResult && record.action_id === TaskAction.Update) {
                handleResult = record;
                $scope.handleResult = record;
            }
            if (!$scope.requestPictures && record.action_id === TaskAction.Create) {
                $scope.requestPictures = record.picture_list;
                $scope.createRecord = record;
            }
            if (!recheckResult && record.action_id === TaskAction.RECHECK) {
                recheckResult = record;
            }
        }
        $scope.handleResult = handleResult;
        $scope.recheckResult = recheckResult;
        $scope.history = formattedList;
        if (taskData.stage_id === TaskStatus.ToAccept || taskData.stage_id === TaskStatus.ToAssign) {
            setTimeout(initMembers, 200);
        }
    }

    $scope.postAction = function (actionType, description, images, cb) {
        $scope.isSubmitting = true;
        $scope.commonPostAction(id, actionType, description, images, function (data) {
            refreshAfterPostAction(data);
            cb && cb(data);
            $scope.isSubmitting = false;
        });
    };

    $scope.postActionWithParams = function (actionType, params, cb) {
        $scope.isSubmitting = true;
        $scope.commonPostActionWithParams(id, actionType, params, function (data) {
            refreshAfterPostAction(data);
            cb && cb(data);
            $scope.isSubmitting = false;
        });
    };

    $scope.gotoEditPage = function () {     // 打开编辑页
        routerService.openPage($scope, '/templates/dts/dts-edit.html', {
            task: $scope.taskData
        });
    };

    function getTaskHistory() {
        ajax.get({
            url: '/opstasks/' + id + '/update_records',
            success: function (data) {
                console.log('get task history success');
                var history = data;
                if (data.length) {
                    $scope.lastHistory = history[0];
                }
                formatActions(history);
                $scope.$apply();
            },
            error: function (e) {
                $.notify.error('读取数据失败');
            }
        });
    }

    $scope.setReportId = function (reportId) {
        $scope.taskData.report_id = reportId;
    };

    $scope.onToggleTaskDetail = function () {
        $scope.taskDetailVisible = !$scope.taskDetailVisible;
    };

    $scope.gotoHandleTask = function () {       // 根据任务类型打开对应的操作界面
        var reportId = $scope.taskData.report_id;
        switch ($scope.taskData.task_type_id) {
            case TaskTypes.Security:     // 安全检测任务
                if (reportId) {
                    $state.go('task.securityRecord', {id: reportId});
                } else {
                    routerService.openPage($scope, '/templates/evaluate/security-evaluate-first-classify.html',
                        {isCreate: true, stationSn: $scope.taskData.station_sn,
                        stationName: $scope.taskData.station_name, taskId: $scope.taskData.id});
                }
                break;
            case TaskTypes.Poweroff:     // 停电维护任务
                if (reportId) {
                    routerService.openPage($scope, '/templates/maintenance-check/check-one-record-home.html', {id: reportId});
                } else {
                    routerService.openPage($scope, '/templates/maintenance-check/check-one-record-home.html',
                        {isCreate: true, stationSn: $scope.taskData.station_sn, stationName: $scope.taskData.station_name, taskId: $scope.taskData.id});
                }
                break;
            default:
                routerService.openPage($scope, '/templates/task/task-handle-update.html');
        }
    };

    $scope.getUserHeadImage = function (user) {
        if (!user || !user.photo_data) {
            return '/img/default_head.jpg';
        }
        return platformService.getAuthHost() + "/tmp" + user.photo_name;
    };

    $scope.taskHandler = {
        execute: function (actionId) {
            switch (actionId) {
                case TaskAction.Grab:
                    this.grabTask();
                    break;
                case TaskAction.Cancel:
                    this.cancelTask();
                    break;
                case TaskAction.Assign:
                    this.assignHandlers();
                    break;
                case TaskAction.Transfer:
                    this.transferHandler();
                    break;
                case TaskAction.Accept:
                    this.acceptTaskAssign();
                    break;
                case TaskAction.Refuse:
                    this.refuseTaskAssign();
                    break;
                case TaskAction.Go:
                    this.gotoSpot();
                    break;
                case TaskAction.Arrive:
                    this.setArrived();
                    break;
                case TaskAction.Update:
                    if ($scope.taskData.task_type_id === TaskTypes.Xunjian) {
                        $scope.gotoDeviceHandlerPage();
                    } else {
                        $scope.gotoHandleTask();
                    }
                    break;
                case TaskAction.Apply:
                    this.requestTaskComplete();
                    break;
                case TaskAction.Reject:
                    this.rejectApply();
                    break;
                case TaskAction.Close:
                    this.closeTask();
                    break;
                case TaskAction.Comment:        // 评价
                    this.commentTask();
                    break;
                case TaskAction.RECHECK:   // 复测
                    this.startRecheck();
                    break;
                default:
                    break;
            }
        },
        grabTask: function () {         // 抢单，抢单时可以选择其他人协助
            $scope.acceptPickerVisible = !$scope.acceptPickerVisible;
        },
        cancelTask: function () {       // 撤单
            var btnArray = [$myTranslate.instant('cancel'), $myTranslate.instant('confirm')];
            mui.prompt($myTranslate.instant('task.tip.reason.revoke'), '', $myTranslate.instant('revoke thisorder'), btnArray, function (e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Cancel, e.value);
                }
            });
        },
        assignHandlers: function () {       // 指定责任人
            if ([TaskTypes.NormalDts, TaskTypes.FatalDts, TaskTypes.SeriousDts].indexOf($scope.taskData.task_type_id) >= 0) { // 缺陷
                routerService.openPage($scope, '/templates/task/task-assign-modal.html', {
                    task: $scope.taskData,
                    teams: $scope.teams,
                    onSuccess: function (data) {
                        $scope.recheckResult = data;
                        if (comment.pictures) {
                            var pictureList = [];
                            data.pictures.split(',').forEach(function (url) {
                                pictureList.push(platformService.getCloudHost() + url);
                            });
                            $scope.recheckResult.picture_list = pictureList;
                        }
                        $scope.$apply();
                    }
                });
            } else { // 非缺陷
                $scope.assignPickerVisible = !$scope.assignPickerVisible;
            }
        },
        transferHandler: function () {      // 转单
            $scope.transferPickerVisible = !$scope.transferPickerVisible;
        },
        acceptTaskAssign: function () {     // 接受任务
            if ($scope.taskData.current_handler_users.length > 1) {
                // 如果责任人大于1个，需要接单的人确认是否其他人一起接单
                $scope.acceptPickerVisible = !$scope.acceptPickerVisible;
            } else {
                // 如果只有一个，则直接确认
                var btnArray = [$myTranslate.instant('cancel'), $myTranslate.instant('confirm')];
                mui.confirm($myTranslate.instant('task.tip.desp.accept'), $myTranslate.instant("accept thisorder"), btnArray, function (e) {
                    if (e.index === 1) {     // 是
                        $scope.onAccept([]);
                    }
                });
            }
        },
        refuseTaskAssign: function () {     // 拒绝任务分配
            var btnArray = [$myTranslate.instant('cancel'), $myTranslate.instant('refuse')];
            mui.prompt($myTranslate.instant('task.tip.reason.refuse'), '', $myTranslate.instant('refuse thisorder') + "?", btnArray, function (e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Refuse, e.value);
                }
            });
        },
        gotoSpot: function () {     // 去现场
            if ($scope.taskData.isToStart) {
                // 任务待开始，无法操作
                $.notify.toast($myTranslate.instant('task.action.setoff.nostart'));
            } else {
                $scope.postAction(TaskAction.Go);
            }
        },
        setArrived: function () {   // 已到达
            $scope.checkActuallyArrived($scope.taskData.id, stationLongitude, stationLatitude, function (taskId, action) {
                $scope.postAction(action);
            });
        },
        showHandlePage: function (query, actionIndex) {        // 打开任务处理页面
            var $page = $(query);
            $page.attr('class', 'inner-page down-to-up');
            commentActionIndex = actionIndex;
            innerPageQuery = query;
        },
        requestTaskComplete: function () {     // 请求关闭任务
            var btnArray = [$myTranslate.instant('cancel'), $myTranslate.instant('confirm')];
            // 如果是巡检任务，检查设备检查情况，如果设备检查没有完成，提示用户
            var description = $myTranslate.instant('task.action.report.desp2');
            var title = $myTranslate.instant('task.action.report.desp');
            if ($scope.taskData.task_type_id === TaskTypes.Xunjian && $scope.checkedDeviceCount < $scope.taskData.device_record.length) {
                description = $myTranslate.instant('inspect.tip.report.notcomplete');
            }
            mui.confirm(description, title, btnArray, function (e) {
                if (e.index === 1) {     // 是
                    // 如果用户提交了签到照片，则需要先提交一次更新记录，再提交审核
                    if ($scope.inspectUploadImages && $scope.inspectUploadImages.length) {
                        $scope.postAction(TaskAction.Update, null, $scope.inspectUploadImages, function () {
                            $scope.postAction(TaskAction.Apply, $myTranslate.instant('task.action.report.desp'));
                        });
                    } else {
                        $scope.postAction(TaskAction.Apply, $myTranslate.instant('task.action.report.desp'));
                    }

                }
            });
        },
        rejectApply: function () {
            var btnArray = [$myTranslate.instant('cancel'), $myTranslate.instant('reject')];
            mui.prompt($myTranslate.instant('task.tip.reason.reject'), '', $myTranslate.instant('task.tip.desp.reject'), btnArray, function (e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Reject, e.value);
                }
            });
        },
        closeTask: function () {        // 关闭任务
            var btnArray = [$myTranslate.instant('cancel'), $myTranslate.instant('close task.order')];
            mui.confirm($myTranslate.instant('task.action.close.desp'), $myTranslate.instant('close thisorder'), btnArray, function (e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Close, $myTranslate.instant('close thisorder'));
                }
            });
        },
        commentTask: function () {      // 评价任务
            routerService.openPage($scope, '/templates/task/task-comment-modal.html', {
                taskId: id,
                comment: $scope.taskComment || {},
                onSuccess: function (comment) {
                    $scope.taskComment = comment;
                    if (comment.pictures) {
                        var pictureList = [];
                        comment.pictures.split(',').forEach(function (url) {
                            pictureList.push(platformService.getCloudHost() + url);
                        });
                        $scope.taskComment.picture_list = pictureList;
                    }
                    $scope.$apply();
                }
            });
        },
        startRecheck: function () {     // 复测
            routerService.openPage($scope, '/templates/task/task-recheck-modal.html', {
                taskId: id,
                onSuccess: function (data) {
                    $scope.recheckResult = data;
                    if (comment.pictures) {
                        var pictureList = [];
                        data.pictures.split(',').forEach(function (url) {
                            pictureList.push(platformService.getCloudHost() + url);
                        });
                        $scope.recheckResult.picture_list = pictureList;
                    }
                    $scope.$apply();
                }
            });
        }
    };

    $scope.getScoreDesp = function () {
        switch ($scope.taskComment.score) {
            case 1:
                return $myTranslate.instant("terrible");
            case 2:
                return $myTranslate.instant('bad');
            case 3:
                return $myTranslate.instant('normal');
            case 4:
                return $myTranslate.instant('good');
            case 5:
                return $myTranslate.instant('excellent');
            default:
                return '';
        }
    };

    $scope.afterGrabTask = function (taskData) {        // 抢单成功后的回调
        // $scope.taskData = taskData;

        updateTaskInfo(taskData);
        $scope.$apply();
        // 调用Android接口
        window.android && window.android.onJsCallbackForPrevPage('updateAfterGrab', JSON.stringify(taskData));
    };

    $scope.openMap = function () {
        location.href = '/templates/map.html?id=' + $scope.taskData.id + '&name=' + $scope.taskData.station_name + '&stationSn=' + $scope.taskData.station_sn;
    };

    $scope.gotoDeviceHandlerPage = function () {
        // 打开设备列表页
        $state.go('.inspectDevices', {
            taskData: $scope.taskData,
            canEdit: $scope.canHandle && $scope.taskData.stage_id === TaskStatus.Arrived,
            recountFunc: $scope.recountCheckedDevices
        });
    };

    $scope.gotoStaticDeviceDetail = function (device) {
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {
            device_id: device.id,
            device_sn: device.sn
        });
    };

    function initMembers() {

        ajax.get({
            url: '/OpsTeams?company_id=' + opsCompanyId + '&with_user=true&with_permission=false',
            success: function (data) {
                $scope.teams = data;
                if ($scope.taskData.stage_id === TaskStatus.ToAccept) {
                    $scope.toTransferUsers = [];
                    var teamId = $scope.taskData.operator_team;
                    // 可转单的人范围：任务当前运维班组，除自己以外的人
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].id === teamId) {
                            data[i].users.forEach(function (user) {
                                if (user.account !== userAccount) {
                                    $scope.toTransferUsers.push(user);
                                }
                            });
                            break;
                        }
                    }
                    $scope.$apply();
                }
            }
        });
    }

    $scope.onGrabTask = function (users) {
        // 确认抢单
        var accounts = [];
        users.forEach(function (user) {
            accounts.push(user.account);
        });
        var param = {
            transfer_user: accounts.join(',')
        };
        $scope.commonPostActionWithParams($scope.taskData.id, TaskAction.Grab, param, function (data) {
            refreshAfterPostAction(data);
            $scope.acceptPickerVisible = false;
            $scope.$apply();
        });
    };

    $scope.onAssignHandlers = function (team, users) {
        // 指派维修工
        var accounts = [];
        users.forEach(function (user) {
            accounts.push(user.account);
        });
        var param = {
            operator_team: team.id,
            transfer_user: accounts.join(',')
        };
        $scope.commonPostActionWithParams($scope.taskData.id, TaskAction.Assign, param, function (data) {
            refreshAfterPostAction(data);
            $scope.assignPickerVisible = false;
            $scope.$apply();
        });
    };

    $scope.onTransferUsers = function (users) {
        // 转单
        var accounts = [];
        users.forEach(function (user) {
            accounts.push(user.account);
        });
        var param = {
            transfer_user: accounts.join(',')
        };
        $scope.commonPostActionWithParams($scope.taskData.id, TaskAction.Transfer, param, function (data) {
            refreshAfterPostAction(data);
            $scope.transferPickerVisible = false;
            $scope.$apply();
        });
    };

    $scope.onAccept = function (users) {
        // 接单，users为自己以外的其他人
        var accounts = [userService.getUser().account];     // 默认是自己
        if (users && users.length) {
            users.forEach(function (user) {
                accounts.push(user.account);
            });
        }
        var param = {
            transfer_user: accounts.join(',')
        };
        $scope.commonPostActionWithParams($scope.taskData.id, TaskAction.Accept, param, function (data) {
            refreshAfterPostAction(data);
            $scope.acceptPickerVisible = false;
            $scope.$apply();
        });
    };

    function refreshAfterPostAction(data) {
        // 提交完操作后，更新数据及页面，data为post action的应答，即最新的task信息
        $scope.taskData = formatTaskStatusName(data);
        taskCanEdit($scope.taskData);
        // 调用Android接口
        notifyPrevPageToUpdateTask(data);
        formatTaskStatus();
        getAvailableActions(data);
        getTaskHistory();
        // 如果是待接单状态，则需要设置接单时需要选择的其他运维工的账号
        if ($scope.taskData.stage_id === TaskStatus.ToAccept) {
            $scope.toAcceptUsers = [];
            $scope.taskData.current_handler_users.forEach(function (user) {
                if (user.account !== userAccount) { // 除掉自身
                    $scope.toAcceptUsers.push(user);
                }
            });
        }
    }

    $scope.recountCheckedDevices = function () {
        // 重新计算已检查的设备数
        var checkedCount = 0;
        var exceptionCount = 0;
        if ($scope.taskData.device_record) {
            $scope.taskData.device_record.forEach(function (r) {
                if (r.status) {
                    if (r.status === '2') {
                        exceptionCount += 1;
                    }
                    checkedCount += 1;
                }
            });
        }
        $scope.checkedDeviceCount = checkedCount;
        $scope.exceptionDeviceCount = exceptionCount;
    };

    $scope.$on('deviceStatusChange', function (event, deviceSns, status) {
        // 重新计算已检查的设备数
        var checkedCount = 0;
        var exceptionCount = 0;
        if ($scope.taskData.device_record) {
            $scope.taskData.device_record.forEach(function (r) {
                if (deviceSns.indexOf(r.device_sn) >= 0) {
                    r.status = status;
                }
                if (r.status) {
                    if (r.status === '2') {
                        exceptionCount += 1;
                    }
                    checkedCount += 1;
                }
            });
        }
        $scope.checkedDeviceCount = checkedCount;
        $scope.exceptionDeviceCount = exceptionCount;
    });

    $scope.gotoDevice = function (deviceData) {
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {
            device_sn: deviceData.device_sn,
            disableEdit: true
        });
    };
}]);


// 工单指派、缺陷单修改公共页面的控制器
app.controller('CommonTaskEditAssignCtrl', ['$scope', '$timeout', 'ajax', function ($scope, $timeout, ajax) {
    var task = $scope.task;
    $scope.showRecheck = gShowRecheck;
    $scope.isDefect = task.is_defect;
    $scope.expectTime = task.expect_complete_time ? task.expect_complete_time.substring(0, 10) : null;
    $scope.taskType = {
        id: task.task_type_id,
        name: task.task_type_name
    };
    $scope.selectedTeam = null;
    $scope.selectedTeamUsers = []; // 所选的分组的所有运维工
    $scope.selectedUsers = []; // 如果是待指派，则维修人为
    $scope.teamVisible = false; // 显示分组选择
    $scope.handlerVisible = false;  // 显示用户选择
    if (task.stage_id !== TaskStatus.ToAssign) {
        if (task.operator_team) {
            $scope.selectedTeam = {
                id: task.operator_team,
                name: task.operator_team_name
            };
            $scope.selectedUsers = task.current_handler_users;
        }
    }

    // 复测班组和人员选择
    $scope.selectedRecheckTeam = task.recheck_team ? {
        id: task.recheck_team,
        name: task.recheck_team_name
    } : null;
    $scope.selectedRecheckTeamUsers = [];
    $scope.selectedRecheckUsers = task.recheck_team ? task.recheck_users : [];
    $scope.recheckTeamVisible = false;
    $scope.recheckHandlerVisible = false;

    $scope.teamInited = false;
    $scope.error = {
        team: false,
        handler: false,
        recheckTeam: false,
        recheckHandler: true,
        time: false,
    };

    var taskTypePicker = null;
    var dtPicker = null;

    function init() {
        $timeout(function () {
            initDatePicker();
            initTaskTypeList();

            ajax.get({
                url: '/OpsTeams?company_id=' + task.company_id + '&with_user=true',
                success: function (data) {
                    $scope.teams = data;
                    if ($scope.selectedTeam) {
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].id === $scope.selectedTeam.id) {
                                $scope.selectedTeamUsers = data[i].users;
                                break;
                            }
                        }
                    }
                    if ($scope.selectedRecheckTeam) {
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].id === $scope.selectedRecheckTeam.id) {
                                $scope.selectedRecheckTeamUsers = data[i].users;
                                break;
                            }
                        }
                    }
                    $scope.teamInited = true;
                }
            });
        }, 500);
    }

    init();

    function initDatePicker() {
        document.getElementById('expectedTime1').addEventListener('tap', function () {
            if (dtPicker) {
                dtPicker.show(function (rs) {
                    // 如果所选日期为今天，且已经是晚上18:00以后，则时间设置为23:59:59
                    $scope.expectTime = rs.text;
                    $scope.error.time = false;
                    $scope.$apply();
                    checkRequire();
                })
            } else {
                var options = {type: 'date', beginDate: new Date()};
                dtPicker = new mui.DtPicker(options);
                dtPicker.show(function (rs) {
                    $scope.expectTime = rs.text;
                    $scope.error.time = false;
                    $scope.$apply();
                    checkRequire();
                });
            }
        }, false);
    }

    function initTaskTypeList() {
        ajax.get({
            url: '/opstasks/task_types',
            success: function (data) {
                if(data && data.length  > 0){
                    var taskTypes = [];
                    data.forEach(item=>{
                        if(String(item.id) === '8' || String(item.id) === '9' || String(item.id) === '10'){
                            taskTypes.push({
                                value: item.id,
                                text: item.name
                            })
                        }
                    })
                    var taskTypeButton = document.getElementById('taskTypePicker');
                    if (taskTypeButton) {
                        taskTypePicker = new mui.PopPicker();
                        taskTypePicker.setData(taskTypes);
                        taskTypePicker.pickers[0].setSelectedIndex(task.task_type_id - 8); // 默认选中
                        taskTypeButton.addEventListener('click', function (event) {
                            taskTypePicker.show(function (items) {
                                $scope.taskType = {
                                    id: items[0].value,
                                    name: items[0].text
                                };
                                $scope.$apply();
                            });
                        }, false);
                    }
                }
            }
        })
    }

    // 必填项是否都已填上
    function checkRequire(){
        if($scope.expectTime && $scope.selectedUsers && $scope.selectedUsers.length > 0 &&  $scope.selectedTeam){
            document.getElementById('dtsEditSubmitBtn').classList.remove('mui-active');
        }
    }

    $scope.toggleTeamSelector = function () {
        $scope.teamVisible = !$scope.teamVisible;
    };

    $scope.toggleHandlerSelector = function () {
        $scope.handlerVisible = !$scope.handlerVisible;
    };

    $scope.onSelectedTeam = function (team) {
        if (team) {
            if ($scope.selectedTeam && $scope.selectedTeam.id !== team.id) {
                $scope.selectedUsers = [];
            }
            $scope.selectedTeam = team;
            $scope.selectedTeamUsers = team.users;
        } else {
            $scope.selectedTeam = null;
            $scope.selectedTeamUsers = [];
            $scope.selectedUsers = [];
        }
        // $scope.toggleTeamSelector();
        $scope.error.team = false;
        checkRequire();
    };

    $scope.onSelectedUsers = function (users) {
        $scope.selectedUsers = users;
        // $scope.toggleHandlerSelector();
        $scope.error.handler = false;
        checkRequire();
    };

    // 复测班组、人员选择
    $scope.toggleRecheckTeamSelector = function () {
        $scope.recheckTeamVisible = !$scope.recheckTeamVisible;
    };

    $scope.toggleRecheckHandlerSelector = function () {
        $scope.recheckHandlerVisible = !$scope.recheckHandlerVisible;
    };

    $scope.onSelectedRecheckTeam = function (team) {
        if (team) {
            if ($scope.selectedRecheckTeam && $scope.selectedRecheckTeam.id !== team.id) {
                $scope.selectedRecheckUsers = []; // 清除原来的选择
            }
            $scope.selectedRecheckTeam = team;
            $scope.selectedRecheckTeamUsers = team.users;
        } else {
            $scope.selectedRecheckTeam = null;
            $scope.selectedRecheckTeamUsers = [];
            $scope.selectedRecheckUsers = []; // 清楚原来的选择
        }
        // $scope.toggleRecheckTeamSelector();
        $scope.error.recheckTeam = false;
    };

    $scope.onSelectedRecheckUsers = function (users) {
        $scope.selectedRecheckUsers = users;
        // $scope.toggleRecheckHandlerSelector();
        if (!users || !users.length) {
            $scope.error.recheckHandler = true;
        } else {
            $scope.error.recheckHandler = false;
        }
    };

    $scope.callPhone = function (phone) {
        if (phone && window.android && window.android.callPhone) {
            window.android.callPhone(phone);
        }
    };

    $scope.cancel = function () {
        window.history.back();
    };

    $scope.submitAndBack = function () {   //上传描述和图片
        $scope.error = {
            team: $scope.selectedTeam === null,
            handler: $scope.selectedUsers.length === 0,
            time: $scope.expectTime === null,
        };
        if ($scope.error.team || $scope.error.handler || $scope.error.time) {
            return;
        }
        var handlers = [];
        $scope.selectedUsers.forEach(function (user) {
            handlers.push(user.account);
        });
        var params = {
            transfer_user: handlers.join(','),
            operator_team: $scope.selectedTeam.id,
            expect_complete_time: $scope.expectTime + ' 20:00:00'
        };
        var recheckAccount = [];
        if ($scope.selectedRecheckUsers && $scope.selectedRecheckUsers.length) {
            $scope.selectedRecheckUsers.forEach(function (user) {
                recheckAccount.push(user.account)
            });
            params.recheck_team = $scope.selectedRecheckTeam.id;
            params.recheck_handlers = recheckAccount.join(',');
        }
        params.task_type = $scope.taskType.id;
        // $scope.postActionWithParams(TaskAction.Assign, params, function () {
        //     $timeout(function () {
        //         $scope.cancel();
        //     }, 500);
        // });
        $scope.submit(params);
    };

    $scope.$on('$destroy', function () {
       if (dtPicker) {
           dtPicker.dispose();
           dtPicker = null;
       }
       if (taskTypePicker) {
           taskTypePicker.dispose();
           taskTypePicker = null;
       }
    });
}]);

app.controller('TaskAssignCtrl', ['$scope', '$timeout', function ($scope, $timeout) {
    $scope.pageName = '指派处理人';

    $scope.submit = function (params) {   //上传描述和图片
        $scope.postActionWithParams(TaskAction.Assign, params, function () {
            $timeout(function () {
                history.back();
            }, 500);
        });
    };
}]);

app.controller('TaskHandlerUpload', ['$scope', '$timeout', 'mediaService', function ($scope, $timeout, mediaService) {
    $scope.images = [];
    $scope.description = '';
    $scope.audioUrl = null;
    $scope.audioDuration = null;
    $scope.videoUrl = null;
    $scope.audioVideoEnabled = window.android && window.android.captureVideo;

    function checkAndUploadVideoAndAudio(outputParam) { // 如果检测到有视频或语音，先上传得到链接后，写入outputParam，再调用callback进行提交
        function uploadFinish() {
            $scope.postActionWithParams(TaskAction.Update, outputParam, function () {
                $timeout(function () {
                    $scope.cancel();
                }, 500);
            });
        }

        $.notify.progressStart();

        function uploadVideo() {
            if ($scope.videoUrl) {
                if ($scope.videoUrl.indexOf("http") !== 0) {
                    mediaService.uploadVideo($scope.videoUrl, function (res) {
                        if (res.code === 0) {
                            $scope.videoUrl = res.data;
                            outputParam.video_src = res.data;
                            $scope.$apply();
                            uploadFinish();
                        } else {
                            $.notify.progressStop();
                            $.notify.error('上传视频失败');
                        }
                    });
                } else {
                    outputParam.video_src = $scope.videoUrl;
                    uploadFinish();
                }
            } else {
                uploadFinish();
            }
        }

        if ($scope.audioUrl) {
            if ($scope.audioUrl.indexOf('http') !== 0) {
                mediaService.uploadAudio($scope.audioUrl, function (res) {
                    if (res.code === 0) {
                        $scope.audioUrl = res.data;
                        outputParam.voice_src = $scope.audioUrl;
                        outputParam.voice_duration = $scope.audioDuration;
                        $scope.$apply();
                        uploadVideo();
                    } else {
                        $.notify.progressStop();
                        $.notify.error('上传语音失败');
                    }
                });
            } else {
                outputParam.voice_src = $scope.audioUrl;
                outputParam.voice_duration = $scope.audioDuration;
                uploadVideo();
            }
        } else {
            uploadVideo();
        }
    }

    $scope.onUpdateVoice = function (url, duration) {
        $scope.audioUrl = url;
        $scope.audioDuration = duration;
    };

    $scope.onUpdateVideo = function (url) {
        $scope.videoUrl = url;
    };

    $scope.submitAndBack = function () {   //上传描述和图片
        if (!$scope.description && !$scope.audioUrl) {
            mui.alert('请用文字或语音进行说明', '无法提交', function () {
            });
            return;
        }
        var postParam = {};
        if ($scope.description) {
            postParam.description = $scope.description;
        }
        if ($scope.images && $scope.images.length) {
            postParam['pictures'] = $scope.images;
        }
        checkAndUploadVideoAndAudio(postParam);
    };

    $scope.cancel = function () {
        window.history.back();
    };
}]);

app.controller('TaskRecheckCtrl', ['$scope', '$timeout', 'mediaService', '$myTranslate', function ($scope, $timeout, mediaService, $myTranslate) {
    $scope.recheckPass = true;
    $scope.images = [];
    $scope.description = '';
    $scope.audioUrl = null;
    $scope.audioDuration = null;
    $scope.videoUrl = null;
    $scope.audioVideoEnabled = window.android && window.android.captureVideo;

    $scope.onUpdateVoice = function (url, duration) {
        $scope.audioUrl = url;
        $scope.audioDuration = duration;
    };

    $scope.onUpdateVideo = function (url) {
        $scope.videoUrl = url;
    };

    $scope.setRecheckPass = function (pass) {
        $scope.recheckPass = pass;
    };

    function checkAndUploadVideoAndAudio(outputParam) { // 如果检测到有视频或语音，先上传得到链接后，写入outputParam，再调用callback进行提交
        function uploadFinish() {
            $scope.postActionWithParams(TaskAction.RECHECK, outputParam, function () {
                $timeout(function () {
                    $scope.cancel();
                }, 500);
            });
        }

        $.notify.progressStart();

        function uploadVideo() {
            if ($scope.videoUrl) {
                if ($scope.videoUrl.indexOf("http") !== 0) {
                    mediaService.uploadVideo($scope.videoUrl, function (res) {
                        if (res.code === 0) {
                            $scope.videoUrl = res.data;
                            outputParam.video_src = res.data;
                            $scope.$apply();
                            uploadFinish();
                        } else {
                            $.notify.progressStop();
                            $.notify.error($myTranslate.instant('upload video failed'));
                        }
                    });
                } else {
                    outputParam.video_src = $scope.videoUrl;
                    uploadFinish();
                }
            } else {
                uploadFinish();
            }
        }

        if ($scope.audioUrl) {
            if ($scope.audioUrl.indexOf('http') !== 0) {
                mediaService.uploadAudio($scope.audioUrl, function (res) {
                    if (res.code === 0) {
                        $scope.audioUrl = res.data;
                        outputParam.voice_src = $scope.audioUrl;
                        outputParam.voice_duration = $scope.audioDuration;
                        $scope.$apply();
                        uploadVideo();
                    } else {
                        $.notify.progressStop();
                        $.notify.error($myTranslate.instant('upload voice failed'));
                    }
                });
            } else {
                outputParam.voice_src = $scope.audioUrl;
                outputParam.voice_duration = $scope.audioDuration;
                uploadVideo();
            }
        } else {
            uploadVideo();
        }
    }

    $scope.submitAndBack = function () {   //上传描述和图片
        if (!$scope.recheckPass && !$scope.description && !$scope.audioUrl) {
            mui.alert($myTranslate.instant('recheck.result.desp.empty'), $myTranslate.instant('recheck.submit.error'), function () {
            });
            return;
        }
        var data = {};
        if ($scope.description) {
            data.description = $scope.description;
        }
        if ($scope.images && $scope.images.length) {
            data['pictures'] = $scope.images;
        }
        data.recheck_pass = $scope.recheckPass;
        checkAndUploadVideoAndAudio(data);
    };

    $scope.cancel = function () {
        window.history.back();
    };
}]);

app.controller('TaskGalleryCtrl', ['$scope', '$stateParams', '$timeout', function ($scope, $stateParams, $timeout) {
    $scope.canDelete = false;
    $scope.index = $stateParams.index;
    $scope.images = $stateParams.images;
    $scope.show = false;

    $scope.deleteImage = function () {       // 删除图片
        var index = $("#slides .slidesjs-pagination a.active").parent().index();
        if (index < 0) {
            index = 0;
        }
        $('div[ng-controller="TaskHandlerUpload"]').scope().deleteImage(index);
        history.back();
    };


    function initSlider() {
        if ($scope.images.length > 1) {

            var slide = $("#slides");
            slide.slidesjs({
                start: $scope.index,
                width: window.screen.width,
                play: {
                    active: true,
                    swap: true
                }
            });
        }

        $scope.canDelete = $stateParams.canDelete;
        $scope.$apply();
    }

    $timeout(initSlider, 100);


    $scope.hide = function () {
        history.back();
    };
}]);

app.controller('TaskCloseRejectCtrl', ['$scope', function ($scope) {      //驳回关闭请求

    $scope.submit = function () {

        $scope.postAction(TaskAction.Reject, $scope.description, null, function () {
            history.back();
        });
    };
}]);

app.controller('TaskCreateCtrl', ['$scope', '$stateParams', '$state', '$timeout', 'userService', 'routerService', 'ajax', '$myTranslate', function ($scope, $stateParams, $state, $timeout, userService, routerService, ajax, $myTranslate) {
    $scope.stationName = null;
    $scope.taskTypeName = null;
    $scope.operatorTeam = null;
    $scope.handlerName = null;
    $scope.deviceName = null;
    $scope.user = null;
    $scope.linkEventId = $stateParams.eventId; // GetQueryString("eventId");
    var stationSn = $stateParams.stationSn; // GetQueryString('station_sn')
    $scope.imageList = [];
    $scope.role = userService.getUserRole();
    $scope.needResign = $scope.role === 'OPS_ADMIN';      // 是否需要指派维修工

    $scope.teams = [];
    $scope.teamVisible = false;         // 是否显示运维班组选择窗口
    $scope.teamUsers = [];
    $scope.handlerVisible = false;      // 是否显示维修工选择窗口
    $scope.handlerRowSpan = 1;       // 默认为一行
    var isGrabTask = false;
    var staticDevices = [];
    var stations = [];
    var currentStation = null;
    $scope.isEnglish = gIsEnglish;

    $scope.taskData = {
        events: [],
        devices: []
    };
    var opsCompanyId = null;
    if ($scope.role === 'OPS_ADMIN' || $scope.role === 'OPS_OPER') {
        opsCompanyId = Number.parseInt(userService.getCompanyId(), 10);
    }
    var taskTypePicker = null;
    var dtPicker = null;
    var stationPicker = null;

    $scope.$on('$destroy', function () {
       if (taskTypePicker) {
           taskTypePicker.dispose();
           taskTypePicker = null;
       }
        if (stationPicker) {
            stationPicker.dispose();
            stationPicker = null;
        }
        if (dtPicker) {
            dtPicker.dispose();
            dtPicker = null;
        }
    });
    function init() {
        if ($scope.linkEventId && $scope.linkEventId !== '') {
            initLinkEvent();
            // 读取站点信息
            ajax.get({
                url: '/stations/' + stationSn,
                success: function (data) {
                    $scope.stationName = data.name;
                    $scope.$apply();
                }
            });
        } else {
            initStations();
        }
        initTaskTypeList();
        if ($scope.needResign) {
            initMembers();
        }
    }

    function _format(data, idKey, nameKey) {
        var d = null;
        if (typeof (idKey) === 'undefined') {
            idKey = 'id';
        }
        if (typeof (nameKey) === 'undefined') {
            nameKey = 'name';
        }
        for (var i = 0; i < data.length; i++) {
            d = data[i];
            d.value = d[idKey];
            d.text = d[nameKey];
        }
    }

    function initLinkEvent() {
        ajax.get({
            url: '/events/' + $scope.linkEventId,
            success: function (data) {
                $scope.taskData.name = data.info;
                // $scope.stationName = data.station_name;
                $scope.deviceName = data.device_name;
                $scope.taskData.station_sn = data.station_sn;
                $scope.taskData.events.push({"id": $scope.linkEventId});
                $scope.taskData.devices.push({"id": data.device_id});
                if (data.station_sn) {
                    getDevices({sn: data.station_sn});
                }
                $scope.$apply();
            },
            error: function () {
                console.log('获取事件信息失败: ' + $scope.linkEventId);
            }
        });
    }

    function initStations() {
        ajax.get({
            url: '/stations',
            success: function (data) {
                stations = [];
                data.forEach(function (d) {
                    if (!d.is_group) {
                        stations.push(d);
                    }
                });
                if (stations.length === 1) { // 用户只有一个站点，则无需让用户选择站点
                    $scope.taskData.station_sn = stations[0].sn;
                    $scope.stationName = stations[0].name;
                    getDevices({sn: stations[0].sn}); // 获取报修设备
                    return;
                }
                _format(stations, 'sn');
                // 初始化picker
                stationPicker = new mui.PopPicker();
                stationPicker.setData(stations);
                var showUserPickerButton = document.getElementById('stationPicker');
                showUserPickerButton.addEventListener('click', function (event) {
                    if (!stations.length) {
                        $.notify.toast('您未配置任何站点，请联系管理员');
                        return;
                    }
                    stationPicker.show(function (items) {
                        if ($scope.taskData.station_sn !== items[0].value) { // 站点切换后，才重新获取信息
                            $scope.taskData.station_sn = items[0].value;
                            $scope.stationName = items[0].text;
                            getDevices(items[0]);
                            $scope.$apply();

                            // 切换站点后，如果运维公诉不一样，需要重新刷新责任人列表
                            for (var i = 0; i < stations.length; i++) {
                                if (stations[i].sn === items[0].value) {
                                    currentStation = stations[i];
                                    if (opsCompanyId !== currentStation.ops_company_id) {
                                        opsCompanyId = currentStation.ops_company_id;
                                        initMembers(opsCompanyId);
                                    }
                                    break;
                                }
                            }
                        }
                    });
                }, false);
                pickerI18n();
            },
            error: function () {
                console.log('获取站点列表失败');
            }
        });
    }

    function getDevices(station) {
        $scope.taskData.devices = [];
        $scope.deviceName = null;
        ajax.get({
            url: '/stations/' + station.sn + '/staticdevices',
            success: function (data) {
                staticDevices = data;
            },
            error: function (xhr, error, satus) {
                console.log('get devices error');
            }
        });
    }

    $scope.openDeviceSelector = function () {
        if (!$scope.taskData.station_sn) {
            $.notify.toast('请先选择站点');
            return;
        }
        // 打开设备选择页面
        routerService.openPage($scope, '/templates/site/device-tree/device-select-page.html', {
            deviceDatas: staticDevices,
            onSelect: function (device) {
                $scope.deviceName = device.name;
                $scope.taskData.devices = [{id: device.id, sn: device.sn, name: device.name}];
                history.back();
            }
        });
    };

    function initTaskTypeList() {
        ajax.get({
            url: '/opstasks/task_types',
            success: function (data) {
                var taskTypes = [];
                data.forEach(function (t) {
                    if (OpsTaskType.indexOf(t.id) >= 0) {
                        taskTypes.push(t);
                    }
                });
                $scope.taskTypes = taskTypes;
                _format(taskTypes);

                //普通示例
                taskTypePicker = new mui.PopPicker();
                taskTypePicker.setData(taskTypes);
                var taskTypeButton = document.getElementById('taskTypePicker');
                taskTypeButton.addEventListener('click', function (event) {
                    taskTypePicker.show(function (items) {
                        $scope.taskTypeName = items[0].text;
                        $scope.taskData.task_type_id = items[0].value;
                        $scope.$apply();
                        // userResult.innerText = JSON.stringify(items[0]);
                        //返回 false 可以阻止选择框的关闭
                        //return false;
                    });
                }, false);
                pickerI18n();

                initDatePicker(); // 在这初始化，防止ng-cloak导致页面还没显示出来时，初始化失败
            },
            error: function () {
                console.log('获取任务类型失败');
            }
        });
    }

    $scope.showTeamSelector = function () {     // 显示维修班组选择框
        $scope.teamVisible = !$scope.teamVisible;
    };

    $scope.showHandlerSelector = function () {    // 显示维修工选择框
        if (!$scope.operatorTeam) {
            $.notify.toast($myTranslate.instant('task.tip.teamfirst'));
        } else {
            $scope.handlerVisible = !$scope.handlerVisible;
        }
    };

    function initMembers() {
        if (!$scope.needResign) {
            return;
        }
        ajax.get({
            url: '/OpsTeams?company_id=' + opsCompanyId + '&with_user=true',
            success: function (data) {
                $scope.teams = data;
                $scope.teamUsers = [];
                $scope.$apply();
            },
            error: function () {
                $.notify.error("获取维修班组及成员信息失败");
            }
        });
    }

    $scope.onSelectedTeam = function (team) {
        // 先判断维修组是否改变了，改变了维修班组，需要情况维修工信息
        if (!team || team.id !== $scope.taskData.operator_team) {
            $scope.onSelectedUsers([]);
        }
        $scope.operatorTeam = team ? team.name : null;
        $scope.taskData.operator_team = team ? team.id : null;
        $scope.teamUsers = team ? team.users : [];
        $scope.teamVisible = false;
    };

    $scope.onSelectedUsers = function (users) {
        var accounts = [];
        var handlerNames = '';
        users.forEach(function (user) {
            accounts.push(user.account);
            handlerNames += user.name + (user.phone ? '/' + user.phone : '') + '\n';
        });
        $scope.taskData.current_handler = accounts.join(',');
        $scope.handlerVisible = false;
        $scope.handlerName = handlerNames;
        $scope.handlerRowSpan = users.length || 1;
    };

    function initDatePicker() {
        var timeBtn = document.getElementById('expectedTime');
        if (timeBtn) {
            timeBtn.addEventListener('tap', function () {
                if (dtPicker) {
                    dtPicker.show(function (rs) {
                        // 如果所选日期为今天，且已经是晚上18:00以后，则时间设置为23:59:59
                        $scope.taskData.expect_complete_time = rs.text + ' 20:00:00';
                        $scope.$apply();
                    });
                } else {
                    var options = {type: 'date', beginDate: new Date()};
                    /*
                     * 首次显示时实例化组件
                     * 示例为了简洁，将 options 放在了按钮的 dom 上
                     * 也可以直接通过代码声明 optinos 用于实例化 DtPicker
                     */
                    dtPicker = new mui.DtPicker(options);
                    dtPicker.show(function (rs) {
                        $scope.taskData.expect_complete_time = rs.text + " 20:00:00";
                        $scope.$apply();
                    });
                    datePickerI18n();
                }
            }, false);
        }
    }

    // $scope.handlerIsInvalid = function (form) {
    //     if (form.$submitted && ((!isGrabTask && !$scope.taskData.current_handler))){
    //         return true;
    //     }
    //     return false;
    // };

    $scope.createTask = function () {
        var taskData = $scope.taskData;
        var devices = [];
        taskData.devices.forEach(function (d) {
            if (d.id) {
                devices.push(d);
            }
        });
        taskData.devices = devices;
        taskData.company_id = opsCompanyId;
        // 增加图片信息
        if ($scope.imageList.length) {
            taskData.pictures = $scope.imageList;
        }
        taskData.source = $scope.linkEventId ? TaskSource.Event : TaskSource.Repaire;
        if (!taskData.current_handler && taskData.operator_team) {
            taskData.stage_id = 6;
        }
        $.notify.progressStart();
        var createdData = null;
        ajax.post({
            url: '/opstasks',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(taskData),
            success: function (data) {
                createdData = data;
                $.notify.progressStop();
                $.notify.info($myTranslate.instant('submit successful'), 350);
                window.addEventListener('popstate', _openNewTask);
                setTimeout(function () {
                    history.back();
                }, 300);
            }, error: function () {
                $.notify.progressStop();
                $.notify.error($myTranslate.instant('submit failed'));
                console.log('error');
            }
        });

        function _openNewTask() {
            var currentRouterIndex = $state.current.name;
            $state.go(currentRouterIndex + '.task', {id: createdData.id, taskType: createdData.task_type_id});
            window.removeEventListener('popstate', _openNewTask);
        }
    };

    $scope.toggleTaskType = function () {
        isGrabTask = !isGrabTask;
        if (isGrabTask) {
            $scope.handlerName = null;
            $scope.taskData.current_handler = null;
            $scope.$apply();
        }
    };

    $scope.submitForm = function () {
        if ($scope.myForm.$invalid) {
            console.log('form invalid');
        } else {
            $scope.createTask();
        }
    };

    init();
}]);

// 巡检所有设备处理页面
app.controller('TaskDevicesHandlerCtrl', ['$scope', '$state', '$stateParams', 'routerService', 'ajax', '$myTranslate', function ($scope, $state, $stateParams, routerService, ajax, $myTranslate) {
    $scope.taskData = $stateParams.taskData;
    $scope.recountFunc = $stateParams.recountFunc;
    var taskId = $scope.taskData.id; // $scope.task.id;
    $scope.canEdit = $stateParams.canEdit;
    $scope.device_record = $scope.taskData.device_record;
    $scope.checkedSns = [];
    $scope.checkAll = false;
    $scope.isSubmitting = false;
    $scope.searchDevice = '';

    $scope.device_record.forEach(function (r) {
        r.checked = false;
    });

    $scope.checkDevice = function ($event, sn) {
        if ($event) {
            $event.preventDefault();
            $event.stopPropagation();
        }
        $scope.device_record.forEach(function (d) {
            if (d.device_sn === sn) {
                d.checked = !d.checked;
                if (d.checked) {
                    $scope.checkedSns.push(d.device_sn);
                } else {
                    $scope.checkedSns.splice($scope.checkedSns.indexOf(d.device_sn), 1);
                }
                return false;
            }
        });
    };

    $scope.toggleCheckAll = function (checked) {
        if (checked !== undefined) {
            $scope.checkAll = checked;
        } else {
            $scope.checkAll = !$scope.checkAll;
        }
        var sns = [];
        $scope.device_record.forEach(function (d) {
            d.checked = $scope.checkAll;
            if ($scope.checkAll) {
                sns.push(d.device_sn);
            }
        });
        $scope.checkedSns = sns;
    };

    $scope.addRecord = function () {
        if ($scope.checkedSns.length === 0) {
            $.notify.toast($myTranslate.instant('atleastone'), 1000);
            return;
        }

    };

    $scope.setStatusOk = function () {
        if ($scope.checkedSns.length === 0) {
            $.notify.toast($myTranslate.instant('atleastone'), 1000);
            return;
        }
        $scope.isSubmitting = true;
        ajax.post({
            url: '/opstasks/' + taskId + '/setDevicesPass?device_sns=' + $scope.checkedSns,
            contentType: "application/json",
            headers: {
                Accept: "application/json"
            },
            success: function (response) {
                $scope.isSubmitting = false;
                $.notify.toast($myTranslate.instant('submit successful'), 1000);
                $scope.$emit('deviceStatusChange', $scope.checkedSns, '1');
                $scope.device_record.forEach(function (r) {
                    if (r.checked) {
                        r.status = '1';
                        r.status_name = $myTranslate.instant('inspect.result.normal');
                        r.className = "normal";
                        $scope.checkDevice(null, r.device_sn);
                    }
                });
                $scope.toggleCheckAll(false);
                $scope.$apply();
            },
            error: function (xhr, error, status) {
                $scope.isSubmitting = false;
                $scope.$apply();
            }
        });
    };

    $scope.openDtsPage = function () {
        if ($scope.checkedSns.length === 0) {
            $.notify.toast($myTranslate.instant('defect.submit.device.atleast'), 1000);
            return;
        }
        var record = null;
        $scope.device_record.forEach(function (r) {
            if (r.checked) {
                record = r;
                return false;
            }
        });
        $state.go('.newDts', {
            taskId: $scope.taskData.id,
            stationSn: $scope.taskData.station_sn,
            deviceSns: $scope.checkedSns
        });
    };

    $scope.gotoDevice = function (deviceData) {
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {
            device_id: deviceData.id,
            device_sn: deviceData.sn
        });
        return false;
    };

    $scope.updateDeviceRecordWidthDts = function (deviceRecord) {
        $scope.device_record.forEach(function (r) {
            if (r.device_sn === deviceRecord.device_sn) {
                r.status = deviceRecord.status;
                r.desp = deviceRecord.desp;
                r.photo_links = deviceRecord.photo_links;
                r.status_name = $myTranslate.instant('inspect.result.uncheck');
                r.className = "danger";
                $scope.checkDevice(null, deviceRecord.device_sn);
                return false;
            }
        });
        $scope.recountFunc();
    };

    $scope.openDeviceCheckPage = function (device) {
        $state.go('.detail', {
            device: device,
            taskData: $scope.taskData,
            canEdit: $scope.canEdit
        });
        return false;
    };
    $scope.deviceFilter = function (item) {
        if (!$scope.searchDevice) return true;
        if (item.device_name.indexOf($scope.searchDevice) >= 0) {
            return true;
        }
        return false;
    }
}]);

// 巡检单个设备的处理页面
app.controller('TaskDeviceCheckCtrl', ['$scope', '$stateParams', 'ajax', '$myTranslate', 'userService', '$state', function ($scope, $stateParams, ajax, $myTranslate, userService, $state) {
    $scope.taskData = $stateParams.taskData;
    $scope.device = $stateParams.device;
    $scope.canEdit = $stateParams.canEdit;
    var taskId = $scope.taskData.id;
    var deviceSn = $scope.device.device_sn;
    $scope.deviceName = $scope.device.device_name;
    $scope.result = {};
    $scope.checkItems = [];
    $scope.total = 0;
    $scope.checked = 0;
    $scope.exception = 0;
    $scope.isLoading = false;
    $scope.expandItems = !$scope.canEdit;
    $scope.showResult = [TaskStatus.Arrived, TaskStatus.ToClose, TaskStatus.Closed].indexOf($scope.taskData.stage_id) >= 0;
    $scope.autoSubmitDts = false; // 是否自动提交为缺陷单
    $scope.selectedDtsLevel = {}; // 已选的缺陷等级
    $scope.selectedDtsType = {}; // 已选的缺陷类型
    var allDtsTypes = null; // 可选的缺陷类型
    var dtsTypePicker = null;
    var dtsLevelPicker = null;
    var deviceExceptionDesp = {}; // 设备异常描述，默认=检查项的异常结果
    var deviceDespEdited = false; // 设备异常描述如果被修改过，则后续步骤异常修改不再同步到设备结果

    $scope.onExpandItems = function () {
        $scope.expandItems = !$scope.expandItems;
    };

    function getDeviceCheckItems() {
        ajax.get({
            url: '/opstasks/' + taskId + '/devices/' + deviceSn + "?withCheckItems=true",
            success: function (data) {
                if (data.photo_links) {
                    data.images = data.photo_links ? data.photo_links.split(',') : [];
                } else {
                    data.images = [];
                }
                $scope.result = data;
                if (data.check_items) {
                    $scope.total = data.check_items.length;
                    data.check_items.forEach(function (item) {
                        if (item.pass) {
                            $scope.checked += 1;
                            if (item.pass === 2) {
                                $scope.exception += 1;
                            }
                        }
                        if (item.photo_links) {
                            item.images = item.photo_links.split(',');
                        } else {
                            item.images = [];
                        }
                    });
                    $scope.checkItems = data.check_items;
                }
                $scope.isLoading = false;
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $scope.$apply();
            }
        });
    }

    $scope.setItemPass = function (checkItem, pass) {
        checkItem.pass = pass;
        if (pass === 2) {
            // 如果设置检查步骤异常，则默认设备结果也为异常
            $scope.result.status = '2';
            deviceExceptionDesp[checkItem.id] = checkItem;
        } else {
            delete deviceExceptionDesp[checkItem.id];
        }
        autoCompleteDeviceDesp();
    };

    function autoCompleteDeviceDesp() {
        if (!deviceDespEdited) {
            var desp = '';
            var keys = Object.keys(deviceExceptionDesp);
            keys.forEach(function (id, i) {
                if (keys.length > 1) {
                    desp += (i + 1) + '.';
                }
                var item = deviceExceptionDesp[id];
                desp += item.name + ' 异常';
                if (item.result_desp) {
                    desp += '：' + item.result_desp;
                }
                desp += '\n';
            });
            $scope.result.desp = desp;
        }
    }

    $scope.onItemInputBlur = function(item) {
        autoCompleteDeviceDesp();
    };

    $scope.saveDeviceResult = function () {
        if ($scope.result.status === '2' && !$scope.result.desp) {
            // 当设备状态设置为异常时，需要输入异常结果
            $.notify.toast($myTranslate.instant('inspect.device.error.input.tip'));
            return;
        }
        var checkItems = [];
        $scope.checkItems.forEach(function (t) {
            checkItems.push({
                id: t.id,
                pass: t.pass || 1, // 默认通过
                result_desp: t.result_desp,
                images: t.images
            });
        });
        $.notify.progressStart();
        if ($scope.selectedDtsType.id) { // 如果选择了缺陷类型后又被修改了，则设置id为空
            for (var i=0; i<allDtsTypes.length; i++) {
                if (allDtsTypes[i].id === $scope.selectedDtsType.id) {
                    if (allDtsTypes[i].name !== $scope.selectedDtsType.name) {
                        $scope.selectedDtsType.id = null;
                    }
                    break;
                }
            }
        }
        var param = {
            status: $scope.result.status || '1',
            check_items: checkItems,
            desp: $scope.result.desp,
            images: $scope.result.images,
            gen_dts: $scope.autoSubmitDts, // 是否自动创建dts单,
            task_type_id: $scope.selectedDtsLevel.id,
            defect_type_name: $scope.selectedDtsType.name || null,
            defect_type: $scope.selectedDtsType.id || null
        };
        ajax.post({
            url: '/opstasks/' + taskId + '/setDeviceResult/' + deviceSn,
            data: JSON.stringify(param),
            contentType: 'application/json',
            headers: {
                Accept: "application/json"
            },
            success: function (response) {
                $.notify.progressStop();
                $.notify.info($myTranslate.instant('save successful'), 500);
                Object.assign($scope.device, param);
                $scope.$emit("deviceStatusChange", [$scope.device.device_sn], param.status);  // 通知父组件设备状态修改

                setTimeout(function () {
                    history.back();
                }, 500);
                $scope.$apply();
            },
            error: function () {
                $.notify.progressStop();
                $.notify.error($myTranslate.instant('save failed'));
            }
        });
    };

    $scope.setDevicePass = function (pass) {
        $scope.result.status = pass;
    };

    $scope.setSubmitDts = function () {
        $scope.autoSubmitDts = !$scope.autoSubmitDts;
        document.getElementById('dtsCreateContent').style.display = $scope.autoSubmitDts ? 'block' : 'none';
        if ($scope.autoSubmitDts) {
            initDtsLevelPicker();
            initDtsTypePicker();
        }
    };

    function initDtsLevelPicker() {
        if (dtsLevelPicker) {
            return;
        }
        ajax.get({
            url: '/opstasks/task_types',
            success: function (data) {
                if(data && data.length  > 0){
                    var taskTypes = [];
                    data.forEach(item=>{
                        if(DtsTaskType.indexOf(item.id) >= 0 || item.id === TaskTypes.HiddenDanger){
                            taskTypes.push({
                                value: item.id,
                                text: item.name
                            })
                        }
                    })
                    var taskTypeButton = document.getElementById('dtsLevelPicker');
                    dtsLevelPicker = new mui.PopPicker();
                    dtsLevelPicker.setData(taskTypes);
                    taskTypeButton.addEventListener('click', function(event) {
                        dtsLevelPicker.show(function(items) {
                            $scope.selectedDtsLevel = {
                                id: items[0].value,
                                name: items[0].text
                            };
                            $scope.$apply();
                        });
                    }, false);
                    // 默认使用一般缺陷
                    $scope.selectedDtsLevel = {
                        id: taskTypes[0].value,
                        name: taskTypes[0].text
                    };
                }
            }
        })
    }

    function initDtsTypePicker() {
        if (dtsTypePicker) {
            return;
        }
        ajax.get({
            url: '/defect_types?companyId=' + userService.getTaskCompanyId(),
            success: function (data) {
                allDtsTypes = data;
                dtsTypePicker = new mui.PopPicker();
                var pickerData = [];
                data.forEach(function (item) {
                    pickerData.push({value: item.id, text: item.name});
                });
                dtsTypePicker.setData(pickerData);
                var defectTypeBtn = document.getElementById('dtsTypePicker');
                defectTypeBtn.addEventListener('click', function(event) {
                    dtsTypePicker.show(function(items) {
                        $scope.selectedDtsType = {
                            id: items[0].value,
                            name: items[0].text.substring(items[0].text.indexOf(' ') + 1)
                        };
                        $scope.$apply();
                    });
                }, false);
                pickerI18n();
                if (data.length) { // 默认缺陷类型为第一项
                    $scope.selectedDtsType = {
                        id: data[0].value,
                        name: data[0].text
                    };
                }
                $scope.$apply();
            }
        });
    }

    function destroyPicker() {
        if (dtsTypePicker) {
            dtsTypePicker.dispose();
            dtsTypePicker = null;
        }
        if (dtsLevelPicker) {
            dtsLevelPicker.dispose();
            dtsLevelPicker = null;
        }
    }

    $scope.$on('$destroy', function () {
        destroyPicker();
    });

    getDeviceCheckItems();
    $scope.openDeviceMap = function () {
        var url = '/templates/site/static-devices/map.html?deviceSn=' + $scope.device.device_sn;
        window.location.href = url;
    };
}]);

app.controller('DeviceXunjianTaskDetailCtrl', ['$scope', 'ajax', 'platformService', 'routerService', 'userService', '$myTranslate', function ($scope, ajax, platformService, routerService, userService, $myTranslate) {
    var taskId = GetQueryString("id");
    var deviceSn = GetQueryString("device_sn");
    $scope.isLoading = true;
    $scope.taskData = {};
    $scope.checkResult = {};
    $scope.device = {};
    var companyId = userService.getCompanyId();

    function getTaskDetail(id) {

        ajax.get({
            url: '/opstasks/' + companyId + '/' + taskId,
            success: function (data) {
                $scope.isLoading = false;
                data.device_record.forEach(function (r) {
                    if (r.device_sn === deviceSn) {
                        if (r.photo_links) {
                            var images = [];
                            r.photo_links.split(',').forEach(function (src) {
                                images.push(platformService.getCloudHost() + src);
                            });
                            r.images = images;
                        }
                        if (r.status === '1') {
                            r.status_name = $myTranslate.instant('inspect.result.normal');
                            r.className = 'normal';
                        } else if (r.status === '2') {
                            r.status_name = $myTranslate.instant('inspect.result.abnormal');
                            r.className = 'danger';
                        } else {
                            r.status_name = $myTranslate.instant('inspect.result.uncheck');
                            r.className = "undo";
                        }
                        $scope.device = r;
                        $scope.checkResult = r;
                        return false;
                    }
                });
                $scope.taskData = data;
                $scope.$apply();

            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                $.notify.error($myTranslate.instant('get data failed'));
            }
        });
    }

    // $scope.openGallery = function (index) {
    //     routerService.openPage($scope, '/templates/base-gallery.html', {
    //         index: index+1,
    //         images: $scope.checkResult.images,
    //         canDelete: false
    //     }, {
    //         hidePrev: false
    //     });
    // };

    getTaskDetail(taskId);
}]);

// 任务评价
app.controller('TaskCommentCtrl', ['$scope', 'ajax', 'platformService', '$myTranslate', function ($scope, ajax, platformService, $myTranslate) {

    var comment = $scope.comment;
    $scope.score = comment.score || 5;
    $scope.imageList = comment.picture_list || [];
    $scope.description = comment.comment;

    $scope.setScore = function (i) {
        $scope.score = i;
    };

    $scope.getScoreDesp = function () {
        switch ($scope.score) {
            case 1:
                return $myTranslate.instant('task.comment.terrible');
            case 2:
                return $myTranslate.instant('task.comment.bad');
            case 3:
                return $myTranslate.instant('task.comment.normal');
            case 4:
                return $myTranslate.instant('task.comment.good');
            case 5:
                return $myTranslate.instant('task.comment.excellent');
        }
    };

    $scope.submitAndBack = function () {
        var pictures = [];
        var cloudHost = platformService.getCloudHost();
        $scope.imageList.forEach(function (url) {
            if (url.indexOf(cloudHost) >= 0) {
                pictures.push(url.substring(cloudHost.length));
            } else {
                pictures.push(url);
            }
        });
        var param = {
            score: $scope.score,
            comment: $scope.description,
            picture_datas: pictures
        };
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + $scope.taskId + '/comments',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(param),
            success: function (res) {
                $.notify.progressStop();
                if (res) {
                    $.notify.info($myTranslate.instant('submit successful'));
                    $scope.onSuccess(res);
                    $scope.cancel();
                } else {
                    $.notify.error($myTranslate.instant('submit failed'));
                }
            },
            error: function () {
                $.notify.progressStop();
                $.notify.error($myTranslate.instant('submit failed'));
            }
        });
    };

    $scope.cancel = function () {
        history.back();
    };
}]);