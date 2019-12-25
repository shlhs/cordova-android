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

app.controller('DtsCreateCtrl', function ($scope, $timeout, ajax, userService, routerService) {
    var taskId = GetQueryString("task_id") || $scope.task_id || '';
    $scope.device = {
        sn: GetQueryString('device_sn') || $scope.device_sn,
        station_sn: GetQueryString('station_sn') || $scope.sn,
        name: null,
        path: null
    };
    $scope.role = userService.getUserRole();
    $scope.needResign = $scope.role === 'OPS_ADMIN';      // 是否需要指派维修工

    $scope.isForDevice = $scope.device.sn ? true : false;
    $scope.taskData = {};
    $scope.name = $scope.device.path ? $scope.device.path + '/' + $scope.device.name : $scope.device.name;

    $scope.images = [];
    $scope.description = '';
    $scope.teams = [];
    $scope.teamVisible = false;         // 是否显示运维班组选择窗口
    $scope.teamUsers = [];
    $scope.handlerVisible = false;      // 是否显示维修工选择窗口
    $scope.handlerRowSpan = 1;       // 默认为一行
    var staticDevices = [];

    var taskTypePicker = null;
    var datePicker = null;
    var opsCompanyId = null;
    var companyId = userService.getCompanyId();
    if ($scope.needResign) {
        opsCompanyId = companyId;
    }

    // 先清除上一次选择的图片
    window.android && window.android.clearSelectedPhotos();

    var insertPosition = angular.element("#imageList>.upload-item");

    function init() {
        if (!$scope.device.sn && $scope.device.station_sn) {
            // 如果设备sn为空的话，则需要用户选择设备
            getStaticDevicesOfStation();
        }
        if ($scope.device.sn && !$scope.device.name) {
            // 如果只有设备sn，那么需要读取设备详情
            getDeviceDetail();
        }
        initTaskTypeList();
        initDatePicker();
        initMembers();
    }

    $scope.registerImageInfo = function (imageEleId) {
        return $scope.images;
    };

    function getStaticDevicesOfStation() {
        ajax.get({
            url: '/stations/' + $scope.device.station_sn + '/staticdevices',
            success: function (data) {
                staticDevices = data;
            }, error: function () {
                $.notify.error('获取设备列表失败');
            }
        });
    }

    function getDeviceDetail() {
        ajax.get({
            url: '/staticdevices',
            data: {
                sn: $scope.device.sn
            },
            success: function (data) {
                $scope.device = data;
                getDevicePath(data.sn);
                $scope.$apply();
            }
        });
    }

    function getDevicePath(sn) {
        ajax.get({
            url: '/staticdevices/path',
            data: {
                station_sn: $scope.device.station_sn,
                device_sns: sn
            },
            success: function (data) {
                $scope.device.path = data[sn];
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
        taskTypePicker = new mui.PopPicker();
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

    $scope.showHandlerSelector = function () {    // 显示维修工选择框
        if (!$scope.operatorTeam) {
            $.notify.toast('请先选择维修班组');
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
            handlerNames+= user.name + (user.phone ? '/' + user.phone : '') + '\n';
        });
        $scope.taskData.current_handler = accounts.join(',');
        $scope.handlerVisible = false;
        $scope.handlerName = handlerNames;
        $scope.handlerRowSpan = users.length || 1;
    };

    function initDatePicker() {

        document.getElementById('expectedTime').addEventListener('tap', function() {
            if(datePicker) {
                datePicker.show(function (rs) {
                    $scope.taskData.expect_complete_time = rs.text;
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

    $scope.openDeviceSelector = function () {
        // 打开设备选择页面
        routerService.openPage($scope, '/templates/dts/device-select-page.html', {
            deviceDatas: staticDevices,
            onSelect: function (device) {
                $scope.device.sn = device.sn;
                $scope.device.path = device.path;
                $scope.device.name = device.name;
                history.back();
            }
        }, {
            hidePrev: false
        })
    };

    $scope.submitForm = function() {
        if($scope.myForm.$invalid){
            console.log('form invalid');
        }else {
            $scope.createTask();
        }
    };

    $scope.createTask = function () {
        var taskData = $scope.taskData;
        taskData.devices = [{
            sn: $scope.device.sn,
            name: $scope.device.name
        }];
        // 增加图片信息
        if ($scope.images.length) {
            taskData.pictures = $scope.images;
        }
        taskData.events = [];
        taskData.station_sn = $scope.device.station_sn;
        taskData.mother_task_id = taskId;
        taskData.source = taskId ? TaskSource.Inspect : TaskSource.Repaire;     // 如果是从其他任务创建，即mother_task_id不为空，则来源为巡检，否则为报修
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
                notifyCreate(data.id);
            },error: function () {
                $.notify.progressStop();
                $.notify.error('创建失败');
                console.log('error');
            }
        });
    };

    function notifyCreate(taskId) {
        destroyPicker();
        ajax.get({
            url: '/opstasks',
            data: {
                task_ids: taskId
            },
            success: function (data) {
                var task = data[0];
                $scope.$emit('onBaseTaskUpdate', task);
                $scope.openPage($scope, '/templates/task/task-detail.html', {id: taskId}, {finish: true});
            },
            error: function () {
                $scope.openPage($scope, '/templates/task/task-detail.html', {id: taskId}, {finish: true});
            }
        });
    }

    $scope.$on('$destroy', function (event) {
        destroyPicker();
    });

    function destroyPicker() {
        if (taskTypePicker) {
            taskTypePicker.dispose();
            taskTypePicker = null;
        }
        if (datePicker) {
            datePicker.dispose();
            datePicker = null;
        }
    }

    init();
});

// 设备缺陷记录
app.controller('DeviceDtsListCtrl', function ($scope, ajax, scrollerService, routerService, userService) {
    var status = $scope.status;
    var deviceSn = $scope.device_sn;
    var stationSn = $scope.sn;
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
            case TaskStatus.ToClose:
                status1 = 1;
                break;
        }
        switch (stage2) {
            case TaskStatus.Closed:
                status2 = 2;
                break;
            case TaskStatus.ToClose:
                status2 = 1;
                break;
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
        if (DtsTaskType.indexOf(taskData.task_type_id) < 0 || !taskData.device_record.length || taskData.device_record[0].device_sn !== deviceSn) {
            return;
        }
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
        routerService.openPage($scope, '/templates/dts/dts-create.html', {
            sn: stationSn,
            device_sn: deviceSn
        });
    };

    var taskUpdateListener = $scope.$on('onTaskUpdate', function (event, data) {
        formatTaskStatusName(data);
        data.isTimeout = $scope.taskTimeout(data);
        $scope.updateTask(data);
    });

    $scope.$on('$destroy', function (event) {
        if (taskUpdateListener) {
            taskUpdateListener();
            taskUpdateListener = null;
        }
    });

    $scope.openTask = function (task) {
        routerService.openPage($scope, '/templates/task/task-detail.html',
            {
                id: task.id
            });
    };

    $scope.getDataList();
});

app.controller('StationDtsListCtrl', function ($scope, $rootScope, scrollerService, userService, ajax, routerService) {
    var stationSn = $scope.sn;
    $scope.TaskStatus = TaskStatus;
    $scope.tasks = [];
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.todoCount = 0;

    function sortDts(d1, d2) {
        // 排序规则：未完成、待审批、已关闭，同样状态的按截止日期排序
        var stage1 = d1.stage_id;
        var stage2 = d2.stage_id;
        var status1 = 0;        // 0:未完成，2：已关闭
        var status2 = 0;        // 0:未完成，2：已关闭
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
                    parseTaskData(task);
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
    $scope.openTask = function (task) {
        routerService.openPage($scope, '/templates/task/task-detail.html',
            {
                id: task.id
            });
    };

    function parseTaskData(task) {
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
        return task;

    }

    $scope.openDtsCreatePage = function () {
        // window.location.href = '/templates/dts/dts-create.html?station_sn=' + (stationSn || '') + '&device_sn=' + (deviceSn || '');
        routerService.openPage($scope, '/templates/dts/dts-create.html', {
            station_sn: $scope.station_sn || '',
            device_sn: $scope.device_sn || ''
        });
    };

    $scope.updateTask = function (taskData) {
        // 如果不是缺陷，则返回
        if (DtsTaskType.indexOf(taskData.task_type_id) < 0) {
            return;
        }
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

    var taskUpdateListener = $scope.$on('onTaskUpdate', function (event, data) {
        parseTaskData(data);
        $scope.updateTask(data);
    });

    $scope.$on('$destroy', function (event) {
        if (taskUpdateListener) {
            taskUpdateListener();
            taskUpdateListener = null;
        }
        console.log('station dts destroy');
    });

    $scope.getDataList();
});