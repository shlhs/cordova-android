
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
    Xunjian: 11
};
var OpsTaskType = [1, 2, 3, 4, 5, 6, 7];
var DtsTaskType = [8, 9, 10];
var TaskAction = {Create: 0, Accept: 1, Refuse: 2, Assign: 3, Go: 4, Apply: 5, Reject: 6, Close: 7, Comment: 8, Grab: 9, Arrive: 10, Update: 11, Transfer: 12};
var TaskStatus = {ToAccept: 1, ToAssign: 2, Accepted: 3, ToClose: 4, Closed: 5, Competition: 6, Coming: 7, Arrived: 8};
var TaskSource = {Repaire: 1, Event: 2, Inspect: 3};
function formatTaskHistoryDesp(taskHistory) {     // 根据任务的action_id处理任务描述
    switch (taskHistory.action_id){
        case TaskAction.Apply:
            taskHistory.action_name = '处理完成，请求关闭任务';
            taskHistory.desp = null;
            break;
        case TaskAction.Close:
            taskHistory.action_name = '关闭任务';
            taskHistory.desp = null;
            break;
        case TaskAction.Accept:
        case TaskAction.Create:
            taskHistory.desp = null;
            break;
        case TaskAction.Reject:
            taskHistory.action_name = '驳回关闭请求';
            break;
        case TaskAction.Go:
            taskHistory.action_name = '已出发';
            break;
        case TaskAction.Arrive:
            taskHistory.action_name = '已到达';
            break;
    }
}

function formatTaskStatusName(task) {   // 根据任务状态转换任务描述
    var stage = task.stage, status = '';
    switch (task.stage_id){
        case TaskStatus.Closed:
            stage = '已关闭';
            break;
        case TaskStatus.ToClose:
            stage = '待审批';
            break;
        case TaskStatus.ToAccept:
            stage = '待接单';
            break;
        case TaskStatus.ToAssign:
            stage = '待指派';
            break;
        default:
            stage = '待处理';
    }
    task.stage_name = stage;
    task.status = status;
    return task;
}

function sortByUpdateTime(t1, t2) {
    // 排序顺序：待处理、待审核、已关闭。 相同状态下按更新时间排序
    if (t1.last_modified_time > t2.last_modified_time){
        return -1;
    }
    if (t1.last_modified_time === t2.last_modified_time){
        return 0;
    }
    return 1;
}
function sortByCreateTime(t1, t2) {
    if (t1.create_time > t2.create_time){
        return -1;
    }
    if (t1.create_time === t2.create_time){
        return 0;
    }
    return 1;
}
function formatExpiredTime(t) {     // 格式化截止时间，只有日期没有时间
    var day = new Date().getDate(), month=new Date().getMonth()+1, year = new Date().getFullYear();
    var m = parseInt(t.substring(5, 7)), d = parseInt(t.substring(8, 10)), y = parseInt(t.substring(0, 4));
    if (m === month && d === day){
        return '今日';
    }
    if ((m === month && d === (day+1)) || (d === 1 && m === (month-1)) || (m===1 && d===1 && y===(year-1))){
        return '明日';
    }
    return t.substring(5, 10);
}

function formatUpdateTime(t) {      // 格式化更新时间，有日期和时间
    var day = new Date().getDate(), month=new Date().getMonth()+1, year = new Date().getFullYear();
    var m = parseInt(t.substring(5, 7)), d = parseInt(t.substring(8, 10)), y = parseInt(t.substring(0, 4));
    if (m === month && d === day){
        return '今日 ' + t.substring(11, 16);
    }
    if ((m === month && d === (day-1)) || (d === 1 && m === (month-1)) || (m===1 && d===1 && y===(year-1))){
        return '昨日 ' + t.substring(11, 16);
    }
    return t.substring(5, 16);
}

app.constant('TaskAction', TaskAction);
app.constant('TaskStatus', TaskStatus);
app.constant('UserRole', UserRole);

app.service('Permission', function (userService, UserRole) {      // 权限服务
    var role = userService.getUserRole();

    this.task = {'canView': role !== UserRole.Normal, 'canEdit': role === UserRole.OpsAdmin || role === UserRole.OpsOperator};

    this.refresh = function () {
        this.task = {'canView': role !== UserRole.Normal, 'canEdit': role === UserRole.OpsAdmin || role === UserRole.OpsOperator};
    };
});

app.controller('HomeCtrl', function ($scope, $timeout, userService, appStoreProvider, platformService, ajax, routerService) {
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
    if (gShowEnergyPage) {
        $scope.navMenus = [_getDefaultHomeMenu(), _getEnergyMenu()];
    } else {
        $scope.navMenus = [_getDefaultHomeMenu()];
    }
    var menuInited = false;     // 导航栏菜单是否初始化

    $scope.getDataList = function () {
        $scope.isLoading = true;
        ajax.get({
            url: "/stations",
            success: function(result) {
                $scope.isLoading = false;
                var sites = [];
                result.forEach(function (s) {
                    var width = window.screen.width*3, height=Math.round(width/2);
                    if (s.photo_src_link) {
                        s.site_image = platformService.getImageUrl(width, height, platformService.getCloudHost() + s.photo_src_link);
                    } else {
                        s.site_image = '/img/site-default.png';
                    }
                    if (!s.is_group)
                    {
                        s.search_key = s.name.toLowerCase() + ' ' + s.sn.toLowerCase();
                    }
                    s.full_address = (s.address_province || '') + (s.address_city || '') + (s.address_district || '') + (s.address || '');
                    sites.push(s);
                });
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
            error: function (a,b,c) {
                $scope.isLoading = false;
                $.notify.error('获取站点列表失败');
                console.log('get fail');
                $scope.$apply();
            }
        });
    };

    function _formatSiteStatus(data) {
        if (data.communication_status == null || data.communication_status == '') {
            data.status = 'unknown';
            data.status_name = '未知';
        } else if (data.communication_status == 1) {
            if (data.running_status == 1) {
                data.status = 'abnormal';
                data.status_name = '故障';
            } else {
                data.status = 'normal';
                data.status_name = '正常';
            }
        } else {
            data.status = 'offline';
            data.status_name = '离线';
        }
    }

    $scope.refreshAllSiteStatus = function() {      // 获取站点详情
        if (!$scope.sites.length) {
            return;
        }
        ajax.get({
            url: "/stations/details",
            success: function(result) {
                $scope.isLoading = false;
                var sites = $scope.sites;
                result.forEach(function (s) {
                    _formatSiteStatus(s);
                    s.events_amount = s.unclosed_envet_amount > 99 ? '99+' : s.unclosed_envet_amount;
                    for (var i=0; i<sites.length; i++) {
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
            error: function (a,b,c) {
                $scope.isLoading = false;
                // $.notify.error('获取站点列表失败');
                console.log('get fail');
                $scope.$apply();
            }
        });
    };

    $scope.refreshStationStatus = function(sn) {
        ajax.get({
            url: "/stations/details/" + sn,
            success: function(result) {
                _formatSiteStatus(result);
                for (var i=0; i<$scope.sites.length; i++) {
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

    $scope.updateAppList = function() {
        $scope.selectedApps = appStoreProvider.getSelectedApps();
        $scope.$apply();
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
        $scope.popup_visible=true;
    };
    $scope.closePopover = function () {
        $scope.popup_visible=false;
    };

    $scope.chooseSite = function (site) {
        if (!$scope.currentSite || $scope.currentSite.sn !== site.sn) {
            $scope.currentSite = site;
            $scope.searchSiteResult = $scope.sites;
            localStorage.setItem("currentSite", JSON.stringify(site));
            $scope.closePopover();
            $scope.$broadcast('onSiteChange', site);
        }
    };

    function getCurrentSite() {
        var sites = $scope.sites;
        var siteStr = localStorage.getItem("currentSite");
        if (siteStr){
            // 检查站点是否在当前站点中
            var site = JSON.parse(siteStr);
            for (var i=0; i<sites.length; i++) {
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
            {treeData: $scope.sitesTree, onSelect: $scope.chooseSite, selectedSn: $scope.currentSite.sn})
    };

    function _getDefaultHomeMenu() {
        return {
            id: 'sites',
            name: '首页',
            templateUrl: '/templates/site/site-home.html',
            icon: 'nav-sites'
        };
    }
    function _getEnergyMenu() {
        return {
            id: 'energy_mgmt',
            name: '能效管理',
            templateUrl: '/templates/energy/energy-home.html',
            icon: 'nav-energy'
        };
    }

    function _getTaskTodoMenu() {
        if (role === 'OPS_ADMIN' || role === 'OPS_OPERATOR') {
            return {
                id: 'my_tasks',
                name: '我的待办',
                templateUrl: '/templates/task/task-todo-list.html',
                icon: 'nav-all-tasks'
            };
        } else if (role === 'USER') {
            return {
                id: 'my_tasks',
                name: '我的服务',
                templateUrl: '/templates/task/user-task-list.html',
                icon: 'nav-service'
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
        var element=angular.element('#' + tabId).children().first(), scope = element.scope();
        if (scope && scope.getDataList && !element.data('inited')){
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
        if (platHasOps && !menuInited) {
            // 有运维权限
            if (!gShowEnergyPage) {
                // 如果不显示能效页面，那么运维管理员默认显示抢单页和待办页
                // if (role === 'OPS_ADMIN' || role === 'OPS_OPERATOR') {
                //     $scope.navMenus.push({
                //         id: 'grab',
                //         name: '抢单',
                //         templateUrl: '/templates/task/task-competition-list.html',
                //         icon: 'nav-task-grab'
                //     });
                // }
            }
            var todoMenu = _getTaskTodoMenu();
            if (todoMenu) {
                $scope.navMenus.push(todoMenu);
            }
            menuInited = true;
        }
    }

    $scope.$on('$onMenuUpdate', function (event, opsEnabled, menuSns) {
        updateMenus(opsEnabled);
    });
    initMenu();
});

function isTodoTask(task, username) {
    if (task.stage_id !== TaskStatus.Closed && task.current_handler){
        if (task.current_handler.split(',').indexOf(username) >= 0) {
            return true;
        }
    }
    return false;
}

app.controller('TaskBaseCtrl', function ($scope, ajax, userService, appStoreProvider, platformService) {
    var stationSn = GetQueryString("sn");
    var deviceSn = GetQueryString("device_sn");     // 如果设备sn不为空，则获取的是设备的运维记录
    $scope.pageTitle = deviceSn ? '运维记录' : '所有任务';
    $scope.hasOpsAuth = appStoreProvider.hasOpsAuth();
    var map = null;
    $scope.openTask = function (task) {
        if (deviceSn && task.task_type_id === TaskTypes.Xunjian) {
            // 如果是查看单个设备的巡检任务，那么进入特殊的巡检页面
            location.href = '/templates/task/xunjian-device-detail.html?id=' + task.id + '&device_sn=' + deviceSn;
        } else {
            location.href = '/templates/task/task-detail.html?id=' + task.id + '&taskType=' + task.task_type_id;
        }
    };

    $scope.taskTimeout = function (task) {
        // 如果任务已关闭或已提交审核，则认为已完成
        if (task.stage_id === TaskStatus.Closed || task.stage_id === TaskStatus.ToClose){
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

    var companyId = userService.getTaskCompanyId();
    $scope.commonPostAction = function(taskId, actionType, description, images, cb) {
        var data = {};
        if (description){
            data.description = description;
        }
        if (images && images.length){
            data['pictures'] = images;
        }
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId + '/' + taskId + '/actions?action_type=' + actionType,
            data: JSON.stringify(data),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            timeout: 30000,
            success: function (data) {
                $.notify.progressStop();
                $.notify.info('操作成功');
                cb && cb(data);
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error('操作失败');
            }
        });
    };

    $scope.commonPostActionWithParams = function(taskId, actionType, params, cb) {
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId + '/' + taskId + '/actions?action_type=' + actionType,
            data: params ? JSON.stringify(params) : '{}',
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            timeout: 30000,
            success: function (data) {
                $.notify.progressStop();
                $.notify.info('操作成功');
                cb && cb(data);
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error('操作失败');
            }
        });
    };

    $scope.getDistance = function(task, start, cb) {
        if (null === map){
            map = new BMap.Map("map");          // 创建地图实例
        }
        var driving = new BMap.DrivingRoute(map, {
            renderOptions: {
                map   : map,
                panel : "results",
                autoViewport: true
            },
            onSearchComplete: function (result) {
                if (result && result.getPlan(0)){
                    task.distance = parseFloat(result.getPlan(0).getDistance());
                    cb && cb(task, task.distance);
                }else{
                    cb && cb(task, -1); // 不存在路径
                }
            }
        });
        var end = new BMap.Point(task.station_longitude, task.station_latitude);
        driving.search(start, end);
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
        window.location.href = '/templates/dts/dts-create.html?station_sn=' + (stationSn || '') + '&device_sn=' + (deviceSn || '');
    };
});

app.controller('CompetitionTaskListCtrl', function ($scope, $rootScope, scrollerService, userService, ajax) {
    $scope.tasks = [];
    $scope.isLoading = true;
    var selectedTaskIndex = -1, company=userService.getCompany();
    var stationDistances = {};

    moment.locale('en', {
        relativeTime : {
            future: "in %s",
            past:   "%s前",
            s:  "秒",
            m:  "1分钟",
            mm: "%d分钟",
            h:  "1小时",
            hh: "%d小时",
            d:  "1天",
            dd: "%d天",
            M:  "1个月",
            MM: "%d个月",
            y:  "1年",
            yy: "%d年"
        }
    });

    function formatTime(task) {
        task.create_time_desp = moment(task.create_time).fromNow();
        task.create_time = formatUpdateTime(task.create_time);
        task.expect_complete_time = task.expect_complete_time.substring(0, 16);
        return task;
    }

    // 计算距离
    function getAllDistance(taskList) {
        function getDistance(index, point) {
            if (index >= taskList.length){
                return;
            }
            var task = taskList[index];
            if (!task.station_longitude || !task.station_latitude){
                getDistance(index+1, point);
            }
            if (stationDistances[task.station_sn] == null) {
                $scope.getDistance(task, point, function (task, distance) {
                    if (distance >=0 )
                    {
                        stationDistances[task.station_sn] = distance;
                    }
                    $scope.$apply();
                    getDistance(index+1, point);
                });
            }
            else {
                task.distance = stationDistances[task.station_sn];
            }
        }
        // 先获取自己的位置
        stationDistances = {};
        apiLocation.start(function (longitude, latitude) {
             if (!longitude || !latitude){
                 return;
             }
             if (!taskList || !taskList.length){
                 return;
             }
            var start = new BMap.Point(longitude, latitude);
             // 先做坐标转换
            var convertor = new BMap.Convertor();
            var pointArr = [start];
            convertor.translate(pointArr, 3, 5, function (data) {
                var task = null;
                var i = 0;
                getDistance(i, data.points[0]);
            });
        });
    }

    var companyId = userService.getTaskCompanyId();
    $scope.getDataList = function() {
        scrollerService.initScroll('#competition_tasks_scroller', $scope.getDataList);
        if (!companyId) {
            return;
        }
        ajax.get({
            url: "/opstasks/" + companyId,
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
                for (var i in result){
                    formatTaskStatusName(formatTime(result[i]));
                }
                $scope.tasks = result;
                $scope.tasks.sort(sortByCreateTime);
                $scope.$apply();
                getAllDistance(result);
            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                $scope.$apply();
                $.notify.error('读取待办失败');
            }
        });
    };

    $scope.afterGrabTask = function (taskData) {
        var task = null;
        for (var i in $scope.tasks){
            task = $scope.tasks[i];
            if (parseInt(task.id) === parseInt(taskData.id)){
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

    // $scope.getDataList();
});

app.controller('GrabTaskCtrl', function ($scope, userService, ajax) {
    $scope.postGrabAction = function($event, taskId) {
        $event.stopPropagation();
        var companyId = userService.getTaskCompanyId();
        var data = {};
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId + '/' + taskId + '/actions?action_type=' + TaskAction.Grab,
            data: JSON.stringify(data),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            success: function (data) {
                $.notify.progressStop();
                $.notify.info("抢单成功");
                $scope.afterGrabTask(data);
                $scope.$apply();
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error('抢单时发生异常');
            }
        });
        return false;
    };
});

app.controller('TaskTodoListCtrl', function ($scope, $rootScope, scrollerService, userService, ajax, TaskStatus) {
    var allTasks = [];
    var username = userService.user.account;
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.showType = 'todo';    // all, open, closed, todo
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;

    $scope.getDataList = function() {
        scrollerService.initScroll("#taskList", $scope.getDataList);
        $scope.isLoading = true;
        $scope.loadingFailed = false;

        ajax.get({
            url: "/opstasks",
            data:{
                handler: username,
                page_size: 100,
                page_index: 0,
                s_echo: 0
            },
            success: function(result) {
                $scope.isLoading = false;
                allTasks = result;
                allTasks.sort(sortByUpdateTime);
                var task = null;
                for (var i in allTasks){
                    task = allTasks[i];
                    formatTaskStatusName(task);
                    task.isTimeout = $scope.taskTimeout(task);
                }
                $scope.changeTaskType(null, $scope.showType);
                $scope.$apply();
            },
            error: function (a,b,c) {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    $scope.updateTask = function (taskData) {
        // 查找任务是否存在
        var exist = false;
        for (var i in allTasks){
            if (allTasks[i].id === taskData.id){
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
        if (!exist && isTodoTask(taskData, username)){        // 如果不存在，则加入到最前面
            allTasks.unshift(taskData);
        }
        // allTasks.sort(sortByUpdateTime);
        $scope.changeTaskType(null, $scope.showType);
        $scope.$apply();
    };

    $scope.changeTaskType = function ($event, type) {
        console.log('change type');
        var showTasks = [], task = null, todoCount = 0;

        if (type === 'all'){
            showTasks = allTasks;
        }
        else if (type === 'closed'){
            for(var i in allTasks){
                task = allTasks[i];
                if (task.stage_id === TaskStatus.Closed){
                    showTasks.push(task);
                }
            }
        }
        else if (type === 'todo'){
            for(var i in allTasks){
                task = allTasks[i];
                if (isTodoTask(task, username)){
                    showTasks.push(task);
                }
            }
            $scope.todoCount = showTasks.length;
        }
        else{
            for (var i in allTasks){
                task = allTasks[i];
                if (task.stage_id !== TaskStatus.Closed){
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
        window.location.href = '/templates/task/add-task.html';
    };
});

app.controller('TaskListCtrl', function ($scope, $rootScope, scrollerService, userService, ajax) {
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.showType = 'all';    // all, open, closed, todo
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;
    var deviceSn = GetQueryString("device_sn");     // 如果设备sn不为空，则获取的是设备的运维记录
    $scope.isDeviceOps = deviceSn ? true : false;
    $scope.pageTitle = deviceSn ? '运维记录' : '所有任务';
    var role = userService.getUserRole();
    var userAccount = userService.getUser().account;
    var requestFilterParams = null;
    $scope.showFilter = false;
    $scope.filterItems = [
        {
            title: '状态',
            key: 'stage',
            items: [{
                id: 'stage_finished',
                name: '已完成',
                value: [TaskStatus.Closed]
            }, {
                id: 'stage_unfinished',
                name: '未完成',
                value: [TaskStatus.ToAssign, TaskStatus.ToAccept, TaskStatus.Accepted, TaskStatus.Coming, TaskStatus.Arrived]
            }]
        }, {
            title: '来源',
            key: 'creater',
            items: [{
                id: 'creator_my',
                name: '我提交的',
                value: userAccount
            }]
        }, {
            title: '类型',
            key: 'task_type',
            items: [{
                id: 'type_xunjian',
                name: '巡检',
                value: TaskTypes.Xunjian
            }, {
                id: 'type_qiangxiu',
                name: '抢修',
                value: TaskTypes.Qiangxiu
            }, {
                id: 'type_jianxiu',
                name: '检修',
                value: TaskTypes.Jianxiu
            }, {
                id: 'type_baoyang',
                name: '保养',
                value: TaskTypes.Baoyang
            }, {
                id: 'type_security',
                name: '安全评测',
                value: TaskTypes.Security
            }, {
                id: 'type_poweroff',
                name: '停电维护',
                value: TaskTypes.Poweroff
            }, {
                id: 'type_other',
                name: '其他',
                value: TaskTypes.Other
            }]
        }
    ];
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

        // // 排序规则：未完成、待审批、已关闭，同样状态的按截止日期排序
        // var stage1 = d1.stage_id;
        // var stage2 = d2.stage_id;
        // var status1 = 0;        // 0:未完成，1：待审批，2：已关闭
        // var status2 = 0;        // 0:未完成，1：待审批，2：已关闭
        // switch (stage1) {
        //     case TaskStatus.Closed:
        //         status1 = 2;
        //         break;
        //     // case TaskStatus.ToClose:
        //     //     status1 = 1;
        //     //     break;
        // }
        // switch (stage2) {
        //     case TaskStatus.Closed:
        //         status2 = 2;
        //         break;
        //     // case TaskStatus.ToClose:
        //     //     status2 = 1;
        //     //     break;
        // }
        // if (status1 !== status2) {
        //     return status1 - status2;
        // }
        // if (d1.create_time < d2.create_time){
        //     return 1;
        // }
        // if (d1.create_time === d2.create_time){
        //     return 0;
        // }
        // return -1;
        // 按更新时间倒叙排列
        if (d1.last_modified_time < d2.last_modified_time) {
            return 1;
        }
        if (d1.last_modified_time > d2.last_modified_time) {
            return -1;
        }
        return 0;
    }

    $scope.getDataList = function(filterParams) {
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
             url = '/opstasks?station=' + stationSns.join(',') + '&task_type=' + OpsTaskType.join(',') + ',11';
             // 筛选
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
            success: function(result) {
                $scope.isLoading = false;
                var tasks = result.aaData ? result.aaData : result, task = null;
                for (var i in tasks){
                    task = tasks[i];
                    formatTaskStatusName(task);
                    // 如果是设备巡检记录的话，处理设备状态
                    if ($scope.isDeviceOps && task.device_record && task.device_record.length) {
                        var deviceRecord = task.device_record[0];
                        if (deviceRecord.status === '有缺陷') {
                            deviceRecord.status_name ='danger';
                        } else if (deviceRecord.status === '未处理') {
                            deviceRecord.status = '待检查';
                            deviceRecord.status_name ='waiting';
                            task.operator_name = task.operator_name || task.current_handler_name;   // 巡检人
                        } else {
                            deviceRecord.status_name = 'normal';
                        }
                        task.device_record = deviceRecord;
                    }
                    if (isTodoTask(task, userAccount)) {
                        task.isMyself = true;
                    }
                    task.isTimeout = $scope.taskTimeout(task);
                    if (task.expect_complete_time) {
                        task.expect_complete_time = task.expect_complete_time.substring(0, 16);
                    }
                    task.last_modified_time = task.last_modified_time.substring(0, 16);
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
            error: function (a,b,c) {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    $scope.updateTask = function (taskData) {
        // 查找任务是否存在
        var exist = false;
        for (var i in $scope.tasks){
            if ($scope.tasks[i].id === taskData.id) {
                $scope.tasks[i] = taskData;
                exist = true;
                break;
            }
        }
        if (!exist){        // 如果不存在，则加入到最前面
            $scope.tasks.unshift(taskData);
        }
        // $scope.tasks.sort(sortFunc);
        $scope.$apply();
    };

    $scope.toCreateTask = function () {
        window.location.href = '/templates/task/add-task.html';
    };

    if (role !== 'USER') {
        $scope.getDataList();
    }
});

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

app.controller('TaskDetailCtrl', function ($scope, $location, $state, userService, platformService, $http, $timeout, $window, ajax, routerService) {
    $scope.TaskAction = TaskAction;
    $scope.TaskStatus = TaskStatus;
    $scope.TaskSource = TaskSource;
    $scope.history = [];
    $scope.lastHistory = null;
    $scope.checkedDeviceCount = 0;
    $scope.xunjianStage = '';
    $scope.host = platformService.getHost() + ":8099/v1";
    var taskType = GetQueryString("taskType");
    if (taskType) {
        taskType = parseInt(taskType);
    }
    $scope.taskName = DtsTaskType.indexOf(taskType) >= 0 ? '缺陷' : '任务';
    var companyId = userService.getCompanyId();

    var id = GetQueryString('id'), username=userService.username;
    $scope.taskData = {};
    var commentActionIndex = -1;     //
    $scope.description = null;
    $scope.canHandle = false;   // 是否有编辑权限
    $scope.files = [];
    $scope.canDelete = false;
    $scope.distance = "";
    var map = null, stationLongitude, stationLatitude;
    var innerPageQuery=null,historyState = [];    // 浏览器历史状态
    $scope.actions = [];

    function getTaskDetail() {

        var option = {
            url: '/opstasks/' + companyId + '/' + id,
            success: function (data) {
                updateTaskInfo(data);

                // mother_task_id不为空，说明该任务是由巡检任务创建的缺陷，需要通知巡检任务更新设备状态
                // if (GetQueryString('mother_task_id')) {
                //     window.android && window.android.onJsCallbackForPrevPage('onAndroidCb_updateDeviceRecord', JSON.stringify(task.device_record[0]));
                // }
            },
            error: function (a, b, c) {
                console.log('get task detail fail');
                $.notify.error('读取数据失败');
            }};
        ajax.get(option);
    }
    getTaskDetail();

    function updateTaskInfo(data) {
        $scope.taskData = formatTaskStatusName(data);
        $scope.taskData.expect_complete_time = data.expect_complete_time ? data.expect_complete_time.substring(0, 16) : '';
        console.log('task canhandle:' + $scope.canHandle);
        $scope.$apply();
        stationLongitude = data.station_longitude;
        stationLatitude = data.station_latitude;
        getTaskHistory();
        if (data.stage_id === TaskStatus.Competition && data.station_latitude && data.station_longitude){
            drawMap($scope.taskData);
        }
        formatTaskStatus();
        if (DtsTaskType.indexOf(data.task_type_id) >= 0) {
            $scope.taskName = '缺陷';
        } else if (data.source === TaskSource.Inspect) {
            $scope.taskName = '巡检';
        } else {
            $scope.taskName = '报修';
        }
    }

    function drawMap(taskData) {
        if (!map)
        {
            map = new BMap.Map("map");
        }          // 创建地图实例
        // 导航
        var driving = new BMap.DrivingRoute(map, {
            renderOptions: {
                map   : map,
                panel : "results",
                autoViewport: true
            },
            onSearchComplete: function (result) {
                if (result){
                    $scope.distance = result.getPlan(0).getDistance();
                    $scope.$apply();
                }
            }
        });
        var end = new BMap.Point(stationLongitude, stationLatitude);
        map.centerAndZoom(end, 15);
        map.enableScrollWheelZoom();
        var marker = new BMap.Marker(end);
        var mgr = new BMapLib.MarkerManager(map,{
            maxZoom: 15,
            trackMarkers: true
        });
        mgr.addMarker(marker,1, 15);
        mgr.showMarkers();

    }

    function formatTaskStatus() {   // 将任务状态转成适合页面显示的格式
        var taskData = $scope.taskData, stageId = taskData.stage_id, activeIndex=0, finishIndex=0, progress=0, canHandle = false;
        if (isTodoTask(taskData, username) || taskData.stage_id == TaskStatus.Competition){
            canHandle = true;
        }
        switch (stageId){
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

        var checkedCount = 0;
        taskData.device_record && taskData.device_record.forEach(function (r) {
            if (r.status !== '未处理') {
                checkedCount += 1;
            }
        });
        $scope.checkedDeviceCount = checkedCount;
        // 设置巡检的阶段
        $scope.xunjianStage = '';
        var stageId= taskData.stage_id;
        if (taskData.task_type_id === 11) {
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
        var formattedList = [], taskData=$scope.taskData;
        var task = null;
        for (var i=0; i<historyList.length; i++){
            task = historyList[i];
            formatTaskHistoryDesp(task);
            // 处理图片列表
            task.pictures
            if (task.action_id === TaskAction.Apply || task.action_id == TaskAction.Update){
                formattedList.push(task);
                var j = i+1, last=true;
                for (; j<historyList.length; j++){
                    if (historyList[j].action_id !== TaskAction.Update){
                        i = j-1;
                        last = false;
                        break;
                    }
                    formattedList.push(historyList[j]);
                }
                if (last)
                i = j;
            }
            else{
                // task.desp = null;
                formattedList.push(task);
            }
        }
        $scope.history = formattedList;
        if (taskData.stage_id === TaskStatus.ToAccept || taskData.stage_id === TaskStatus.ToAssign) {
            setTimeout(initMembers, 200);
        }
    }

    function cloneTaskList(){
        var historyList = [];
        for (var i in $scope.history){
            historyList.push($scope.history[i]);
        }
        return historyList;
    }

    $scope.postAction = function(actionType, description, images, cb) {
        $scope.commonPostAction(id, actionType, description, images, function (data) {
            $scope.taskData = formatTaskStatusName(data);
            // 调用Android接口
            notifyPrevPageToUpdateTask(data);
            formatTaskStatus();
            cb && cb(data);
            getTaskHistory();
        });
    };

    function getTaskHistory() {
        ajax.get({
            url: '/opstasks/' + id + '/update_records',
            success: function (data) {
                console.log('get task history success');
                var history = cloneTaskList();
                history = data;
                if (data.length){
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
        $scope.taskData.report_id = reportId
    };

    $scope.gotoHandleTask = function () {       // 根据任务类型打开对应的操作界面
        var reportId = $scope.taskData.report_id;
        switch ($scope.taskData.task_type_id) {
            case 1:     // 巡检任务
                if (reportId) {
                    var url = '/templates/evaluate/base_home.html?template=/templates/evaluate/security-evaluate-home.html&id=' + reportId;
                } else {
                    var url = '/templates/evaluate/base_home.html?template=/templates/evaluate/security-evaluate-first-classify.html&isCreate=1&taskId=' + $scope.taskData.id;
                    if ($scope.taskData.station_sn){
                        url += '&stationSn=' + $scope.taskData.station_sn + "&stationName=" + $scope.taskData.station_name;
                    }
                }
                $window.location.href = url;
                break;
            case 6:     // 停电维护任务
                var url = '/templates/maintenance-check/base_home.html?template=/templates/maintenance-check/check-one-record-home.html';
                if (reportId) {
                    url += '&id=' + reportId;
                } else {
                    url += '&isCreate=1&taskId=' + $scope.taskData.id;
                    if ($scope.taskData.station_sn){
                        url += '&stationSn=' + $scope.taskData.station_sn + "&stationName=" + $scope.taskData.station_name;
                    }
                }
                $window.location.href = url;
                break;
            default:
                $state.go('.update')
        }
    };

    $scope.showImageGallery = function (images, index) {        // 点击任务处理历史中的图片显示相册
        var imageList = [];
        for (var i=0; i<images.length; i++){
            imageList.push($scope.host + images[i]);
        }
        // $state.go('task.gallery', {index: index, images: imageList});

        routerService.openPage($scope, '/templates/base-gallery.html', {
            index: index,
            images: imageList,
            canDelete: false
        }, {
            hidePrev: false
        });
    };

    $scope.taskHandler = {
        acceptTaskAssign: function () {     // 接受任务
            var btnArray = ['取消', '是'];
            mui.confirm('是否接受该任务？', '接受该任务', btnArray, function(e) {
                if (e.index === 1) {     // 是
                    // $scope.postAction(TaskAction.Accept);
                    $.notify.progressStart();
                    var data = {
                        transfer_user: username
                    };
                    ajax.post({
                        url: '/opstasks/' + companyId + '/' + id + '/actions?action_type=' + TaskAction.Accept,
                        data: JSON.stringify(data),
                        contentType:"application/json",
                        headers: {
                            Accept: "application/json"
                        },
                        timeout: 30000,
                        success: function (data) {
                            $.notify.progressStop();
                            $.notify.info('操作成功');
                            $scope.taskData = formatTaskStatusName(data);
                            // 调用Android接口
                            notifyPrevPageToUpdateTask(data);
                            formatTaskStatus();
                            getTaskHistory();
                            $scope.$apply();
                        },
                        error: function (data) {
                            $.notify.progressStop();
                            console.log('post action fail');
                            $.notify.error('操作失败');
                        }
                    });
                }
            });
        },
        refuseTaskAssign: function () {     // 拒绝任务分配
            var btnArray = ['取消', '确定'];
            mui.prompt('请输入拒绝原因：', '', '拒绝该任务', btnArray, function(e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Refuse, e.value);
                }
            });
        },
        transferHandler: function () {
        },
        gotoSpot: function () {     // 去现场
            $scope.postAction(TaskAction.Go);
        },
        setArrived: function () {   // 已到达
            // $scope.postAction(TaskAction.Arrive);
            $scope.checkActuallyArrived($scope.taskData.id, stationLongitude, stationLatitude, function (taskId, action) {
                $scope.postAction(action);
            });
        },
        showHandlePage: function(query, actionIndex) {        // 打开任务处理页面
            var $page = $(query);
            $page.attr('class', 'inner-page down-to-up');
            commentActionIndex = actionIndex;
            innerPageQuery = query;
        },
        requestTaskComplete: function () {     // 请求关闭任务
            var btnArray = ['取消', '确定'];
            // 如果是巡检任务，检查设备检查情况，如果设备检查没有完成，提示用户
            var description = '确认任务已完成吗？';
            var title = "提交给负责人审核";
            if ($scope.taskData.task_type_id === TaskTypes.Xunjian && $scope.checkedDeviceCount < $scope.taskData.device_record.length) {
                description = '设备检查未完成，确认提交吗？';
            }
            mui.confirm(description, title, btnArray, function(e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Apply, "提交任务审核");
                }
            });
        },
        closeTask: function () {        // 关闭任务
            var btnArray = ['取消', '关闭'];
            mui.confirm('即将关闭任务', '关闭任务', btnArray, function(e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Close, "关闭任务");
                }
            });
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
        location.href='/templates/map.html?id=' + $scope.taskData.id + '&name=' + $scope.taskData.station_name + '&stationSn=' + $scope.taskData.station_sn;
    };

    $scope.gotoDeviceHandlerPage = function () {
        // 打开设备列表页
        routerService.openPage($scope, '/templates/task/device-list.html',
            {
                task: $scope.taskData,
                canHandle: $scope.canHandle && $scope.taskData.stage_id === TaskStatus.Arrived,
                recountFunc: $scope.recountCheckedDevices
            }, {
                hidePrev: false
            }
        );
    };

    $scope.gotoStaticDeviceDetail = function (device) {
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {
            device_id: device.id,
            device_sn: device.sn
        });
    };

    function initMembers() {

        function _format(data, idKey, nameKey) {
            var d = null;
            if (typeof (idKey) === 'undefined'){
                idKey = 'id';
            }
            if (typeof (nameKey) === 'undefined'){
                nameKey = 'name'
            }
            for(var i=0; i<data.length; i++){
                d = data[i];
                d['value'] = d[idKey];
                d['text'] = d[nameKey];
            }
        }
        var userPicker = null;
        ajax.getCompanyMembers(function (data) {
            // 去掉当前处理人
            var currentHandlers = $scope.taskData.current_handler.split(",");
            var stageId = $scope.taskData.stage_id;
            if (stageId === TaskStatus.ToAccept) {
                // 如果是待接单，那么不能将任务转给自己，如果是待指派，可以将任务指派给自己
                data.forEach(function (user, i) {
                    if (currentHandlers.indexOf(user.account) >= 0) {
                        data.splice(i, 1);
                        return false;
                    }
                });
            }
            $scope.memberList = data;
            _format(data, 'account');
            if (!userPicker){
                userPicker = new mui.PopPicker();
                var taskTypeButton = document.getElementById('taskTransferBtn');
                if (taskTypeButton) {
                    taskTypeButton.addEventListener('click', function(event) {
                        userPicker.show(function(items) {
                            var action = stageId === TaskStatus.ToAccept ? TaskAction.Transfer : TaskAction.Assign;
                            $scope.commonPostActionWithParams($scope.taskData.id, action, {transfer_user: items[0].value}, function (data) {
                                $scope.taskData = formatTaskStatusName(data);
                                // 调用Android接口
                                notifyPrevPageToUpdateTask(data);
                                formatTaskStatus();
                                getTaskHistory();
                            });
                        });
                    }, false);
                }
            }
            userPicker.setData(data);
        });
    }

    $scope.recountCheckedDevices = function () {
        // 重新计算已检查的设备数
        var checkedCount = 0;
        $scope.taskData.device_record.forEach(function (r) {
            if (r.status && r.status !== '未处理') {
                checkedCount += 1;
            }
        });
        $scope.checkedDeviceCount = checkedCount;
    }
});

app.controller('TaskHandlerUpload', function ($document, $scope, $timeout, routerService) {
    $scope.images = [];
    $scope.description = '';

    $scope.registerImageInfo = function (imageEleId) {
        return $scope.images;
    };

    $scope.submitAndBack = function() {   //上传描述和图片
        if (!$scope.description && !$scope.images.length){
            mui.alert('评论与图片不能同时为空', '无法提交', function() {
            });
            return;
        }
        $scope.postAction(TaskAction.Update, $scope.description, $scope.images, function () {       // 上传成功，清空本次信息
            $timeout(function () {
                $scope.cancel();
            }, 500);
        });
    };

   $scope.cancel = function () {
       window.history.back();
   };
});

app.controller('TaskGalleryCtrl', function ($scope, $stateParams, $timeout) {
    $scope.canDelete = false;
    $scope.index = $stateParams.index;
    $scope.images = $stateParams.images;
    $scope.show = false;

    $scope.deleteImage = function() {       // 删除图片
        var index = $("#slides .slidesjs-pagination a.active").parent().index();
        if (index < 0) {
            index = 0;
        }
        $('div[ng-controller="TaskHandlerUpload"]').scope().deleteImage(index);
        history.back();
    };


    function initSlider() {
        if ($scope.images.length>1){

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
});

app.controller('TaskCloseRejectCtrl', function ($scope) {      //驳回关闭请求

    $scope.submit = function () {

        $scope.postAction(TaskAction.Reject, $scope.description, null, function () {
            history.back();
        });
    };
});

app.controller('TaskCreateCtrl', function ($scope, $timeout, userService, routerService, ajax, cloudApi) {
    $scope.stationName = null;
    $scope.taskTypeName = null;
    $scope.handlerName = null;
    $scope.deviceName = null;
    $scope.user = null;
    $scope.linkEventId = GetQueryString("eventId");
    $scope.linkEventInfo = null;
    $scope.imageList = [];
    var isGrabTask = false;
    var staticDevices = [];
    var stations = [];
    var currentStation = null;

    $scope.taskData = {
        events: [],
        devices: []
    };
    var devicePicker = null;
    var userPicker = null;
    var opsCompanyId = null;
    function init() {
        if($scope.linkEventId && $scope.linkEventId !== '') {
            initLinkEvent();
        } else {
            initStations();
        }   
        initTaskTypeList();
        initDatePicker();
        initMembers();
    }

    function _format(data, idKey, nameKey) {
        var d = null;
        if (typeof (idKey) === 'undefined'){
            idKey = 'id';
        }
        if (typeof (nameKey) === 'undefined'){
            nameKey = 'name'
        }
        for(var i=0; i<data.length; i++){
            d = data[i];
            d['value'] = d[idKey];
            d['text'] = d[nameKey];
        }
    }

    function initLinkEvent() {
        ajax.get({
            url: '/events/' + $scope.linkEventId,
            success: function (data) {
                $scope.linkEventInfo  = data.info;
                $scope.stationName = data.station_name;
                $scope.deviceName = data.device_name;
                $scope.taskData.station_sn = data.station_sn;
                $scope.taskData.events.push({"id": $scope.linkEventId });
                $scope.taskData.devices.push({"id": data.device_id });
                if (data.station_sn) {
                    getDevices({sn: data.station_sn});
                }
                $scope.$apply();
            },
            error: function(){
                console.log('获取事件信息失败: '+$scope.linkEventId);
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
                _format(stations, 'sn');
                // 初始化picker
                var stationPicker = new mui.PopPicker();
                stationPicker.setData(stations);
                var showUserPickerButton = document.getElementById('stationPicker');
                showUserPickerButton.addEventListener('click', function(event) {
                    stationPicker.show(function(items) {
                        $scope.taskData.station_sn = items[0].value;
                        $scope.stationName = items[0].text;
                        getDevices(items[0]);
                        $scope.$apply();
                        // 切换站点后，如果运维公诉不一样，需要重新刷新责任人列表
                        for (var i=0; i<stations.length; i++) {
                            if (stations[i].sn === items[0].value) {
                                currentStation = stations[i];
                                if (opsCompanyId !== currentStation.ops_company_id) {
                                    opsCompanyId = currentStation.ops_company_id;
                                    initMembers(opsCompanyId);
                                }
                                break;
                            }
                        }
                    });
                }, false);
            },
            error: function(){
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

    $scope.registerImageInfo = function (imageEleId) {
        return $scope.imageList;
    };

    $scope.openDeviceSelector = function () {
        // 打开设备选择页面
        routerService.openPage($scope, '/templates/dts/device-select-page.html', {
            deviceDatas: staticDevices,
            onSelect: function (device) {
                $scope.deviceName = device.name;
                $scope.taskData.devices = [{id: device.id, sn: device.sn}];
                history.back();
            }
        })
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
                var taskTypePicker = new mui.PopPicker();
                taskTypePicker.setData(taskTypes);
                var taskTypeButton = document.getElementById('taskTypePicker');
                taskTypeButton.addEventListener('click', function(event) {
                    taskTypePicker.show(function(items) {
                        $scope.taskTypeName = items[0].text;
                        $scope.taskData.task_type_id = items[0].value;
                        $scope.$apply();
                        // userResult.innerText = JSON.stringify(items[0]);
                        //返回 false 可以阻止选择框的关闭
                        //return false;
                    });
                }, false);
            },
            error: function () {
                console.log('获取任务类型失败');
            }
        });
    }

    var companyId = userService.getTaskCompanyId();
    function initMembers(opsCompanyId) {
        function _clearPicker() {
            if (userPicker) {
                userPicker.dispose();
                userPicker = null;
                $scope.handlerName = null;
            }
        }
        if (opsCompanyId) {
            cloudApi.getOpsCompanyMembers(opsCompanyId, function (members) {
                if (members) {
                    $scope.memberList = members;
                    _format(members, 'account');
                    if (!userPicker){
                        userPicker = new mui.PopPicker();
                        var taskTypeButton = document.getElementById('handlerPicker');
                        taskTypeButton.addEventListener('click', function(event) {
                            userPicker.show(function(items) {
                                $scope.handlerName = items[0].text;
                                $scope.taskData.current_handler = items[0].value;
                                $scope.$apply();
                                // userResult.innerText = JSON.stringify(items[0]);
                                //返回 false 可以阻止选择框的关闭
                                //return false;
                            });
                        }, false);
                    }
                    userPicker.setData(members);
                } else {
                    _clearPicker();
                }
            });
        } else {
            _clearPicker();
        }
    }

    function initDatePicker() {

        document.getElementById('expectedTime').addEventListener('tap', function() {
            var _self = this;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    $scope.taskData.expect_complete_time = rs.text + ':00';
                    $scope.$apply();
                });
            } else {
                var optionsJson = this.getAttribute('data-options') || '{}';
                var options = JSON.parse(optionsJson);
                var id = this.getAttribute('id');
                /*
                 * 首次显示时实例化组件
                 * 示例为了简洁，将 options 放在了按钮的 dom 上
                 * 也可以直接通过代码声明 optinos 用于实例化 DtPicker
                 */
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    $scope.taskData.expect_complete_time = rs.text + ":00";
                    // _self.picker.dispose();
                    // _self.picker = null;
                    $scope.$apply();
                });
            }
        }, false);
    }
    
    $scope.handlerIsInvalid = function (form) {
        if (form.$submitted && ((!isGrabTask && !$scope.taskData.current_handler))){
            return true;
        }
        return false;
    };

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
            $scope.imageList.forEach(function (data, index) {
                taskData['file' + (index+1)] = data;
            });
        }
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + opsCompanyId,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(taskData),
            success: function (data) {
                $.notify.progressStop();
                $.notify.info('创建成功');
                $timeout(function () {
                    window.location.href = 'task-detail.html?finishPage=1&id=' + data.id;       // 设置finish=1，这样在Android端在打开新页面时，会将当前页finish掉
                }, 800);
            },error: function () {
                $.notify.progressStop();
                $.notify.error('创建失败');
                console.log('error');
            }
        });
    };

    $scope.toggleTaskType = function () {
        isGrabTask = !isGrabTask;
        if (isGrabTask){
            $scope.handlerName = null;
            $scope.taskData.current_handler = null;
            $scope.$apply();
        }
    };

    $scope.submitForm = function() {
        if($scope.myForm.$invalid || $scope.handlerIsInvalid($scope.myForm)){
            console.log('form invalid');
        } else {
            $scope.createTask();
        }
    };

    init();
});

// 巡检所有设备处理页面
app.controller('TaskDevicesHandlerCtrl', function ($scope, routerService, ajax) {

    $scope.device_record = $scope.task.device_record;
    $scope.checkedSns = [];
    $scope.checkAll = false;
    $scope.isSubmitting = false;

    $scope.device_record.forEach(function (r) {
        if (r.status === '1') {
            r.status_name = '正常';
            r.className = 'normal';
        } else if (r.status === '2') {
            r.status_name = '异常';
            r.className = 'danger';
        } else {
            r.status_name = "待巡检";
            r.className = "undo";
        }
        r.checked = false;
    });

    function init() {
        var deviceSns = [];
        var pathExist = false;
        $scope.device_record.forEach(function (r) {
            // if (r.device.path) {
            //     pathExist = true;
            //     return false;
            // }
            deviceSns.push(r.device_sn);
        });
        // if (!pathExist && deviceSns.length) {
        //     ajax.get({
        //         url: '/staticdevices/path',
        //         data: {
        //             station_sn: $scope.task.station_sn,
        //             device_sns: deviceSns.join(',')
        //         },
        //         success: function (response) {
        //             $scope.device_record.forEach(function (record) {
        //                 record.device.path = response[record.device_sn];
        //             });
        //             $scope.$apply();
        //
        //         }
        //     });
        // }
    }

    $scope.checkDevice = function ($event, sn) {
        var index = $scope.checkedSns.indexOf(sn);
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
        })
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
            $.notify.toast('请至少选择一个设备', 1000);
            return;
        }

    };

    $scope.setStatusOk = function () {
        if ($scope.checkedSns.length === 0) {
            $.notify.toast('请至少选择一个设备', 1000);
            return;
        }
        var params = [];
        $scope.checkedSns.forEach(function (t) { 
            params.push({
                task_id: $scope.task.id,
                device_sn: t,
                status: '1'
            })
        });
        $scope.isSubmitting = true;
        ajax.patch({
            url: '/opstasks/devices',
            data: JSON.stringify(params),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            success: function (response) {
                $scope.isSubmitting = false;
                if (response.code === 200) {
                    $.notify.toast('设置成功', 1000);
                    $scope.device_record.forEach(function (r) {
                        if (r.checked) {
                            r.status = '1';
                            r.status_name = '正常';
                            r.className = "normal";
                            $scope.checkDevice(null, r.device_sn);
                        }
                    });
                    $scope.toggleCheckAll(false);
                    $scope.recountFunc();
                }
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
            $.notify.toast('请选择一个设备再提交', 1000);
            return;
        }
        if ($scope.checkedSns.length > 1) {
            $.notify.toast('只能选择一个设备提交', 1000);
            return;
        }
        var record = null;
        $scope.device_record.forEach(function (r) {
            if (r.checked) {
                record = r;
                return false;
            }
        });
        routerService.openPage($scope, '/templates/task/dts-create-from-task.html', {
            task_id: $scope.task.id,
            station_sn: $scope.task.station_sn,
            device_sn: record.device_sn,
            path: record.device.path,
            name: record.device.name,
            isInPage: true
        });
        // location.href = '/templates/dts/dts-create.html?task_id=' + $scope.task.id + '&station_sn=' + $scope.task.station_sn +
        //     '&device_sn=' + record.device_sn + '&path=' + record.device.path + '&name=' + record.device.name;
    };

    $scope.gotoDevice = function(deviceData){
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {device_id: deviceData.id, device_sn: deviceData.sn});
        return false;
    };

    $scope.updateDeviceRecordWidthDts = function (deviceRecord) {
        $scope.device_record.forEach(function (r) {
            if (r.device_sn === deviceRecord.device_sn) {
                r.status = deviceRecord.status;
                r.desp = deviceRecord.desp;
                r.photo_links = deviceRecord.photo_links;
                r.status_name = '有缺陷';
                r.className = "danger";
                $scope.checkDevice(null, deviceRecord.device_sn);
                return false;
            }
        });
        $scope.recountFunc();
    };

    init();
});

// 巡检单个设备的处理页面
app.controller('TaskDeviceCheckCtrl', function ($scope, ajax) {
    var taskId = 386;
    var deviceSn = 'zjdemo__ZsHdYj__DEVICE00009';
    $scope.deviceName = "设备1";
    $scope.result = {};
    $scope.checkItems = [];
    $scope.total = 0;
    $scope.checked = 0;
    $scope.exception = 0;
    $scope.isLoading = false;
    $scope.canEdit = true;

    function getDeviceCheckItems() {
        ajax.get({
            url: '/opstasks/' + taskId + '/devices/' + deviceSn + "?withCheckItems=true",
            success: function (data) {
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
        })
    }

    $scope.setItemPass = function (checkItem, pass) {
        checkItem.pass = pass;
    };

    $scope.saveCheckItems = function () {
        var params = [];
        $scope.checkItems.forEach(function (t) {
            params.push({
                id: t.id,
                pass: t.pass,
                result_desp: t.result_desp
            });
        });
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + taskId + '/setStepsResult',
            data: JSON.stringify(params),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            success: function (response) {
                $.notify.progressStop();
                $.notify.info('结果已保存', 500);
            },
            error: function () {
                $.notify.progressStop();
                $.notify.error('保存巡检结果失败');
            }
        })
    };

    $scope.setDevicePass = function (pass) {
      $scope.result.pass = pass;
    };

    getDeviceCheckItems();
});

app.controller('DeviceXunjianTaskDetailCtrl', function ($scope, ajax, platformService, routerService) {
    var taskId = GetQueryString("id");
    var deviceSn = GetQueryString("device_sn");
    $scope.taskData = {};
    $scope.checkResult = {};
    function getTaskDetail(id) {

        ajax.get({
            url: '/opstasks',
            data: {
                task_ids: id
            },
            success: function (data) {
                data[0].device_record.forEach(function (r) {
                    if (r.device_sn === deviceSn) {
                        if (r.photo_links) {
                            var images = [];
                            r.photo_links.split(',').forEach(function (src) {
                                // images.push(platformService.getImageUrl(width, height, platformService.host + src));
                                images.push(platformService.host + '/images/' + src);
                            });
                            r.images = images;
                        }
                        if (r.status === '1') {
                            r.status_name = '正常';
                            r.className = 'normal';
                        } else if (r.status === '2') {
                            r.status_name = '异常';
                            r.className = 'danger';
                        } else {
                            r.status_name = "待巡检";
                            r.className = "undo";
                        }
                        $scope.checkResult = r;
                        return false;
                    }
                });
                $scope.taskData = data[0];
                $scope.$apply();

            },
            error: function (a, b, c) {
                $.notify.error('读取数据失败');
            }
        });
    }

    $scope.openGallery = function (index) {
        routerService.openPage($scope, '/templates/base-gallery.html', {
            index: index+1,
            images: $scope.checkResult.images,
            canDelete: false
        }, {
            hidePrev: false
        });
    };

    getTaskDetail(taskId);
});