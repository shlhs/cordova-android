
"use strict";
/**
 * Created by liucaiyun on 2017/7/20.
 */


var TaskAction = {Create: 0, Accept: 1, Refuse: 2, Assign: 3, Go: 4, Apply: 5, Reject: 6, Close: 7, Comment: 8, Grab: 9, Arrive: 10, Update: 11};
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
        default:
            stage = '待处理';
    }
    task.stage = stage;
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

app.controller('HomeCtrl', function ($scope, $timeout, userService, ajax, $state, $rootScope, Permission) {

    var company = userService.company;
    var map = null;
    var role = userService.getUserRole();
    $scope.viewName = '';
    $scope.tabName = 'sites';
    $scope.title = '';
    $scope.navMenus = [];

    $scope.chooseNav = function (tabName, title) {
        $scope.tabName = tabName;
        $scope.title = title;
        var element=angular.element('#' + tabName).children().first(), scope = element.scope();
        if (scope.getDataList && !element.data('inited')){
            scope.getDataList();
            element.data('inited', true);
        }
        angular.element('#' + tabName).addClass('mui-active').siblings().removeClass('mui-active');
    };


    function initMenu() {

        if (role === UserRole.OpsOperator || role === UserRole.OpsAdmin){
            $scope.navMenus.push(
                {
                    id: 'competition_tasks',
                    name: '抢单',
                    templateUrl: '/templates/task/task-competition-list.html',
                    icon: 'nav-task-grab'
                },
                {
                    id: 'my_tasks',
                    name: '所有任务',
                    templateUrl: '/templates/task/task-list.html',
                    icon: 'nav-all-tasks'
                }
            );
        }
        else if (role === UserRole.SuperUser){
            $scope.navMenus.push(
                {
                    id: 'my_tasks',
                    name: '所有任务',
                    templateUrl: '/templates/task/task-list.html',
                    icon: 'nav-all-tasks'
                }
            );
        }
        var activeMenu = $scope.navMenus[0];
        $timeout(function () {
            $scope.chooseNav('sites', '站点监控');

        }, 500);
    }
    initMenu();
    // $rootScope.login(function () {
    //     var menu = $scope.navMenus[0];
    //     $scope.chooseNav(menu.id, menu.name);
    // });
});

app.controller('TaskBaseCtrl', function ($scope, ajax, userService) {
    var map = null;
    $scope.openTask = function (taskId) {
        location.href = '/templates/task/task-detail.html?id=' + taskId;
    };

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
        var company = userService.company;
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + company.id + '/' + taskId + '/actions?action_type=' + actionType,
            data: JSON.stringify(data),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
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

    $scope.getDataList = function() {
        scrollerService.initScroll('#competition_tasks_scroller', $scope.getDataList);
        var company = userService.company;
        if (company && (company.length > 1 || company.length === 0)){    // 有两种情况，一种是该用户没有公司，一种是该用户为平台人员
            $scope.isLoading = false;
            $scope.$apply();
            return;
        }
        if (null === company) {
            $rootScope.login($scope.getDataList);
            // $rootScope.getCompany($scope.getDataList);
            return;
        }
        ajax.get({
            url: "/opstasks/" + company.id,
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
                var scope = angular.element('div[ng-controller="TaskListCtrl"]').scope();
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
        var company = userService.getCompany();
        if (!company){
            company = userService.getCompany();
        }
        var data = {};
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + company.id + '/' + taskId + '/actions?action_type=' + TaskAction.Grab,
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
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.isLoading = true;
    var username=userService.username;

    $scope.getDataList = function() {
        scrollerService.initScroll('#my_tasks', $scope.getDataList);
        var company = userService.company;
        if (company && company.length !== 1){
            $scope.isLoading = false;
            $scope.$apply();
            return;
        }
        if (!company){
            $rootScope.login($scope.getDataList);
            return;
        }
        ajax.get({
            url: "/opstasks/" + company.id,
            data: {
                handler: username
            },
            success: function (result) {
                $scope.isLoading = false;
                if (!result || !result.length) {
                    $scope.$apply();
                    return;
                }
                for (var i in result){
                    formatTaskStatusName(result[i]);
                    result[i].isTimeout = $scope.taskTimeout(result[i]);
                }
                $scope.tasks = result;
                $scope.tasks.sort(sortByUpdateTime);
                $scope.$apply();
            },
            error: function (a, b, c) {
                $scope.isLoading = false;
                $scope.$apply();
                $.notify.error('读取待办失败');
            }
        });
    };

    $scope.updateTask = function (taskData) {
        var task = null, existed = false;
         for (var i in $scope.tasks){
             task = $scope.tasks[i];
             if (parseInt(task.id) == parseInt(taskData.id)){
                 existed = true;
                 if (taskData.current_handler != username || taskData.stage_id == TaskStatus.Closed){
                     $scope.tasks.splice(i, 1);
                 }else{
                     $scope.tasks[i] = taskData;
                 }
                 $scope.tasks.sort(sortByUpdateTime);
                 break;
             }
         }
         if (!existed){     // 如果不存在，则增加一条
             $scope.tasks.unshift(taskData);
         }
        $scope.$apply();
    };

    function postAction(taskId, action) {
        $scope.commonPostAction(taskId, action, '', null, function (data) {
            $scope.taskData = data;
            for (var i in $scope.tasks){
                if ($scope.tasks[i].id == taskId){
                    $scope.tasks[i] = formatTaskStatusName(data);
                    break;
                }
            }
            $scope.$apply();
        });
    }

    $scope.taskHandler = {
        gotoSpot: function ($event, taskId) {
            $event.stopPropagation();
            $event.preventDefault();
            postAction(taskId, TaskAction.Go);
        },
        setArrived: function ($event, taskId, siteLongitude, siteLatitude){
            $event.stopPropagation();
            $event.preventDefault();
            // 需要先检查是否真的已到现场
            $scope.checkActuallyArrived(taskId, siteLongitude, siteLatitude, postAction);
        }
    };
    // $scope.getDataList();
});

app.controller('TaskListCtrl', function ($scope, $rootScope, scrollerService, userService, ajax) {
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
        var company = userService.company;
        if (company && (company.length > 1 || company.length === 0)){
            $scope.isLoading = false;
            return;
        }
        if (null === company){
            // $rootScope.login($scope.getDataList);
            return;
        }
        $scope.isLoading = true;
        $scope.loadingFailed = false;

        ajax.get({
            url: "/opstasks/history/" + company.id,
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

    $scope.updateTask = function (taskData) {
        console.log('TaskHistoryCtrl updateTask');
        // 查找任务是否存在
        var exist = false;
        for (var i in allTasks){
            if (allTasks[i].id === taskData.id){
                allTasks[i] = taskData;
                exist = true;
                break;
            }
        }
        if (!exist){        // 如果不存在，则加入到最前面
            allTasks.unshift(taskData);
        }
        allTasks.sort(sortByUpdateTime);
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

});

function updateAfterGrab(strArgs) {     // 在任务详情页抢单后，需要将任务从主页中删除
    var taskData = JSON.parse(strArgs);
    // 更新到“抢单”
    var scope = angular.element('div[ng-controller="CompetitionTaskListCtrl"]').scope();
    scope.afterGrabTask(taskData);
}

function updateTask(strArgs) {  // json格式的参数， {data: taskData}
    var taskData = JSON.parse(strArgs);
    // 更新到“我的待办”
    var scope = angular.element('div[ng-controller="TaskListCtrl"]').scope();
    formatTaskStatusName(taskData);
    scope.updateTask && scope.updateTask(taskData);
}

function setTaskReportId(reportId) {        // 安全检测和停电维护新建后返回到任务详情页时，设置任务的report_id
    var scope = angular.element('#taskDetail').scope();
    scope.setReportId(reportId);
}

app.controller('TaskDetailCtrl', function ($scope, $location, $state, userService, platformService, $http, $timeout, $window, ajax) {
    $scope.TaskAction = TaskAction;
    $scope.TaskStatus = TaskStatus;
    $scope.imageScope = [1,2,3,4,5,6,7,8,9];
    $scope.history = [];
    $scope.lastHistory = null;

    var id = GetQueryString('id'), company=userService.company, username=userService.username;
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

    function updateUserActions() {      // 更新用户的操作权限
        if (taskData.current_handler !== username){
            $scope.canHandle = false;
            return;
        }
        $scope.canHandle = true;

    }


    var option = {
        url: '/opstasks/' + company.id + '/' + id,
        success: function (data) {
            console.log('get task detail success');
            updateTaskInfo(data);
        },
        error: function (a, b, c) {
            console.log('get task detail fail');
            $.notify.error('读取数据失败');
        }};
    ajax.get(option);

    function updateTaskInfo(data) {
        $scope.taskData = formatTaskStatusName(data);
        $scope.taskData.expect_complete_time = data.expect_complete_time.substring(0, 16);
        console.log('task canhandle:' + $scope.canHandle);
        $scope.$apply();
        stationLongitude = data.station_longitude;
        stationLatitude = data.station_latitude;
        getTaskHistory();
        if (data.stage_id === TaskStatus.Competition && data.station_latitude && data.station_longitude){
            drawMap($scope.taskData);
        }
        formatTaskStatus();

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
        return taskData;
    }

    function formatActions(historyList) {      // 将操作历史格式化成界面显示
        var formattedList = [], taskData=$scope.taskData;
        var taskComplete = (taskData.stage_id >= TaskStatus.ToClose) ? true : false;
        if (taskData.stage_id == TaskStatus.Accepted){
            historyList.unshift({handler: taskData.current_handler_name, action_name: '等待去往现场', action_id: TaskAction.Update});
        }
        else if (taskData.stage_id == TaskStatus.Coming){
            historyList.unshift({handler: taskData.current_handler_name, action_name: '正在去往现场', action_id: TaskAction.Update});
        }
        else if (taskData.stage_id !== TaskStatus.Closed){  // 如果任务未关闭，那么增加一个待处理记录
            historyList.unshift({'handler': taskData.current_handler_name, 'stage_id': taskData.stage_id, 'action_name': taskData.stage});
        }
        var task = null;
        for (var i=0; i<historyList.length; i++){
            task = historyList[i];
            formatTaskHistoryDesp(task);
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
            window.android && window.android.onJsCallbackForPrevPage('updateTask', JSON.stringify(data));
            formatTaskStatus();
            cb && cb(data);
            getTaskHistory();
        });
    };

    function getTaskHistory() {
        ajax.get({
            url: '/opstasks/' + company.id + '/' + id + '/update_records',
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
                console.log('get task history fail');
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
        for (var i in $scope.imageScope){
            if (images['picture' + i]){
                imageList.push(platformService.host + images['picture' + i]);
            }
        }
        $state.go('task.gallery', {index: index, images: imageList});
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
            mui.confirm('确认任务已完成吗？', '请求关闭任务', btnArray, function(e) {
                if (e.index === 1) {     // 是
                    $scope.postAction(TaskAction.Apply, "请求关闭任务");
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
        location.href='map.html?id=' + $scope.taskData.id + '&name=' + $scope.taskData.station_name;
    };
});

function importImage(imageData) {    // 从Android读取的图片
    angular.element("#handlePage").scope().addImagesWithBase64(imageData);
}

function deleteImage () {       // 删除图片
    var index = $("#slides .slidesjs-pagination a.active").parent().index();
    $('div[ng-controller="TaskHandlerUpload"]').scope().files.splice(index, 1);
    history.back();
}
app.controller('TaskHandlerUpload', function ($scope, $timeout) {
    $scope.files = [];
    $scope.description = '';
    $scope.isPC = IsPC();
    var insertPosition = angular.element("#imageList>.upload-item");

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
                   $scope.files.push(dataUrl);
                   $scope.$apply();
               };
           };
       }
   } ;

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

});

app.controller('GalleryCtrl', function ($scope, $stateParams, $timeout) {
    $scope.canDelete = false;
    $scope.index = $stateParams.index;
    $scope.images = $stateParams.images;
    $scope.show = false;

    $scope.deleteImage = function() {       // 删除图片
        var index = $("#slides .slidesjs-pagination a.active").parent().index();
        $('div[ng-controller="TaskHandlerUpload"]').scope().files.splice(index, 1);
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


app.controller('TaskCreateCtrl', function ($scope, $timeout, userService, ajax) {
    var company = userService.company;
    $scope.stationName = null;
    $scope.taskTypeName = null;
    $scope.handlerName = null;
    $scope.deviceName = null;
    $scope.user = null;
    $scope.linkEventId = GetQueryString("eventId");
    $scope.linkEventInfo = null;
    var isGrabTask = false;

    $scope.taskData = {
        events: [],
        devices: []
    };
    var devicePicker = null;
    var userPicker = null;
    function init() {
        if($scope.linkEventId && $scope.linkEventId != '') {
            initLinkEvent();;
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
                $scope.companyList = data;
                _format(data, 'sn');
                // 初始化picker
                var stationPicker = new mui.PopPicker();
                stationPicker.setData(data);
                var showUserPickerButton = document.getElementById('stationPicker');
                showUserPickerButton.addEventListener('click', function(event) {
                    stationPicker.show(function(items) {
                        $scope.taskData.station_sn = items[0].value;
                        $scope.stationName = items[0].text;
                        getDevices(items[0]);
                        $scope.$apply();
                        // userResult.innerText = JSON.stringify(items[0]);
                        //返回 false 可以阻止选择框的关闭
                        //return false;
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
            url: '/stations/' + station.sn + '/devices',
            success: function (data) {
                _format(data);
                if (!devicePicker){
                    devicePicker = new mui.PopPicker();
                    var taskTypeButton = document.getElementById('devicePicker');
                    taskTypeButton.addEventListener('click', function(event) {
                        devicePicker.show(function(items) {
                            $scope.deviceName = items[0].text;
                            $scope.taskData.devices.push({id: items[0].id});
                            $scope.$apply();
                            // userResult.innerText = JSON.stringify(items[0]);
                            //返回 false 可以阻止选择框的关闭
                            //return false;
                        });
                    }, false);
                }
                devicePicker.setData(data);
            },
            error: function (xhr, error, satus) {
                console.log('get devices error');
            }
        });
    }
    
    function initTaskTypeList() {
        ajax.get({
            url: '/opstasks/task_types',
            success: function (data) {
                $scope.taskTypes = data;
                _format(data);

                //普通示例
                var taskTypePicker = new mui.PopPicker();
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
        ajax.get({
            url: '/opscompanies/' + company.id + '/members',
            success: function (data) {
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
            },
            error: function () {
                console.log('获取站点成员失败');
            }
        });
    }

    function initDatePicker() {

        document.getElementById('expectedTime').addEventListener('tap', function() {
            var _self = this;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    $scope.taskData.expect_complete_time = rs.text;
                    _self.picker.dispose();
                    _self.picker = null;
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
                    _self.picker.dispose();
                    _self.picker = null;
                    $scope.$apply();
                });
            }
        }, false);
    }
    
    $scope.handlerIsInvalid = function (form) {
        if (form.$submitted && !isGrabTask && !$scope.taskData.current_handler){
            return true;
        }
        return false;

    };

    $scope.createTask = function () {
        var taskData = $scope.taskData;

        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + company.id,
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
        if($scope.myForm.$invalid){
            console.log('form invalid');
        }else {
            $scope.createTask();
        }
    };

    init();
});