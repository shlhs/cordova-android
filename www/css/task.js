/**
 * Created by liucaiyun on 2017/7/20.
 */
Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "H+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

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
            status = 'text-grey';
            break;
        case TaskStatus.ToClose:
            stage = '审批';
            break;
        case TaskStatus.Arrived:
            stage = '正在维修';
            break;
        case TaskStatus.ToAccept:
            status = 'text-red';
            break;
    }
    task.stage = stage;
    task.status = status;
    return task;
}
function sortByUpdateTime(t1, t2) {
    if (t1.last_modified_time > t2.last_modified_time){
        return -1;
    }
    if (t1.last_modified_time == t2.last_modified_time){
        return 0;
    }
    return 1;
}
function sortByCreateTime(t1, t2) {
    if (t1.create_time > t2.create_time){
        return -1;
    }
    if (t1.create_time == t2.create_time){
        return 0;
    }
    return 1;
}
function formatExpiredTime(t) {     // 格式化截止时间，只有日期没有时间
    var day = new Date().getDate(), month=new Date().getMonth()+1, year = new Date().getFullYear();
    var m = parseInt(t.substring(5, 7)), d = parseInt(t.substring(8, 10)), y = parseInt(t.substring(0, 4));
    if (m == month && d == day){
        return '今日';
    }
    if ((m == month && d == (day+1)) || (d == 1 && m == (month-1)) || (m==1 && d==1 && y==(year-1))){
        return '明日'
    }
    return t.substring(5, 10);
}

function formatUpdateTime(t) {      // 格式化更新时间，有日期和时间
    var day = new Date().getDate(), month=new Date().getMonth()+1, year = new Date().getFullYear();
    var m = parseInt(t.substring(5, 7)), d = parseInt(t.substring(8, 10)), y = parseInt(t.substring(0, 4));
    if (m == month && d == day){
        return '今日 ' + t.substring(11, 16);
    }
    if ((m == month && d == (day-1)) || (d == 1 && m == (month-1)) || (m==1 && d==1 && y==(year-1))){
        return '昨日 ' + t.substring(11, 16);
    }
    return t.substring(5, 16);
}
app.constant('TaskAction', TaskAction);
app.constant('TaskStatus', TaskStatus);

app.controller('TaskBaseCtrl', function ($scope, userService, ajax) {
    var map = null;
    $scope.commonPostAction = function(taskId, actionType, description, images, cb) {
        var company = userService.company;
        var data = {};
        if (description){
            data['description'] = description;
        }
        if (images && images.length){
            for (var i=0; i<images.length; i++){
                data['file' + (i+1)] = images[i];
            }
        }
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
                cb && cb(data)
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error('操作失败');
            }
        });
    };

    $scope.getDistance = function(task, start, cb) {
        if (null == map){
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
                    task['distance'] = parseFloat(result.getPlan(0).getDistance());
                    cb && cb(task, task['distance']);
                }else{
                    cb && cb(task, -1); // 不存在路径
                }
            }
        });
        var end = new BMap.Point(task.station_longitude, task.station_latitude);
        driving.search(start, end);
    };

    $scope.checkActuallyArrived = function (taskId, siteLongitude, siteLatitude, cb) {

        //  如果站点的坐标为空，则直接提交操作
        if (!siteLongitude || !siteLatitude || !window.android){
            cb && cb(taskId, TaskAction.Arrive);
            return;
        }
        $.notify.progressStart();
        apiLocation.start(function (longtitude, latitude) {     // 获取用户的当前位置
            // 判断位置是否一致
            if (typeof (longtitude) != 'undefined'){
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
    }
});

app.controller('CompetitionTaskListCtrl', function ($scope, $rootScope, userService, ajax) {
    $scope.tasks = [];
    $scope.competitionLoading = true;
    var selectedTaskIndex = -1, company=userService.getCompany();
    var stationDistances = {};
    function formatTime(task) {

        task.create_time = formatUpdateTime(task.create_time);
        task.expect_complete_time = formatExpiredTime(task.expect_complete_time, true);
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
                task['distance'] = stationDistances[task.station_sn];
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
        var company = userService.company;
        if (company && company.length > 1){
            $scope.competitionLoading = false;
            return;
        }
        if (!company){
            $rootScope.login($scope.getDataList);
            return;
        }
        ajax.get({
            url: "/opstasks/" + company.id,
            data: {
                stage: TaskStatus.Competition
            },
            success: function (result) {
                $scope.competitionLoading = false;
                if (!result || !result.length) {
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
                $scope.competitionLoading = false;
                $scope.$apply();
                $.notify.error('读取待办失败');
            }
        });
    };

    $scope.afterGrabTask = function (taskData) {
        var task = null;
        for (var i in $scope.tasks){
            task = $scope.tasks[i];
            if (parseInt(task.id) == parseInt(taskData.id)){
                // 从任务列表中删除
                $scope.tasks.splice(i, 1);
                // 给我的待办增加一条
                var scope = angular.element('#my_tasks').scope();
                scope.updateTask(taskData);
                break;
            }
        }
        $scope.$apply();
    };

    $scope.getDataList();
});

app.controller('GrabTaskCtrl', function ($scope, userService, ajax) {
    var company = userService.getCompany();
    function postGrabAction(taskId) {
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
    };

    $scope.toGrabTask = function ($event, taskData) {
        function hide() {
            html.remove();
            window.removeEventListener('popstate', hide);
        }
        $event.stopPropagation();
        var template = Handlebars.compile(angular.element("#grab-task-template").html());
        var html = $(template(taskData)).appendTo($('body'));
        history.pushState('dialog', 'dialog', null);
        window.addEventListener("popstate", hide);
        html.find('button').on('tap', function (e) {
            history.back();
            if ($(this).data('role') == 'accept'){
                postGrabAction(taskData.id);
            }
        });
        $event.preventDefault();
        return false;
    };
});

app.controller('TaskListCtrl', function ($scope, $rootScope, userService, ajax, TaskStatus) {
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.todoLoading = true;
    var username=userService.username;
    $scope.getDataList = function() {
        var company = userService.company;
        if (company && company.length > 1){
            $scope.todoLoading = false;
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
                $scope.todoLoading = false;
                if (!result || !result.length) {
                    $scope.$apply();
                    return;
                }
                for (var i in result){
                    formatTaskStatusName(result[i]);
                }
                $scope.tasks = result;
                $scope.tasks.sort(sortByUpdateTime);
                $scope.$apply();
            },
            error: function (a, b, c) {
                $scope.todoLoading = false;
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
        })
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
});

app.controller('TaskHistoryCtrl', function ($scope, userService, ajax) {
    var allTasks = [];
    $scope.showTasks = [];
    $scope.showType = 'all';    // all, open, closed
    $scope.isLoading = true;
    $scope.getDataList = function() {
        var company = userService.company;
        if (!company){
            $scope.isLoading = false;
            return;
        }
        ajax.get({
            url: "/opstasks/history/" + company.id,
            data:{
                page_size: 20,
                page_index: 0,
                s_echo: 1
            },
            success: function(result) {
                $scope.isLoading = false;
                result.aaData.sort(sortByUpdateTime);
                for (var i in result.aaData){
                    formatTaskStatusName(result.aaData[i]);
                }
                allTasks = result.aaData;
                $scope.changeTaskType($scope.showType);
            },
            error: function (a,b,c) {
                $scope.isLoading = false;
                $.notify.error("获取任务历史失败");
                $scope.$apply();
            }
        });
    };

    $scope.updateTask = function (taskData) {
        console.log('TaskHistoryCtrl updateTask');
        // 查找任务是否存在
        var exist = false;
        for (var i in allTasks){
            if (allTasks[i].id == taskData.id){
                allTasks[i] = taskData;
                exist = true;
                break;
            }
        }
        if (!exist){        // 如果不存在，则加入到最前面
            allTasks.unshift(taskData);
        }
        allTasks.sort(sortByUpdateTime);
        $scope.changeTaskType($scope.showType);
    };

    $scope.changeTaskType = function (type) {
        console.log('change type');
        var showTasks = [];
         if (type == 'all'){
             showTasks = allTasks;
         }
         else if (type == 'closed'){
             for(var i in allTasks){
                 if (allTasks[i].stage_id == TaskStatus.Closed){
                     showTasks.push(allTasks[i]);
                 }
             }
         }else{
             for (var i in allTasks){
                 if (allTasks[i].stage_id != TaskStatus.Closed){
                     showTasks.push(allTasks[i]);
                 }
             }
         }
         $scope.showTasks = showTasks;
         $scope.showType = type;
         $scope.$apply();
    };

    $scope.getDataList();
});

function updateAfterGrab(strArgs) {     // 在任务详情页抢单后，需要将任务从主页中删除
    var taskData = JSON.parse(strArgs);
    // 更新到“抢单”
    var scope = angular.element('#competition_tasks').scope();
    scope.afterGrabTask(taskData);
}

function updateTask(strArgs) {  // json格式的参数， {data: taskData}
    var taskData = JSON.parse(strArgs);
    // 更新到“我的待办”
    var scope = angular.element('#my_tasks').scope();
    formatTaskStatusName(taskData);
    scope.updateTask(taskData);
    // scope = angular.element('#task_history').scope();
    // scope.updateTask(taskData);
}

app.controller('TaskDetailCtrl', function ($scope, $location, userService, platformService, $http, $timeout, ajax) {
    $scope.TaskAction = TaskAction
    $scope.TaskStatus = TaskStatus;
    $scope.imageScope = [1,2,3,4,5,6,7,8,9];
    $scope.history = [];
    $scope.lastHistory = null;
    $scope.gallery = {};    // 相册
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

    var option = {
        url: '/opstasks/' + company.id + '/' + id,
        success: function (data) {
            console.log('get task detail success');
            $scope.taskData = formatTaskStatusName(data);
            $scope.taskData.expect_complete_time = formatExpiredTime(data.expect_complete_time);
            console.log('task canhandle:' + $scope.canHandle);
            $scope.$apply();
            stationLongitude = data.station_longitude;
            stationLatitude = data.station_latitude;
            getTaskHistory();
            if (data.stage_id == TaskStatus.Competition){
                drawMap($scope.taskData);
            }
            formatTaskStatus();
        },
        error: function (a, b, c) {
            console.log('get task detail fail');
            $.notify.error('读取数据失败');
        }};
    ajax.get(option);

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
        if (taskData.current_handler == username){
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
/*
    var $sliderGallery = null;
    $scope.openGallery = function(imageList, index) {
        var galleryStr = '<div id="slides">';
        for (var i in imageList){
            // 计算img位置

            galleryStr += '<div class="img-container"><div><img src=' + imageList[i] + '></div></div>';
        }
        galleryStr += '</div>';
        $sliderGallery = $(galleryStr).appendTo($('body'));
        var isClicked = false;
        $sliderGallery.find('img').on('click', function () {
            !isClicked && history.back();
            isClicked = true;
        });
        $sliderGallery.find('img').on('tap', function () {
            !isClicked && history.back();
            isClicked = true;
        });
        // 增加history，以便手机上可以用back键
        historyState.push('gallery');
        history.pushState('gallery', 'gallery', null);
        if (imageList.length > 1){
            $('#slides').slidesjs({
                start: index,
                width: window.screen.width,
                play: {
                    active: true,
                    swap: true
                }
            });
        }else {
            $sliderGallery.append('<ul class="slidesjs-pagination"><li class="slidesjs-pagination-item"><a href="#" class="active">1</a></li></ul>')
            $sliderGallery.show();
        }
        if ($scope.canDelete){
            var deleteLines = '<div class="weui-gallery__opr">' +
                '<a href="javascript:" class="weui-gallery__del" onclick="deleteImage()">' +
                '<i class="weui-icon-delete weui-icon_gallery-delete fa fa-trash-o"></i>' +
                '</a>' +
                '</div>';
            $(deleteLines).appendTo($sliderGallery);
        }
    };
*/
    $scope.showImageGallery = function (images, index) {        // 点击任务处理历史中的图片显示相册
        var imageList = [];
        for (var i in $scope.imageScope){
            if (images['picture' + i]){
                imageList.push(platformService.host + images['picture' + i]);
            }
        }
        // $scope.openGallery(imageList, index);
        $state.go('task.gallery', {index: index-1, images: imageList,})
    };

    $scope.taskHandler = {
        acceptTaskAssign: function () {     // 接受任务
            var btnArray = ['取消', '是'];
            mui.confirm('是否接受该任务？', '接受该任务', btnArray, function(e) {
                if (e.index == 1) {     // 是
                    $scope.postAction(TaskAction.Accept);
                }
            });
        },
        refuseTaskAssign: function () {     // 拒绝任务分配
            var btnArray = ['取消', '确定'];
            mui.prompt('请输入拒绝原因：', '', '拒绝该任务', btnArray, function(e) {
                if (e.index == 1) {     // 是
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
            historyState.push('innerPage');
            innerPageQuery = query;
            history.pushState('innerPage', 'innerPage', null);
        },
        hideHandlePage: function(query) {
            if (query == '#handlePage'){
                historyState = [];
            }
            $scope.files = [];
            $scope.description = "";
            var $page = angular.element(query);
            $page.attr('class', 'inner-page up-to-down');
            // $scope.$apply();
            return false;
        },
        requestTaskComplete: function () {     // 请求关闭任务
            var btnArray = ['取消', '确定'];
            mui.confirm('确认任务已完成吗？', '请求关闭任务', btnArray, function(e) {
                if (e.index == 1) {     // 是
                    $scope.postAction(TaskAction.Apply, "请求关闭任务");
                }
            });
        },
        closeTask: function () {        // 关闭任务
            var btnArray = ['取消', '关闭'];
            mui.confirm('即将关闭任务', '关闭任务', btnArray, function(e) {
                if (e.index == 1) {     // 是
                    $scope.postAction(TaskAction.Close, "关闭任务");
                }
            });
        },
        submitComment: function (query) {
            var self = this;
            $scope.postAction(commentActionIndex, $scope.description, null, function () {
                self.hideHandlePage(query);
            });
        }
    };
/*
    window.addEventListener("popstate", function (a) {
        var state = historyState.length ? historyState[historyState.length-1] : null;
        if (!state){
            return;
        }
        if (state == 'innerPage'){
            $scope.taskHandler.hideHandlePage(innerPageQuery);
        }else if (state == 'gallery'){
            if ($sliderGallery)
            {
                $scope.canDelete = false;
                $sliderGallery.remove();
                $sliderGallery = null;
            }
        }
        historyState.splice(historyState.length-1, 1);
    });
*/
    $scope.afterGrabTask = function (taskData) {        // 抢单成功后的回调
        $scope.taskData = taskData;
        $scope.$apply();
        // 调用Android接口
        window.android && window.android.onJsCallbackForPrevPage('updateAfterGrab', JSON.stringify(taskData));
    };

    $scope.openMap = function () {
        location.href='map.html?id=' + $scope.taskData.id + '&name=' + $scope.taskData.station_name;
    }
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
    var $gallery = $('.weui-gallery2');
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
               }
           }
       }
   } ;

   $scope.addImagesWithBase64 = function (data) {
       $scope.canDelete = true;
       $scope.files.push(data);
       $scope.$apply();
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
               $scope.taskHandler.hideHandlePage();
               window.history.back();
           }, 500);
       });
   }
});

var imageHandler = {
    rotate: function (file, cb) {
        EXIF.getData(file, function () {
            var orientation = EXIF.getTag(this, 'Orientation');
            var rotate='rotate(0deg)';
            if (orientation && orientation !== 1){  // 增加旋转
                switch(orientation){
                    case 6: // 需要顺时针90度旋转
                        rotate = 'rotate(90deg)';
                        break;
                    case 8: // 需要逆时针90度旋转
                        rotate = 'rotate(-90deg)';
                        break;
                    case 3: // 需要180度旋转
                        rotate = 'rotate(180deg)';
                        break;
                }
            }
            cb && cb(rotate);
        });
    },
    readFileAsDataURL: function (file, callback) {
        var a = new FileReader();
        a.onload = function(e) {
            callback(e.target.result);
        };
        a.readAsDataURL(file);
    },
    checkRotate: function(fileDict){
        var that = this;
        EXIF.getData(fileDict.file, function () {
            var orientation = EXIF.getTag(this, 'Orientation');
            // if(orientation != "" && orientation != 1){
            if(orientation != ""){
                var canvas = document.createElement("canvas"), data;
                that.readFileAsDataURL(this, function(result){
                    var img = $("<img style='display:none;'>").appendTo($('body'))[0];
                    img.src = result;
                    img.onload = function(){
                        switch(orientation){
                            case 1://需要顺时针（向左）90度旋转
                                that._rotateImg(this,'left',canvas);
                                break;
                            case 6://需要顺时针（向左）90度旋转
                                that._rotateImg(this,'left',canvas);
                                break;
                            case 8://需要逆时针（向右）90度旋转
                                that._rotateImg(this,'right',canvas);
                                break;
                            case 3://需要180度旋转
                                that._rotateImg(this,'right',canvas);//转两次
                                that._rotateImg(this,'right',canvas);
                                break;
                        }
                    }
                });
            }
        });
    },
    //对图片旋转处理 added by lzk www.bcty365.com

    _rotateImg: function (img, direction, canvas) {
        //alert(img);
        //最小与最大旋转方向，图片旋转4次后回到原方向
        var min_step = 0, max_step = 3;
        //var img = document.getElementById(pid);
        if (img === null)return;
        //img的高度和宽度不能在img元素隐藏后获取，否则会出错
        var originHeight = img.height, originWidth = img.width, width=originWidth, height=originHeight;
        if (originWidth > originHeight){
            if (originHeight > 2048){
                height = 2048;
                width = parseInt((height/originHeight) * originWidth);
            }
        }
        else {
            if (originWidth > 2048){
                width = 2048;
                height = parseInt(width/originWidth*originHeight);
            }
        }
        //var step = img.getAttribute('step');
        var step = 2;
        if (step === null) {
            step = min_step;
        }
        if (direction === 'right') {
            step++;
            //旋转到原位置，即超过最大值
            step > max_step && (step = min_step);
        } else {
            step--;
            step < min_step && (step = max_step);
        }
        //旋转角度以弧度值为参数
        var degree = step * 90 * Math.PI / 180, ctx = canvas.getContext('2d');
        switch (step) {
            case 0:
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0);
                break;
            case 1:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, 0, -height);
                break;
            case 2:
                canvas.width = width;
                canvas.height = height;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, -height);
                break;
            case 3:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, 0);
                break;
        }
    },
    compress: function(source_img_obj, quality, orientation){
        var that = this, mime_type = "image/jpeg", cvs = document.createElement('canvas');
        //naturalWidth真实图片的宽度
        var originWidth = source_img_obj.naturalWidth, originHeight = source_img_obj.naturalHeight, width=originWidth, height=originHeight;
        if (orientation && orientation !== 1){
            switch (orientation){
                case 6://需要顺时针（向左）90度旋转
                    that._rotateImg(source_img_obj,'left',cvs);
                    break;
                case 8://需要逆时针（向右）90度旋转
                    that._rotateImg(source_img_obj,'right',cvs);
                    break;
                case 3://需要180度旋转
                    that._rotateImg(source_img_obj,'right',cvs);//转两次
                    that._rotateImg(source_img_obj,'right',cvs);
                    break;
            }
        }else{
            if (originWidth > originHeight){
                if (originHeight > 2048){
                    height = 2048;
                    width = parseInt((height/originHeight) * originWidth);
                }
            }
            else {
                if (originWidth > 2048){
                    width = 2048;
                    height = parseInt(width/originWidth*originHeight);
                }
            }
            cvs.width = width;
            cvs.height = height;
            cvs.getContext("2d").drawImage(source_img_obj, 0, 0, originWidth, originHeight, 0, 0, width, height);
        }
        var result_image_obj = new Image();
        result_image_obj.src = cvs.toDataURL(mime_type, quality/100);
        return result_image_obj;
    }
};


app.controller('TaskCreateCtrl', function ($scope, $timeout, userService, ajax) {
    var company = userService.company;
    $scope.stationName = null;
    $scope.taskTypeName = null;
    $scope.handlerName = null;
    $scope.deviceName = null;

    $scope.taskData = {
        events: [],
        devices: []
    };
    var devicePicker = null;
    var userPicker = null;
    function init() {
        initStations();
        initTaskTypeList();
        initDatePicker();
        initMembers();
    }

    function _format(data, idKey, nameKey) {
        var d = null;
        if (typeof (idKey) == 'undefined'){
            idKey = 'id';
        }
        if (typeof (nameKey) == 'undefined'){
            nameKey = 'name'
        }
        for(var i=0; i<data.length; i++){
            d = data[i];
            d['value'] = d[idKey];
            d['text'] = d[nameKey];
        }
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
        })
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
        })
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
        })
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
        })
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
                    $scope.taskData.expect_complete_time = rs.text;
                    _self.picker.dispose();
                    _self.picker = null;
                    $scope.$apply();
                });
            }
        }, false);
    }

    $scope.createTask = function () {
        var taskData = $scope.taskData;
        taskData['expect_complete_time'] = taskData.expect_complete_time + ':00';
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

    init();
});