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
app.controller('DtsCreateCtrl', ['$scope', '$state', '$stateParams', '$timeout', 'ajax', 'userService', 'routerService', 'mediaService', '$myTranslate', function ($scope, $state, $stateParams, $timeout, ajax, userService, routerService, mediaService, $myTranslate) {
    var taskId = $stateParams.taskId; // GetQueryString("task_id") || $scope.task_id || '';
    var deviceSns = $stateParams.deviceSns; // GetQueryString('device_sns');
    var stationSn = $stateParams.stationSn; //  GetQueryString('station_sn');
    var siteStr = localStorage.getItem("currentSite");
    var defaultStationSn = null; // 用户默认选择的站点
    if (siteStr) {
        defaultStationSn = JSON.parse(siteStr).sn;
    }
    $scope.showRecheck = gShowRecheck;
    $scope.userStations = [];
    $scope.devices = [];
    $scope.role = userService.getUserRole();
    $scope.needResign = $scope.role === 'OPS_ADMIN';      // 是否需要指派维修工
    $scope.isForDevice = deviceSns && deviceSns.length > 0;
    $scope.taskData = {
        voice_src: null
    };

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
    $scope.videoUrl = null; // 视频本地或远程链接
    $scope.audioUrl = null;  // 语音本地或远程链接
    $scope.audioDuration = null; // 语音时长
    $scope.audioVideoEnabled = window.android && window.android.captureVideo;
    var staticDevices = [];
    var opsCompanyId = null;
    var companyId = userService.getTaskCompanyId();
    if ($scope.needResign) {
        opsCompanyId = companyId;
    }
    var dtPicker = null;
    var taskTypePicker = null;
    var defectTypePicker = null;
    $scope.isEnglish = gIsEnglish;

    $scope.$on('$destroy', function () {
       if (defectTypePicker) {
           defectTypePicker.dispose();
           defectTypePicker = null;
       }
       if (taskTypePicker) {
           taskTypePicker.dispose();
           taskTypePicker = null;
       }
       if (dtPicker) {
           dtPicker.dispose();
           dtPicker = null;
       }
    });

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
        pickerI18n();
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
                pickerI18n();
            }, error: function () {
                $.notify.error($myTranslate.instant('get device list failed'));
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
                    pickerData.push({value: item.id, text: item.name});
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
                pickerI18n();
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
                $.notify.error($myTranslate.instant('get devices failed'));
            }
        });
    }

    function getDeviceDetail(sns) {
        ajax.get({
            url: '/stations/' + stationSn + '/staticdevices',
            data: {
                sns: typeof sns === 'string' ? sns : sns.join(',')
            },
            success: function (data) {
                $scope.devices = data;
                $scope.$apply();
            }
        });
    }

    function initTaskTypeList() {
        ajax.get({
            url: '/opstasks/task_types',
            success: function (data) {
                if(data && data.length  > 0){
                    var taskTypes = [];
                    data.forEach(item=>{
                        if(DtsTaskType.indexOf(item.id) >= 0){
                            taskTypes.push({
                                value: item.id,
                                text: item.name
                            });
                        }
                    });
                    var taskTypeButton = document.getElementById('taskTypePicker');
                    if (taskTypeButton) {
                        taskTypePicker = new mui.PopPicker();
                        taskTypePicker.setData(taskTypes);
                        taskTypeButton.addEventListener('click', function(event) {
                            taskTypePicker.show(function(items) {
                                var v = items[0].value;
                                $scope.taskTypeName = items[0].text;
                                $scope.taskData.task_type_id = v;
                                $scope.showRecheck = v !== TaskTypes.HiddenDanger;
                                $scope.$apply();
                            });
                        }, false);
                        // 默认使用一般缺陷
                    }
                }
            }
        });
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
        var timeBtn = document.getElementById('expectedTime');
        if (timeBtn) {
            timeBtn.addEventListener('tap', function() {
                var _self = this;
                if(dtPicker) {
                    dtPicker.show(function (rs) {
                        $scope.taskData.expect_complete_time = rs.text;
                        $scope.$apply();
                    });
                } else {
                    /*
                     * 首次显示时实例化组件
                     * 示例为了简洁，将 options 放在了按钮的 dom 上
                     * 也可以直接通过代码声明 optinos 用于实例化 DtPicker
                     */
                    dtPicker = new mui.DtPicker({type: 'date', beginDate: new Date()});
                    dtPicker.show(function(rs) {
                        $scope.taskData.expect_complete_time = rs.text;
                        $scope.$apply();
                    });
                    datePickerI18n();
                }
            }, false);
        }
    }

    $scope.openDeviceSelector = function () {
        if (!stationSn) {
            // 当前未选中站点，则提示先选择站点
            if ($scope.userStations.length > 1) {
                $.notify.toast($myTranslate.instant('please.select station'));
            } else {
                $.notify.toast($myTranslate.instant('station.empty'));
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
        });
    };

    $scope.showDeviceDetail = function (device) { // 打开设备详情页
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {device_sn: device.sn, disableEdit: true});
    };

    $scope.onUpdateVideo = function (url) {
        $scope.videoUrl = url;
    };

    $scope.onUpdateVoice = function (url, duration) {
        $scope.audioUrl = url;
        $scope.audioDuration = duration;
    };

    $scope.submitForm = function() {
        var myFormInvalid = $scope.myForm.$invalid;
        $scope.currentHandlerError = $scope.needResign && !$scope.taskData.current_handler;
        $scope.deviceEmptyError = $scope.devices.length === 0;
        if(myFormInvalid || $scope.currentHandlerError || $scope.deviceEmptyError){
            console.log('form invalid');
        } else {
            var params = Object.assign({}, $scope.taskData, {
                current_handler_users: null,
                recheck_users: null,
            });
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
            // createTask(params);
            checkAndUploadVideoAndAudio(params);
        }
    };
    
    function checkAndUploadVideoAndAudio(outputParam) { // 如果检测到有视频或语音，先上传得到链接后，写入outputParam，再调用callback进行提交
        $.notify.progressStart();

        function uploadFinish() {
            createTask(outputParam);
        }

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
                            $.notify.error($myTranslate.instant("upload video failed"));
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

    var requestParams = null; // 记录请求的参数

    function createTask (params) {
        var createdData = null;
        ajax.post({
            url: '/opstasks/' + companyId,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(params),
            success: function (res) {
                $.notify.progressStop();
                if (res.code === 201) {
                    $.notify.info($myTranslate.instant('submit successful'));
                    createdData = res;
                    if (!$stateParams.notOpenDetail) { // 从巡检设备创建缺陷单时，创建成功后不打开缺陷单详情
                        window.addEventListener('popstate', _openNewDts);
                    }
                    setTimeout(function () {
                        history.back();
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
                $.notify.error($myTranslate.instant('submit failed'));
                console.log('error');
            }
        });
        function _openNewDts() {
            var currentRouterIndex = $state.current.name;
            $state.go(currentRouterIndex + '.dts', {id: createdData.id});
            window.removeEventListener('popstate', _openNewDts);
        }
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
            $scope.conflictSubmitError = $myTranslate.instant('defect.submit.nodevice');
            return;
        }
        var tmpParams = Object.assign({}, requestParams, {devices: devices});
        createTask(tmpParams);
    };

    init();
}]);

// 设备缺陷记录
app.controller('DeviceDtsListCtrl', ['$scope', '$state', 'ajax', 'scrollerService', 'userService', function ($scope, $state, ajax, scrollerService, userService) {
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

    $scope.$on('toUpdateTask', function (event, taskId, taskData) {
        $scope.updateTask(taskData);
    });

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
        $state.go('.newDts', {
            stationSn: stationSn || '',
            deviceSns: deviceSn
        });
    };

    $scope.getDataList();
}]);

app.controller('StationDtsListCtrl', ['$scope', '$stateParams', '$rootScope', 'scrollerService', 'userService', 'ajax', function ($scope, $stateParams, $rootScope, scrollerService, userService, ajax) {
    var stationSn = $stateParams.sn; // GetQueryString("sn");
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

    $scope.$on('toUpdateTask', function (event, taskId, taskData) {
        $scope.updateTask(taskData);
    });

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

app.controller('DtsEditCtrl', ['$scope', '$timeout', 'ajax', '$myTranslate', function ($scope, $timeout, ajax, $myTranslate) {
    var task = $scope.task;
    $scope.expectTime = task.expect_complete_time ? task.expect_complete_time.substring(0, 10) : null;
    $scope.taskType = {
        id: task.task_type_id,
        name: task.task_type_name
    };
    var taskTypePicker = null;
    var dtPicker = null;

    function init() {
        $timeout(function () {
            initDatePicker();
            initTaskTypeList();
        }, 500);
    }

    init();

    function initDatePicker() {
        document.getElementById('expectedTime1').addEventListener('tap', function() {
            if(dtPicker) {
                dtPicker.show(function (rs) {
                    // 如果所选日期为今天，且已经是晚上18:00以后，则时间设置为23:59:59
                    $scope.expectTime = rs.text;
                    $scope.$apply();
                });
            } else {
                // 可选的开始时间为今天和expect_complete_time中较早的那一个
                var today = new Date().toString('YYYY-MM-DD');
                var startDate = new Date();
                if ($scope.expectTime && $scope.expectTime < today) {
                    startDate = new Date($scope.expectTime);
                }
                var options = {type: 'date', beginDate: startDate};
                dtPicker = new mui.DtPicker(options);
                dtPicker.show(function(rs) {
                    $scope.expectTime = rs.text;
                    $scope.$apply();
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
                    taskTypePicker = new mui.PopPicker();
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
                }
            }
        })
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
                $.notify.info($myTranslate.instant('update successful'));
                $timeout(function () {
                    $scope.cancel();
                }, 500);
            },
            error: function () {
                $.notify.error($myTranslate.instant('update defect failed'));
            }
        });
    };

    $scope.cancel = function () {
        window.history.back();
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