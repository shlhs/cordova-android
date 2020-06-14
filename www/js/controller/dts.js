function onAndroid_dtsImageImport(imageData, filename) {    // 从Android读取的图片
    console.log('start import image');
    var scope = angular.element('#dtsCreatePage').scope();
    // var scope = angular.element('#handlePage').scope();
    if (scope) {
        console.log('find scope');
        scope.addImagesWithBase64(imageData, filename);
    } else {
        // alert('not find scope');
    }
}

function onAndroid_dtsImageDelete (filename) {       // Android手机上删除所选图片
    angular.element("#dtsCreatePage").scope().deleteImageFromMobile(filename);
}

var TaskSource = {Repaire: 1, Event: 2, Inspect: 3};
app.controller('DtsCreateCtrl', ['$scope', '$timeout', 'ajax', 'userService', 'routerService', function ($scope, $timeout, ajax, userService, routerService) {
    var taskId = GetQueryString("task_id") || $scope.task_id || '';
    var deviceSns = GetQueryString('device_sns');
    var stationSn = GetQueryString('station_sn');
    $scope.devices = [];
    // $scope.device = {
    //     sn: GetQueryString('device_sn') || $scope.device_sn,
    //     station_sn: GetQueryString('station_sn') || $scope.station_sn,
    //     name: GetQueryString('name') || $scope.name,
    //     path: GetQueryString('path') || $scope.path
    // };
    // if ($scope.device.name) {
    //     $scope.myForm = {name: $scope.device.name};
    // }
    $scope.role = userService.getUserRole();
    $scope.needResign = $scope.role === 'OPS_ADMIN';      // 是否需要指派维修工
    $scope.isForDevice = deviceSns.length > 0;
    $scope.taskData = {};

    $scope.images = [];
    $scope.description = '';

    $scope.teams = [];
    $scope.teamVisible = false;         // 是否显示运维班组选择窗口
    $scope.teamUsers = [];
    $scope.handlerVisible = false;      // 是否显示维修工选择窗口
    $scope.recheckSelectorVisible = false; // 是否显示复测人员的选择窗口
    var staticDevices = [];
    var opsCompanyId = null;
    var companyId = userService.getTaskCompanyId();
    if ($scope.needResign) {
        opsCompanyId = companyId;
    }

    function init() {
        if (deviceSns.length) { // 如果只有设备sn，那么需要读取设备详情
            getDeviceDetail(deviceSns);
        } else {
            // 如果设备sn为空的话，则需要用户选择设备
            getStaticDevicesOfStation();
        }
        initTaskTypeList();
        initDatePicker();
        initMembers();
    }

    function getStaticDevicesOfStation() {
        ajax.get({
            url: '/stations/' + stationSn + '/staticdevices',
            success: function (data) {
                staticDevices = data;
            }, error: function () {
                $.notify.error('获取设备列表失败');
            }
        });
    }

    function getDeviceDetail(sns) {
        ajax.get({
            url: '/stations/' + stationSn + '/staticdevices',
            data: {
                sns: sns
            },
            success: function (data) {
                $scope.devices = data;
                $scope.$apply();
            }
        });
    }

    function initTaskTypeList() {
        var taskTypes = [{
            value: 8,
            text: '一般缺陷'
        }, {
            value: 9,
            text: '严重缺陷'
        }, {
            value: 10,
            text: '致命缺陷'
        }];
        var taskTypePicker = new mui.PopPicker();
        taskTypePicker.setData(taskTypes);
        var taskTypeButton = document.getElementById('taskTypePicker');

        taskTypeButton.addEventListener('click', function(event) {
            taskTypePicker.show(function(items) {
                $scope.taskTypeName = items[0].text;
                $scope.taskData.task_type_id = items[0].value;
                $scope.$apply();
            });
        }, false);
        // 默认使用一般缺陷
    }

    $scope.showTeamSelector = function () {     // 显示维修班组选择框
        $scope.teamVisible = !$scope.teamVisible;
    };

    $scope.toggleHandlerSelector = function () {    // 显示维修工选择框
        $scope.handlerVisible = !$scope.handlerVisible;
    };

    $scope.toggleRecheckSelector = function () {    // 显示维修工选择框
        $scope.recheckSelectorVisible = !$scope.recheckSelectorVisible;
    };

    $scope.startRecordVoice = function () { // 开始录音

    }; // 启动语音

    $scope.clearVoice = function () { // 删除录音
        $scope.taskData.voice_src = null;
        $scope.taskData.voice_duration = null;
    };

    $scope.removeVideo = function () {
        $scope.taskData.video_src = null; // 删除视频
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

    $scope.onSelectedUsers = function (team, users) {
        $scope.taskData.operator_team = team ? team.id : null;
        $scope.taskData.current_handler_users = users;
        $scope.toggleHandlerSelector();
    };

    $scope.onSelectedRecheckHandlers = function (team, users) {
        $scope.taskData.recheck_team = team ? team.id : null;
        $scope.taskData.recheck_users = users;
        $scope.toggleRecheckSelector();
    };

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
                // var optionsJson = this.getAttribute('data-options') || '{}';
                var options = {type: 'date'};
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

    $scope.openDeviceSelector = function () {
        // 打开设备选择页面
        routerService.openPage($scope, '/templates/site/device-tree/device-select-page.html', {
            deviceDatas: staticDevices,
            onSelect: function (device) {
                $scope.device.sn = device.sn;
                $scope.device.path = device.path;
                $scope.device.name = device.name;
                history.back();
            }
        })
    };

    $scope.showDeviceDetail = function (device) { // 打开设备详情页
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {device_sn: device.sn, disableEdit: true});
    };

    $scope.submitForm = function() {
        if($scope.myForm.$invalid){
            console.log('form invalid');
        }else {
            $scope.createTask();
        }
    };

    $scope.createTask = function () {
        var params = Object.assign({}, $scope.taskData);
        params.devices = $scope.devices;
        // 增加图片信息
        if ($scope.images.length) {
            params.pictures = $scope.images;
        }
        params.events = [];
        params.station_sn = $scope.device.station_sn;
        params.mother_task_id = taskId;
        params.source = taskId ? TaskSource.Inspect : TaskSource.Repaire;     // 如果是从其他任务创建，即mother_task_id不为空，则来源为巡检，否则为报修
        if (params.expect_complete_time) {
            params = params.expect_complete_time + " 20:00:00";
        }
        params.recheck_handlers = null;
        if (params.recheck_users.length) { // 复测人员
            var accounts = [];
            params.recheck_users.forEach(function (u) {
                accounts.push(u.account);
            });
            params.recheck_handlers = accounts.join(',');
        }
        params.current_handlers = null;
        if (params.current_handler_users) { // 消缺人员
            var accounts = [];
            params.current_handler_users.forEach(function (u) {
                accounts.push(u.account);
            });
            params.current_handlers = accounts.join(',');
        }
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(params),
            success: function (data) {
                $.notify.progressStop();
                $.notify.info('创建成功');
                if ($scope.isInPage) {
                    history.back();
                }
                $timeout(function () {
                    var url = '/templates/task/task-detail.html?id=' + data.id +
                        '&taskType=' + params.task_type_id + '&mother_task_id=' + taskId;
                    if ($scope.isInPage) {
                        var record = {
                            device_sn: $scope.device.sn,
                            status: '有故障'
                        };
                        onAndroidCb_updateDeviceRecord(JSON.stringify(record));     // 调用任务页更新设备状态
                    } else {
                        url += '&finishPage=1';
                    }
                    window.location.href = url;       // 设置finish=1，这样在Android端在打开新页面时，会将当前页finish掉
                }, 300);
            },error: function () {
                $.notify.progressStop();
                $.notify.error('创建失败');
                console.log('error');
            }
        });
    };

    init();
}]);

// 设备缺陷记录
app.controller('DeviceDtsListCtrl', ['$scope', 'ajax', 'scrollerService', 'userService', function ($scope, ajax, scrollerService, userService) {
    var deviceSn = GetQueryString('device_sn');
    var stationSn = GetQueryString('station_sn');
    var status = GetQueryString("status");
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    var userAccount = userService.getUser().account;

    function sortDts(d1, d2) {
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
        if (d1.last_modified_time > d2.last_modified_time){
            return -1;
        }
        if (d1.last_modified_time === d2.last_modified_time){
            return 0;
        }
        return 1;
    }

    $scope.getDataList = function() {
        scrollerService.initScroll("#taskList", $scope.getDataList);
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        var params = {
            device_sn: deviceSn
        };
        if (status === 'doing') {
            var allStages = Object.values(TaskStatus);
            allStages.splice(allStages.indexOf(TaskStatus.Closed), 1).splice(allStages.indexOf(TaskSource.ToClose), 1);
            params.stage = allStages.join(',');
        } else if (status === 'finish') {
            params.stage = [TaskStatus.ToClose, TaskStatus.Closed].join(',');
        }

        ajax.get({
            url: "/dts",
            data: params,
            success: function(result) {
                $scope.isLoading = false;
                result.sort(sortDts);
                var tasks = result, task = null;
                for (var i in tasks){
                    task = tasks[i];
                    formatTaskStatusName(task);
                    if (isTodoTask(task, userAccount)) {
                        task.isMyself = true;
                    }
                    if (task.finish_time) {
                        task.finish_time = task.finish_time.substring(0, 16);
                    }
                    task.isTimeout = $scope.taskTimeout(task);
                }
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
            if ($scope.tasks[i].id === taskData.id){
                $scope.tasks[i] = taskData;
                exist = true;
                break;
            }
        }
        if (!exist){        // 如果不存在，则加入到最前面
            $scope.tasks.unshift(taskData);
        }
        // $scope.tasks.sort(sortDts);
        $scope.$apply();
    };

    $scope.openDtsCreatePage = function () {
        window.location.href = '/templates/dts/dts-create.html?station_sn=' + (stationSn || '') + '&device_sn=' + deviceSn;
    };

    $scope.getDataList();
}]);

app.controller('StationDtsListCtrl', ['$scope', '$rootScope', 'scrollerService', 'userService', 'ajax', function ($scope, $rootScope, scrollerService, userService, ajax) {
    var stationSn = GetQueryString("sn");
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;

    function sortDts(d1, d2) {
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
        if (d1.last_modified_time > d2.last_modified_time){
            return -1;
        }
        if (d1.last_modified_time === d2.last_modified_time){
            return 0;
        }
        return 1;
    }

    $scope.getDataList = function() {
        scrollerService.initScroll("#taskList", $scope.getDataList);
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: '/dts',
            data:{
                station: stationSn,
                page_size: 100,
                page_index: 0,
                s_echo: 0
            },
            success: function(result) {
                $scope.isLoading = false;
                result.sort(sortDts);
                var tasks = result, task = null;
                for (var i in tasks){
                    task = tasks[i];
                    formatTaskStatusName(task);
                    switch (task.task_type_id) {
                        case 8:
                            task.dts_type = 'normal';
                            break;
                        case 9:
                            task.dts_type = 'serious';
                            break;
                        case 10:
                            task.dts_type = 'fatal';
                            break;
                    }
                    task.isTimeout = $scope.taskTimeout(task);
                }
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
        // $scope.tasks.sort(sortDts);
        $scope.$apply();
    };

    $scope.getDataList();
}]);