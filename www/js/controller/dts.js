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
    var siteStr = localStorage.getItem("currentSite");
    var defaultStationSn = null; // 用户默认选择的站点
    if (siteStr) {
        defaultStationSn = JSON.parse(siteStr).sn;
    }
    $scope.userStations = [];
    $scope.devices = [];
    $scope.role = userService.getUserRole();
    $scope.needResign = $scope.role === 'OPS_ADMIN';      // 是否需要指派维修工
    $scope.isForDevice = deviceSns && deviceSns.length > 0;
    $scope.taskData = {};

    $scope.images = [];
    $scope.description = '';

    $scope.teams = [];
    $scope.teamVisible = false;         // 是否显示运维班组选择窗口
    $scope.teamUsers = [];
    $scope.handlerVisible = false;      // 是否显示维修工选择窗口
    $scope.recheckSelectorVisible = false; // 是否显示复测人员的选择窗口
    $scope.currentHandlerError = false;
    $scope.defectTypes = [];
    $scope.selectedDefectType = null;
    $scope.defectConflictDevices = []; // 已存在相同缺陷类型的设备
    $scope.warningModalVisible = false; // 缺陷类型重复设备告警对话框显示
    $scope.conflictSubmitError = null;
    var staticDevices = [];
    var opsCompanyId = null;
    var companyId = userService.getTaskCompanyId();
    if ($scope.needResign) {
        opsCompanyId = companyId;
    }
    var defectTypePicker = null;

    function init() {
        if ($scope.isForDevice) { // 如果只有设备sn，那么需要读取设备详情
            getDeviceDetail(deviceSns);
        }
        if (defaultStationSn) {
            getStaticDevicesOfStation(defaultStationSn);
        }
        if (!stationSn) {
            initStations();
        }
        getDefectTypes();
        initTaskTypeList();
        initDatePicker();
        initMembers();
    }

    function initStations() {
        ajax.get({
            url: '/stations',
            success: function (data) {
                var stations = [];
                var pickerData = [];
                var defaultSelectedIndex = null;
                data.forEach(function (s) {
                    if (!s.is_group) {
                        stations.push(s);
                        pickerData.push({
                            value: s.sn,
                            text: s.name
                        });
                        if (s.sn === defaultStationSn) {
                            $scope.taskData.station_sn = s.sn;
                            $scope.stationName = s.name;
                            stationSn = s.sn;
                            defaultSelectedIndex = pickerData.length-1;
                        }
                    }
                });
                $scope.userStations = stations;
                $scope.$apply();
                if (stations.length <= 1) {
                    if (stations.length === 1) { // 只有一个站点时，默认选中该站点
                        stationSn = stations[0].sn;
                    }
                    return;
                }
                // 初始化picker
                var stationPicker = new mui.PopPicker();
                stationPicker.setData(pickerData);
                if (defaultSelectedIndex !== null) {
                    stationPicker.pickers[0].setSelectedIndex(defaultSelectedIndex);
                }
                var showUserPickerButton = document.getElementById('stationPicker');
                showUserPickerButton.addEventListener('click', function(event) {
                    stationPicker.show(function(items) {
                        if (items[0].text !== stationSn) {
                            $scope.stationName = items[0].text;
                            stationSn = items[0].value;
                            $scope.devices = []; // 切换了站点后，清除所选设备
                            getStaticDevicesOfStation(stationSn);
                            $scope.$apply();
                        }
                    });
                }, false);
            },
            error: function(){
                console.log('获取站点列表失败');
            }
        });
    }

    function getDefectTypes() {
        ajax.get({
            url: '/defect_types?companyId=' + opsCompanyId,
            success: function (data) {
                $scope.defectTypes = data;
                defectTypePicker = new mui.PopPicker();
                var pickerData = [];
                data.forEach(function (item) {
                    pickerData.push({value: item.id, text: item.name})
                });
                defectTypePicker.setData(pickerData);
                var defectTypeBtn = document.getElementById('defectTypePicker');
                defectTypeBtn.addEventListener('click', function(event) {
                    defectTypePicker.show(function(items) {
                        $scope.selectedDefectType = {
                            id: items[0].value,
                            name: items[0].text.substring(items[0].text.indexOf(' ') + 1)
                        };
                        $scope.$apply();
                    });
                }, false);
                $scope.$apply();
            }
        });
    }

    function getStaticDevicesOfStation(stationSn) {
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
        var taskTypeButton = document.getElementById('taskTypePicker');
        if (taskTypeButton) {
            var taskTypePicker = new mui.PopPicker();
            taskTypePicker.setData(taskTypes);
            taskTypeButton.addEventListener('click', function(event) {
                taskTypePicker.show(function(items) {
                    $scope.taskTypeName = items[0].text;
                    $scope.taskData.task_type_id = items[0].value;
                    $scope.$apply();
                });
            }, false);
            // 默认使用一般缺陷
        }
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
        if (users && users.length) { // 消缺人员
            var accounts = [];
            users.forEach(function (u) {
                accounts.push(u.account);
            });
            $scope.taskData.current_handler = accounts.join(',');
        } else {
            $scope.taskData.current_handler = null;
        }
        $scope.currentHandlerError = false;
        $scope.toggleHandlerSelector();
    };

    $scope.onSelectedRecheckHandlers = function (team, users) {
        $scope.taskData.recheck_team = team ? team.id : null;
        $scope.taskData.recheck_users = users;
        if (users && users.length) { // 消缺人员
            var accounts = [];
            users.forEach(function (u) {
                accounts.push(u.account);
            });
            $scope.taskData.recheck_handlers = accounts.join(',');
        } else {
            $scope.taskData.recheck_handlers = null;
        }
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
        if (!stationSn) {
            // 当前未选中站点，则提示先选择站点
            if ($scope.userStations.length > 1) {
                $.notify.toast('请选选择站点')
            } else {
                $.notify.toast('您没有配置任何站点，请联系管理员')
            }
            return;
        }
        // 打开设备选择页面
        routerService.openPage($scope, '/templates/site/device-tree/device-select-page.html', {
            deviceDatas: staticDevices,
            multiple: true,
            defaultDevices: $scope.devices,
            onSelect: function (devices) {
                $scope.devices = devices;
                if (devices.length) {
                    $scope.deviceEmptyError = false;
                }
                history.back();
            }
        })
    };

    $scope.showDeviceDetail = function (device) { // 打开设备详情页
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {device_sn: device.sn, disableEdit: true});
    };

    $scope.submitForm = function() {
        var myFormInvalid = $scope.myForm.$invalid;
        $scope.currentHandlerError = $scope.needResign && !$scope.taskData.current_handler;
        $scope.deviceEmptyError = $scope.devices.length === 0;
        if(myFormInvalid || $scope.currentHandlerError || $scope.deviceEmptyError){
            console.log('form invalid');
        } else {
            var params = Object.assign({}, $scope.taskData);
            params.devices = [];
            $scope.devices.forEach(function (d) {
                params.devices.push({
                    sn: d.sn,
                    name: d.name
                });
            });
            // 增加图片信息
            if ($scope.images.length) {
                params.pictures = $scope.images;
            }
            params.events = [];
            params.station_sn = stationSn;
            params.mother_task_id = taskId;
            params.source = taskId ? TaskSource.Inspect : TaskSource.Repaire;     // 如果是从其他任务创建，即mother_task_id不为空，则来源为巡检，否则为报修
            if (params.expect_complete_time) {
                params.expect_complete_time = params.expect_complete_time + " 20:00:00";
            }
            if ($scope.selectedDefectType) {
                // 如果缺陷类型被修改过，则不传入id
                var name = $scope.selectedDefectType.name;
                params.defect_type_name = name;
                for (var i=0; i<$scope.defectTypes.length; i++) {
                    if ($scope.defectTypes[i].id === $scope.selectedDefectType.id) {
                        if ($scope.defectTypes[i].name === name) {
                            params.defect_type = $scope.selectedDefectType.id;
                        }
                        break;
                    }
                }
            }
            params.dts_device_defect_check = true;
            createTask(params);
        }
    };

    var requestParams = null; // 记录请求的参数

    function createTask (params) {
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(params),
            success: function (res) {
                $.notify.progressStop();
                if (res.code === 201) {
                    $.notify.info('创建成功');
                    if ($scope.isInPage) {
                        history.back();
                    }
                    $timeout(function () {
                        var url = '/templates/dts/dts-detail.html?id=' + res.id +
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
                } else if (res.code === 400) {
                    $.notify.error(res.message);
                } else if (res.code === 409) { // 部分设备存在相同缺陷类型的缺陷单
                    var conflictDeviceSns = res.data;
                    var tmpDevices = [];
                    params.devices.forEach(function (d) {
                        if (conflictDeviceSns.indexOf(d.sn) >= 0) {
                            tmpDevices.push(Object.assign({}, d));
                        }
                    });
                    $scope.defectConflictDevices = tmpDevices;
                    requestParams = Object.assign({}, params);
                    $scope.conflictSubmitError = null;
                    $scope.toggleWarningModal();
                    $scope.$apply();
                }

            },error: function () {
                $.notify.progressStop();
                $.notify.error('创建失败');
                console.log('error');
            }
        });
    }

    $scope.toggleWarningModal = function () {
        $scope.warningModalVisible = !$scope.warningModalVisible;
    };

    $scope.checkConflictDevice = function (d) {
        // 选中重复的设备
        d.checked = !d.checked;
    };

    $scope.submitIgnoreConflictCheck = function () { // 不检查重复
        requestParams.dts_device_defect_check = false;
        // 将未勾选的设备去除
        var toRemoveSns = [];
        $scope.defectConflictDevices.forEach(function (d) {
            if (!d.checked) {
                toRemoveSns.push(d.sn);
            }
        });
        var devices = [];
        requestParams.devices.forEach(function (d) {
            if (toRemoveSns.indexOf(d.sn) < 0) {
                devices.push(d);
            }
        });
        if (!devices.length) {
            $scope.conflictSubmitError = '忽略后该缺陷单没有需要提交的设备，无需创建';
            return;
        }
        var tmpParams = Object.assign({}, requestParams, {devices: devices});
        createTask(tmpParams);
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

app.controller('DtsEditCtrl', ['$scope', '$timeout', 'ajax', function ($scope, $timeout, ajax) {
    var task = $scope.task;
    $scope.expectTime = task.expect_complete_time ? task.expect_complete_time.substring(0, 10) : null;
    $scope.taskType = {
        id: task.task_type_id,
        name: task.task_type_name
    };

    function init() {
        $timeout(function () {
            initDatePicker();
            initTaskTypeList();
        }, 500);
    }

    init();

    function initDatePicker() {
        document.getElementById('expectedTime1').addEventListener('tap', function() {
            var _self = this;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    // 如果所选日期为今天，且已经是晚上18:00以后，则时间设置为23:59:59
                    $scope.expectTime = rs.text;
                    $scope.$apply();
                });
            } else {
                var options = {type: 'date'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    $scope.expectTime = rs.text;
                    $scope.$apply();
                });
            }
        }, false);
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
        taskTypePicker.pickers[0].setSelectedIndex(task.task_type_id - 8); // 默认选中

        taskTypeButton.addEventListener('click', function(event) {
            taskTypePicker.show(function(items) {
                $scope.taskType = {
                    id: items[0].value,
                    name: items[0].text
                };
                $scope.$apply();
            });
        }, false);
        // 默认使用一般缺陷
    }

    $scope.submitAndBack = function() {   // 缺陷修改
        var params = Object.assign({}, task, {
            expect_complete_time: $scope.expectTime + ' 20:00:00',
            task_type_id: $scope.taskType.id
        });
        ajax.put({
            url: '/opstasks/' + task.id,
            data: JSON.stringify(params),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            success: function (data) {
                Object.assign($scope.task, data);
                $scope.$apply();
                $.notify.info('修改成功');
                $timeout(function () {
                    $scope.cancel();
                }, 500);
            },
            error: function () {
                $.notify.error('缺陷修改发生异常');
            }
        })
    };

    $scope.cancel = function () {
        window.history.back();
    }
}]);