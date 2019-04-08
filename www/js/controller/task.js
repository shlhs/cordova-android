
"use strict";
/**
 * Created by liucaiyun on 2017/7/20.
 */

var TaskTypes = {
    Xunjian: 11
};
var OpsTaskType = [1, 2, 3, 4, 5, 6, 7, 11];
var DtsTaskType = [8, 9, 10];

var TaskAction = {Create: 0, Accept: 1, Refuse: 2, Assign: 3, Go: 4, Apply: 5, Reject: 6, Close: 7, Comment: 8, Grab: 9, Arrive: 10, Update: 11, Transfer: 12};
var TaskStatus = {ToAccept: 1, ToAssign: 2, Accepted: 3, ToClose: 4, Closed: 5, Competition: 6, Coming: 7, Arrived: 8};

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

function onAndroid_taskImageImport(imageData, filename) {    // 从Android读取的图片
    var scope = angular.element("#handlePage").scope();
    if (scope) {
        scope.addImagesWithBase64(imageData, filename);
    }
}

function onAndroid_taskImageDelete(filename) {       // Android手机上删除所选图片
    angular.element("#handlePage").scope().deleteImageFromMobile(filename);
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

app.controller('HomeCtrl', function ($scope, $timeout, userService, ajax, $state, $rootScope, Permission, appStoreProvider) {

    var company = userService.company;
    var map = null;
    var role = userService.getUserRole();
    $scope.viewName = '';
    $scope.tabName = 'sites';
    $scope.title = '';
    $scope.navMenus = [];

    function homeInitialize() {
        window.android && window.android.homeInitialize();      // 进入主界面后进行初始化
    }

    $scope.chooseNav = function (tabName, title) {
        $scope.tabName = tabName;
        $scope.title = title;
        var element=angular.element('#' + tabName).children().first(), scope = element.scope();
        if (scope.getDataList && !element.data('inited')){
            scope.getDataList();
            element.data('inited', true);
        } else {
            $scope.$broadcast('onChooseNav', tabName);
        }
        angular.element('#' + tabName).addClass('mui-active').siblings().removeClass('mui-active');
    };


    function initMenu() {
        $timeout(function () {
            homeInitialize();
            $scope.chooseNav('sites', '站点监控');
        }, 500);
    }

    function addMenuOfOps() {
        $scope.navMenus.push(
            {
                id: 'competition_tasks',
                name: '抢单',
                templateUrl: 'templates/task/task-competition-list.html',
                icon: 'nav-task-grab'
            },
            {
                id: 'my_tasks',
                name: '我的待办',
                templateUrl: 'templates/task/task-todo-list.html',
                icon: 'nav-all-tasks'
            }
        );
    }

    var menuUpdateListener = $scope.$on('$onMenuUpdate', function (event, menuSns) {
        // 菜单权限刷新
        // 判断是否包含ops-management权限
        if (appStoreProvider.hasOpsAuth()) {
            if (!$scope.navMenus.length) {
                addMenuOfOps();
            }
        } else {
            $scope.navMenus = [];
        }
    });

    $scope.$on('$destroy', function (event) {
        if (menuUpdateListener) {
            menuUpdateListener();
            menuUpdateListener = null;
        }
    });
    initMenu();
});

app.controller('TaskBaseCtrl', function ($scope, ajax, userService, routerService, appStoreProvider) {
    var map = null;
    $scope.hasOpsAuth = appStoreProvider.hasOpsAuth();

    $scope.taskTimeout = function (task) {
        // 如果任务已关闭或已提交审核，则认为已完成
        if (task.stage_id === TaskStatus.Closed || task.stage_id === TaskStatus.ToClose){
            return false;
        }
        var today = new Date().Format('yyyy-MM-dd HH:mm:ss.S');
        if (task.expect_complete_time < today) {
            task.stage = '已超时';
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
            for (var i=0; i<images.length; i++){
                data['file' + (i+1)] = images[i];
            }
        }
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId+ '/' + taskId + '/actions?action_type=' + actionType,
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
        /*
        $.notify.progressStart();
        apiLocation.start(function (longtitude, latitude) {     // 获取用户的当前位置
            // 判断位置是否一致
            if (typeof (longtitude) !== 'undefined'){
                var start = new BMap.Point(longtitude, latitude);
                // 坐标转换
                var convertor = new BMap.Convertor();
                var pointArr = [start];
                convertor.translate(pointArr, 3, 5, function (data) {
                    // 计算用户与站点的直线距离
                    if (!map){
                        map = new BMap.Map("map");          // 创建地图实例
                    }
                    var sitePoint = new BMap.Point(siteLongitude, siteLatitude);
                    var distance = map.getDistance(data.points[0], sitePoint);
                    if (distance > 300){    // 距离大于300米，无法确认到达
                        $.notify.progressStop();
                        $.notify.error('检测到您未到达现场');
                    }else{
                        // 需要先检查是否真的已到现场
                        cb && cb(taskId, TaskAction.Arrive);
                        return;
                    }
                });
            }else{
                $.notify.progressStop();
                $.notify.error('无法获取当前位置');
            }
        });
        */
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
        scrollerService.initScroll('#competition_tasks_scroll', $scope.getDataList);
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

    $scope.openTask = function (task) {
        $scope.openPage($scope, '/templates/task/task-detail.html', {
            id: task.id
        });
    };

    var taskUpdateListener = $scope.$on('onTaskUpdate', function (event, taskData) {
        var task = null;
        var exist = false;
        for (var i in $scope.tasks){
            task = $scope.tasks[i];
            if (parseInt(task.id) === parseInt(taskData.id) && taskData.stage_id !== TaskStatus.Competition){
                // 从任务列表中删除
                $scope.tasks.splice(i, 1);
                exist = true;
                break;
            }
        }
        if (!exist && taskData.stage_id === TaskStatus.Competition) {
            formatTaskStatusName(formatTime(taskData));
            $scope.tasks.unshift(taskData);
        }
    });

    $scope.$on('$destroy', function (event) {
        if (taskUpdateListener) {
            taskUpdateListener();
            taskUpdateListener = null;
        }
    });

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
                $scope.$emit('onBaseTaskUpdate', data);
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

app.controller('TaskTodoListCtrl', function ($scope, $rootScope, scrollerService, userService, routerService, ajax, TaskStatus) {
    var allTasks = [];
    var username = userService.user.account;
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.showType = 'todo';    // all, open, closed, todo
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;

    $scope.getDataList = function() {
        scrollerService.initScroll("#taskTodoList", $scope.getDataList);
        $scope.isLoading = true;
        $scope.loadingFailed = false;

        ajax.get({
            url: "/opstasks/todo",
            data:{
                page_size: 100,
                page_index: 0,
                s_echo: 0
            },
            success: function(result) {
                $scope.isLoading = false;
                result.aaData.sort(sortByUpdateTime);
                var tasks = result.aaData, task = null;
                for (var i in tasks){
                    task = tasks[i];
                    formatTaskStatusName(task);
                    task.isTimeout = $scope.taskTimeout(task);
                }
                allTasks = result.aaData;
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

    $scope.openTask = function (task) {
        $scope.openPage($scope, '/templates/task/task-detail.html', {
            id: task.id
        });
    };

    $scope.openTaskCreatePage = function () {
        routerService.openPage($scope, '/templates/task/add-task.html');
    };

    $scope.updateTask = function (taskData) {
        // 查找任务是否存在
        var exist = false;
        for (var i in allTasks){
            if (allTasks[i].id === taskData.id){
                // 如果责任人不是当前用户，则从列表中删除
                if (isTodoTask(taskData)) {
                    allTasks[i] = taskData;
                } else {
                    allTasks.splice(i, 1);
                }
                exist = true;
                break;
            }
        }
        if (!exist && isTodoTask(taskData)){        // 如果不存在，且是待办任务的话则加入到最前面
            allTasks.unshift(taskData);
        }
        // allTasks.sort(sortByUpdateTime);
        $scope.changeTaskType(null, $scope.showType);
        $scope.$apply();
    };

    function isTodoTask(task) {
        if (task.stage_id !== TaskStatus.Closed && task.current_handler === username){
            return true;
        }
        return false;
    }

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
                if (task.stage_id !== TaskStatus.Closed && task.current_handler === username){
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
        $scope.openPage($scope, '/templates/task/task-list.html');
    };

    var taskUpdateListener = $scope.$on('onTaskUpdate', function (event, task) {
        formatTaskStatusName(task);
        task.isTimeout = $scope.taskTimeout(task);
        $scope.updateTask(task);
    });

    $scope.$on('$destroy', function (event) {
        if (taskUpdateListener) {
            taskUpdateListener();
            taskUpdateListener = null;
        }
    });
});

app.controller('TaskListCtrl', function ($scope, $rootScope, scrollerService, userService, routerService, ajax) {
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.showType = 'all';    // all, open, closed, todo
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;
    var deviceSn = $scope.device ? $scope.device.sn : null;     // 如果设备sn不为空，则获取的是设备的运维记录
    $scope.isDeviceOps = deviceSn ? true : false;
    $scope.pageTitle = deviceSn ? '运维记录' : '所有任务';

    function sortFunc(d1, d2) {

        // 排序规则：未完成、待审批、已关闭，同样状态的按截止日期排序
        var stage1 = d1.stage_id;
        var stage2 = d2.stage_id;
        var status1 = 0;        // 0:未完成，1：待审批，2：已关闭
        var status2 = 0;        // 0:未完成，1：待审批，2：已关闭
        switch (stage1) {
            case TaskStatus.Closed:
                status1 = 2;
                break;
            // case TaskStatus.ToClose:
            //     status1 = 1;
            //     break;
        }
        switch (stage2) {
            case TaskStatus.Closed:
                status2 = 2;
                break;
            // case TaskStatus.ToClose:
            //     status2 = 1;
            //     break;
        }
        if (status1 !== status2) {
            return status1 - status2;
        }
        if (d1.expect_complete_time > d2.expect_complete_time){
            return 1;
        }
        if (d1.expect_complete_time === d2.expect_complete_time){
            return 0;
        }
        return -1;
    }

    $scope.getDataList = function() {
        scrollerService.initScroll("#taskList", $scope.getDataList);
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        var companyId = userService.getTaskCompanyId();
        var url = "/opstasks/history/" + companyId;
        if (deviceSn) {
            url = "/staticdevices/opstasks/" + deviceSn + '?types=' + OpsTaskType.join(',');
        }
        ajax.get({
            url: url,
            data:{
                page_size: 100,
                page_index: 0,
                s_echo: 0
            },
            success: function(result) {
                $scope.isLoading = false;
                result.aaData.sort(sortFunc);
                var tasks = result.aaData, task = null;
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
                    task.isTimeout = $scope.taskTimeout(task);
                }
                $scope.tasks = result.aaData;
                $scope.$apply();
            },
            error: function (a,b,c) {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    $scope.openTask = function (task) {
        $scope.openPage($scope, '/templates/task/task-detail.html', {
            id: task.id,
        });
    };

    var taskUpdateListener = $scope.$on('onTaskUpdate', function (event, task) {
        formatTaskStatusName(task);
        task.isTimeout = $scope.taskTimeout(task);
        $scope.updateTask(task);
    });

    $scope.$on('$destroy', function (event) {
        if (taskUpdateListener) {
            taskUpdateListener();
            taskUpdateListener = null;
        }
    });

    $scope.openTaskCreatePage = function () {
        routerService.openPage($scope, '/templates/task/add-task.html', {
            station_sn: $scope.station_sn,
            device: $scope.device
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
        $scope.$apply();
    };

    setTimeout($scope.getDataList, 500);
});

app.controller('TaskDetailCtrl', function ($scope, $location, $state, userService, platformService, $http, $timeout, $window, ajax, routerService) {
    $scope.TaskAction = TaskAction;
    $scope.TaskStatus = TaskStatus;
    $scope.imageScope = [1,2,3,4,5,6,7,8,9];
    $scope.history = [];
    $scope.lastHistory = null;
    $scope.scope = $scope;
    $scope.checkedDeviceCount = 0;
    $scope.xunjianStage = '';
    var taskType = GetQueryString("taskType");
    if (taskType) {
        taskType = parseInt(taskType);
    }
    $scope.taskName = DtsTaskType.indexOf(taskType) >= 0 ? '缺陷' : '任务';

    var id = $scope.$parent.id, username=userService.username;
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

    var userPicker = null;


    var companyId = userService.getTaskCompanyId();
    function updateUserActions() {      // 更新用户的操作权限
        if (taskData.current_handler !== username){
            $scope.canHandle = false;
            return;
        }
        $scope.canHandle = true;

    }

    function getTaskDetail() {

        var option = {
            url: '/opstasks',
            data: {
                task_ids: id
            },
            success: function (data) {
                var task = data[0];
                updateTaskInfo(task);
            },
            error: function (a, b, c) {
                console.log('get task detail fail');
                $.notify.error('读取数据失败');
            }};
        ajax.get(option);
    }

    setTimeout(getTaskDetail, 500);

    function updateTaskInfo(data) {
        $scope.taskData = formatTaskStatusName(data);
        $scope.taskData.expect_complete_time = data.expect_complete_time.substring(0, 16);
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
        } else {
            $scope.taskName = '任务';
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
        if (taskData.current_handler === username || taskData.stage_id == TaskStatus.Competition){
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
        $scope.canHandle = (taskData.current_handler === username) && canHandle;
        var checkedCount = 0;
        taskData.device_record.forEach(function (r) {
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
        }
        return taskData;
        return taskData;
    }

    function formatActions(historyList) {      // 将操作历史格式化成界面显示
        var formattedList = [], taskData=$scope.taskData;
        var task = null;
        for (var i=0; i<historyList.length; i++){
            task = historyList[i];
            formatTaskHistoryDesp(task);
            if (task.action_id === TaskAction.Apply || task.action_id === TaskAction.Update){
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
            formatTaskStatus();
            cb && cb(data);
            getTaskHistory();
            // 通知任务更新
            $scope.$emit("onBaseTaskUpdate", data);
        });
    };

    function getTaskHistory() {
        ajax.get({
            url: '/opstasks/' + companyId + '/' + id + '/update_records',
            success: function (data) {
                var history = data;
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

    $scope.gotoHandleTask = function () {       // 根据任务类型打开对应的操作界面
        var reportId = $scope.taskData.report_id;
        switch ($scope.taskData.task_type_id) {
            case 1:     // 巡检任务
                $scope.openPage($scope, '/templates/evaluate/security-evaluate-home.html', {id: reportId});
                break;
            case 6:     // 停电维护任务
                $scope.openPage($scope, '/templates/maintenance-check/check-one-record-home.html', {id: reportId});
                break;
            default:
                $state.go('.update')
        }
    };

    $scope.showImageGallery = function (images, index) {        // 点击任务处理历史中的图片显示相册
        var imageList = [];
        for (var i in $scope.imageScope){
            if (images['picture' + i]){
                imageList.push(platformService.host + images['picture' + i]);
            }
        }
        // $state.go('task.gallery', {index: index, images: imageList});
        $scope.openPage($scope, '/templates/base-gallery.html', {
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
                    $scope.postAction(TaskAction.Accept);
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

    $scope.openMap = function () {
        location.href='map.html?id=' + $scope.taskData.id + '&name=' + $scope.taskData.station_name;
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
        userPicker = null;
        ajax.getCompanyMembers(function (data) {

            // 去掉当前处理人
            var currentHandler = $scope.taskData.current_handler;
            var stageId = $scope.taskData.stage_id;
            if (stageId === TaskStatus.ToAccept) {
                // 如果是待接单，那么不能将任务转给自己，如果是待指派，可以将任务指派给自己
                data.forEach(function (user, i) {
                    if (user.account === currentHandler) {
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
                                $scope.$emit('onBaseTaskUpdate', data);
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
    };

    $scope.$on('$destroy', function (event) {
       if (userPicker) {
           userPicker.dispose();
           userPicker = null;
       }
    });
});

function importImage(imageData) {    // 从Android读取的图片
    angular.element("#handlePage").scope().addImagesWithBase64(imageData);
}

function deleteImage () {       // 删除图片
    var index = $("#slides .slidesjs-pagination a.active").parent().index();
    $('div[ng-controller="TaskHandlerUpload"]').scope().removeFile(index);
    history.back();
}
app.controller('TaskHandlerUpload', function ($scope, $timeout) {
    $scope.files = [];
    $scope.description = '';
    $scope.isPC = IsPC();
    $scope.useMobileGallery = window.android && window.android.openGallery;
    $scope.uploadDisabled = false;
    var insertPosition = angular.element("#imageList>.upload-item");

    // 先清除上一次选择的图片
    window.android && window.android.clearSelectedPhotos();

    $scope.removeFile = function (index) {
        $scope.files.splice(index, 1);
        if ($scope.files.length < 9) {
            $scope.uploadDisabled = false;
        }
    };

    $scope.chooseImage = function (files) {     // 选择图片
        $scope.canDelete = true;
       for (var i = 0; i < files.length; i++) {
           var reader = new FileReader(), file=files[i];
           reader.readAsDataURL(file);
           reader.onloadstart = function () {
               //用以在上传前加入一些事件或效果，如载入中...的动画效果
           };
           reader.onload = function (event) {
               var img = new Image();
               img.src = event.target.result;
               img.onload = function(){
                   var quality =  75;
                   var dataUrl = imageHandler.compress(this, 75, file.orientation).src;
                   // 如果超过9张，则后面的不上传
                   if ($scope.files.length < 9) {
                       $scope.files.push(dataUrl);
                   }
                   if ($scope.files.length >= 9) {
                       $scope.uploadDisabled = true;
                   }
                   $scope.$apply();
               };
           };
       }
   } ;

    $scope.openMobileGallery = function () {
        window.android.openGallery(9, 'onAndroid_taskImageImport', 'onAndroid_taskImageDelete');
    };

    $scope.submitAndBack = function() {   //上传描述和图片
        if (!$scope.description && !$scope.files.length){
            mui.alert('评论与图片不能同时为空', '无法提交', function() {
            });
            return;
        }
        var images = [];
        insertPosition.prevAll().each(function (i, n) {
            var imageUrl = $(n).find('.img-file').css('background-image');
            images.push(imageUrl.substring(5, imageUrl.length-2));
        });
        $scope.postAction(TaskAction.Update, $scope.description, images, function () {       // 上传成功，清空本次信息
            $timeout(function () {
                window.history.back();
            }, 500);
        });
    };

   $scope.addImagesWithBase64 = function (data) {
       $scope.canDelete = true;
       $scope.files.push(data);
       $scope.$apply();
   };

   $scope.openGallery = function (data) {

       $scope.openPage($scope, 'templates/base-gallery.html', $.extend({}, data, {
           onDelete: function (index) {
               $scope.files.splice(index, 1);
           }
       }));
   }

});

app.controller('GalleryCtrl', function ($scope, $stateParams, $timeout) {
    // $scope.canDelete = false;
    // $scope.index = $stateParams.index;
    // $scope.images = $stateParams.images;
    $scope.show = false;

    $scope.deleteImage = function() {       // 删除图片
        var index = $("#slides .slidesjs-pagination a.active").parent().index();
        $('div[ng-controller="TaskHandlerUpload"]').scope().removeFile(index);
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

        // $scope.canDelete = $stateParams.canDelete;
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


app.controller('TaskCreateCtrl', function ($scope, $stateParams, $timeout, routerService, userService, ajax) {
    var companyId = userService.getTaskCompanyId();
    $scope.stationName = null;
    $scope.taskTypeName = null;
    $scope.handlerName = null;
    $scope.deviceName = $scope.device && $scope.device.name;
    $scope.user = null;
    $scope.isGrabTask = false;
    var staticDevices = [];

    var taskTypePicker = null;
    var stationPicker = null;
    var devicePicker = null;
    var userPicker = null;
    var datePicker = null;
    $scope.taskData = {
        station_sn: $scope.station_sn,
        devices: $scope.device ? [{id: $scope.device.id, sn: $scope.device.sn}] : [],
        events: []
    };
    function init() {
        if($scope.linkEventId && $scope.linkEventId != '') {
            initLinkEvent();
        } else {
            initStations();
        }
        initTaskTypeList();
        initDatePicker();
        initMembers();
    }

    var normalToggleActive = false;
    $scope.toggleNormalTask = function () {
        normalToggleActive = !normalToggleActive;
        //event.detail.isActive 可直接获取当前状态
        if (normalToggleActive){ //开关打开，为抢单任务
            var handlerBtn = document.getElementById('handlerPicker');
            handlerBtn.disabled = true;
            $(handlerBtn.parentNode).addClass('disabled');
            $scope.toggleTaskType();
            // 抢单任务没有责任人

        }else{
            var handlerBtn = document.getElementById('handlerPicker');
            handlerBtn.disabled = false;
            $(handlerBtn.parentNode).removeClass('disabled');
            $scope.toggleTaskType();
        }
    };

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
                var stationList = [];
                data.forEach(function (item) {
                    if (!item.is_group) {
                        if (item.sn === $scope.station_sn) {
                            $scope.stationName = item.name;
                            return false;
                        }
                        stationList.push(item);
                    }
                });
                // 如果是从设备档案里新建，则无法选择站点
                if ($scope.station_sn) {
                    $scope.$apply();
                    return;
                }
                _format(stationList, 'sn');
                // 初始化picker
                stationPicker = new mui.PopPicker();
                stationPicker.setData(stationList);
                var showUserPickerButton = document.getElementById('stationPicker');
                showUserPickerButton.addEventListener('click', function(event) {
                    stationPicker.show(function(items) {
                        $scope.taskData.station_sn = items[0].value;
                        $scope.stationName = items[0].text;
                        getDevices(items[0]);
                        $scope.$apply();
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

    $scope.openDeviceSelector = function () {
        // 打开设备选择页面
        if (!$scope.station_sn) {       // 站点sn不为空，表明是从设备档案处新建的，无需选择设备
            routerService.openPage($scope, '/templates/dts/device-select-page.html', {
                deviceDatas: staticDevices,
                onSelect: function (device) {
                    $scope.deviceName = device.name;
                    $scope.taskData.devices = [{id: device.id, sn: device.sn}];
                    history.back();
                }
            }, {
                hidePrev: false
            });
        }
    };

    function initTaskTypeList() {
        ajax.get({
            url: '/opstasks/task_types',
            success: function (data) {
                $scope.taskTypes = data;
                _format(data);

                //普通示例
                taskTypePicker = new mui.PopPicker();
                taskTypePicker.setData(data);
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

    function initMembers() {
        ajax.getCompanyMembers(function (data) {

            $scope.memberList = data;
            _format(data, 'account');
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
            userPicker.setData(data);
        });
    }

    function initDatePicker() {

        document.getElementById('expectedTime').addEventListener('tap', function() {
            if(datePicker) {
                datePicker.show(function (rs) {
                    $scope.taskData.expect_complete_time = rs.text + ":00";
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
                datePicker = new mui.DtPicker(options);
                datePicker.show(function(rs) {
                    $scope.taskData.expect_complete_time = rs.text + ":00";
                    $scope.$apply();
                });
            }
        }, false);
    }

    $scope.handlerIsInvalid = function (form) {
        if (form.$submitted && !$scope.isGrabTask && !$scope.taskData.current_handler){
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

        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(taskData),
            success: function (data) {
                $.notify.progressStop();
                $.notify.info('创建成功');
                // $timeout(function () {
                //     routerService.openPage($scope, '/templates/task/task-detail.html', {id: data.id}, {finish: true});
                // }, 100);
                notifyCreateSuccess(data.id);
            },error: function () {
                $.notify.progressStop();
                $.notify.error('创建失败');
                console.log('error');
            }
        });
    };

    function notifyCreateSuccess(taskId) {
        ajax.get({
            url: '/opstasks',
            data: {
                task_ids: taskId
            },
            success: function (data) {
                $scope.$emit('onBaseTaskUpdate', data[0]);
                routerService.openPage($scope, '/templates/task/task-detail.html', {id: taskId}, {finish: true});
            },
            error: function () {
                routerService.openPage($scope, '/templates/task/task-detail.html', {id: taskId}, {finish: true});
            }
        });
    }


    $scope.toggleTaskType = function () {
        $scope.isGrabTask = !$scope.isGrabTask;
        if ($scope.isGrabTask){
            $scope.handlerName = null;
            $scope.taskData.current_handler = null;
        }
    };

    $scope.submitForm = function() {
        if ($scope.handlerIsInvalid($scope.myForm)) {
            return;
        }
        if($scope.myForm.$invalid){
            console.log('form invalid');
        }else {
            $scope.createTask();
        }
    };

    $scope.$on('$destroy', function (event) {
        if (taskTypePicker) {
            taskTypePicker.dispose();
            taskTypePicker = null;
        }
        if (stationPicker) {
            stationPicker.dispose();
            stationPicker = null;
        }
        if (devicePicker) {
            devicePicker.dispose();
            devicePicker = null;
        }
        if (userPicker) {
            userPicker.dispose();
            userPicker = null;
        }
        if (datePicker) {
            datePicker.dispose();
            datePicker = null;
        }
    });

    init();
});

app.controller('TaskDevicesHandlerCtrl', function ($scope, routerService, ajax) {

    $scope.device_record = $scope.task.device_record;
    $scope.checkedSns = [];

    $scope.device_record.forEach(function (r) {
        if (r.status === '未处理' || !r.status) {
            r.status = '';
        } else if (r.status === '运行良好') {
            r.status_name = 'normal';
        } else {
            r.status_name = 'danger';
        }
        r.checked = false;
    });

    function init() {
        var deviceSns = [];
        var pathExist = false;
        $scope.device_record.forEach(function (r) {
            if (r.device.path) {
                pathExist = true;
                return false;
            }
            deviceSns.push(r.device_sn);
        });
        if (!pathExist && deviceSns.length) {
            ajax.get({
                url: '/staticdevices/path',
                data: {
                    station_sn: $scope.task.station_sn,
                    device_sns: deviceSns.join(',')
                },
                success: function (response) {
                    $scope.device_record.forEach(function (record) {
                        record.device.path = response[record.device_sn];
                    });
                    $scope.$apply();

                }
            });
        }
    }

    $scope.checkDevice = function ($event, sn) {
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
                status: '运行良好'
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
                            r.status = '运行良好';
                            r.status_name = 'normal';
                            $scope.checkDevice(null, r.device_sn);
                        }
                    });
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

    var taskUpdateListener = $scope.$on('onTaskUpdate', function (event, taskData) {
        for (var i=0; i<$scope.device_record.length; i++) {
            var record = $scope.device_record[i];
            if (record.checked && taskData.device_record.length && record.device_sn === taskData.device_record[0].device_sn) {
                record.status_name = 'danger';
                record.status = '有故障';
                $scope.recountFunc();
                $scope.checkDevice(null, record.device_sn);
                break;
            }
        }
    });

    $scope.$on('$destroy', function (event) {
        if (taskUpdateListener) {
            taskUpdateListener();
            taskUpdateListener = null;
        }
    });

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

        routerService.openPage($scope, '/templates/dts/dts-create.html', {
            task_id: $scope.task.id,
            station_sn: $scope.task.station_sn,
            device_sn: record.device_sn,
            path: record.device.path,
            name: record.device.name,
            isInPage: true
        });
    };

    $scope.gotoDevice = function(deviceData){
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {device_id: deviceData.id, device_sn: deviceData.sn});
        return false;
    };

    init();
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
                        if (r.status === '有缺陷') {
                            r.status_name ='danger';
                        } else if (r.status === '未处理') {
                            r.status = '待检查...';
                            r.status_name ='waiting';
                        } else {
                            r.status_name = 'normal';
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