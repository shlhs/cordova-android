'use strict';

/**
 * Created by liucaiyun on 2017/8/26.
 */

app.controller('DeviceListCtrl', ['$scope', 'ajax', 'scrollerService', function ($scope, ajax, scrollerService) {
    var sn = GetQueryString('sn');
    $scope.sn = sn;
    $scope.deviceList = [];
    $scope.faultDeviceList = [];
    $scope.deviceLoading = true;
    $scope.currentDevices = [];
    $scope.showType = 'all';

    $scope.getDataList = function() {
        ajax.get({
            url: "/stations/" + sn + "/devices",
            cache: false,
            success: function(result) {
                // 设置默认状态胃正常
                for (var i=0; i<result.length; i++){
                    result[i].status = 'normal';
                    result[i].status_name = '正常';
                }
                $scope.deviceList = result;
                $scope.deviceLoading = false;
                $scope.$apply();
                getDeviceVars(result);
            },
            error: function (a,b,c) {
                $.notify.error('获取设备列表失败');
                $scope.deviceLoading = false;
                $scope.$apply();
                console.log('get var VarRealtimeDatas fail');
            }
        });
    };

    $scope.gotoDevice = function (stationSn, deviceSn, deviceName) {
        location.href = '/templates/site/device-monitor.html?stationSn=' + stationSn + '&deviceSn=' + deviceSn + '&deviceName=' + deviceName;
    };

    function formatDeviceStatus(device) {
        if (device.communi_status > 0){
            device.status = 'offline';
            device.status_name = '离线';
            $scope.faultDeviceList.push(device);

        }else{
            if (device.running_status > 0){
                device.status = 'danger';
                device.status_name = '故障';
                $scope.faultDeviceList.push(device);
            }else{
                device.status = 'normal';
                device.status_name = '正常';
            }
        }
    }

    function getDeviceVars(deviceList) {
        scrollerService.initScroll("#devices", $scope.getDataList);
        if (deviceList.length === 0){
            return;
        }
        var deviceSns = [];
        for (var i in deviceList){
            deviceSns.push(deviceList[i].sn);
        }
        ajax.get({
            url: '/devices/details?device_sns=' + deviceSns.join(','),
            success: function (data) {
                var deviceData = null, deviceList = $scope.deviceList, device=null;
                // 将实时数据写入设备列表中
                var j = 0;
                for (var i in data){
                    deviceData = data[i];
                    for (; j < deviceList.length; j++){
                        if (deviceList[j].id === deviceData.device.id){
                            break;
                        }
                    }
                    if (j >= deviceList.length){
                        break;
                    }
                    device = deviceList[j];
                    device.communi_status = deviceData.communi_status;
                    device.running_status = deviceData.running_status;
                    device.important_realtime_datas = deviceData.important_realtime_datas;
                    formatDeviceStatus(device);
                }
                $scope.$apply();
            },
            error: function () {
            }
        });
    }

    $scope.changeDeviceType = function ($event, showType) {
        if (showType === 'all'){
            $scope.currentDevices = $scope.deviceList;
        }else{
            $scope.currentDevices = $scope.faultDeviceList;
        }
        $scope.showType = showType;
    };

    // $scope.getDataList();
}]);

app.controller('DeviceDetailCtrl', ['$scope', '$rootScope', '$stateParams', 'ajax', function ($scope, $rootScope, $stateParams, ajax) {
    // var stationSn = $stateParams.sn, deviceSn=$stateParams.deviceSn;
    $scope.stationSn = GetQueryString('stationSn');
    $scope.deviceSn=GetQueryString('deviceSn');
    $scope.deviceName = GetQueryString('deviceName');
    $scope.deviceData = null;

    ajax.get({
        url: '/devices/details?device_sns=' + $scope.deviceSn,
        success: function (data) {
            $scope.isLoading = false;
            $scope.deviceData = data[0].device;
            $scope.deviceName = $scope.deviceData.name;
            $scope.$apply();
        },
        error: function () {
            $scope.isLoading = false;
            $.notify.error("获取设备信息失败");
        }
    });


    $scope.openDoc = function (link) {
        if (window.android){
            window.android.openFile(link);
        }else
        {
            window.location.href =link;
        }
    };
}]);

app.controller('DeviceAnalogVarCtrl', ['$scope', 'ajax', '$interval', function ($scope, ajax, $interval) {        //模拟量

    var stationSn = GetQueryString('stationSn'), deviceSn=GetQueryString('deviceSn');
    var analogVars = [];
    $scope.analogValues=[];
    $scope.has_data = true;
    $scope.isLoading = true;
    $scope.getDeviceVar = function() {
        analogVars = [];
        var url = "/stations/" + stationSn + "/devices/" + deviceSn + "/devicevars";
        ajax.get({
            url: url,
            dataType: 'json',
            success: function (data) {
                if (!data || !data.length){
                    $scope.has_data = false;
                    $scope.isLoading = false;
                    $scope.$apply();
                    return;
                }
                for (var i in data){
                    if (data[i].type === 'Analog')
                    {
                        analogVars.push(data[i].sn);
                    }
                }
                getRealTimeData();
            },
            error: function (xhr, status, err) {
                $scope.isLoading = false;
                $scope.$apply();
                $.notify.error('获取数据异常');
            }
        });
    };

    function getRealTimeData() {
        var url = "/devicevars/getrealtimevalues";
        if (analogVars.length){
            ajax.get({
                url: url,
                data: "sns=" + analogVars.join(","),
                success: function(data) {
                    $scope.analogValues = data;
                    $scope.isLoading = false;
                    $scope.$apply();
                },
                error: function(err) {
                    $.notify.error("获取设备变量实时值失败");
                    $scope.isLoading = false;
                    $scope.$apply();
                    console.log(err);
                }
            });
        }else{
            $scope.isLoading = false;
            $scope.$apply();
        }
    }
    var refreshInterval = $interval($scope.getDeviceVar, 4000);

    $scope.$on('$destroy',function(){
        $interval.cancel(refreshInterval);
    });

    $scope.getDeviceVar();
}]);

app.controller('DeviceDigitalVarCtrl', ['$scope', 'ajax', '$interval', function ($scope, ajax, $interval) {        //状态量

    var stationSn = GetQueryString('stationSn'), deviceSn=GetQueryString('deviceSn');
    var digitalVars=[];
    $scope.digitalValues=[];
    $scope.has_data = true;
    $scope.isLoading = true;
    $scope.getDeviceVar = function() {
        digitalVars = [];
        var url = "/stations/" + stationSn + "/devices/" + deviceSn + "/devicevars";
        ajax.get({
            url: url,
            dataType: 'json',
            success: function (data) {
                if (!data || !data.length){
                    $scope.has_data = false;
                    $scope.isLoading = false;
                    $scope.$apply();
                    return;
                }
                for (var i in data){
                    if (data[i].type === 'Digital')
                    {
                        digitalVars.push(data[i].sn);
                    }
                }
                getRealTimeData();
            },
            error: function (xhr, status, err) {
                $scope.isLoading = false;
                $scope.$apply();
                $.notify.error('获取数据异常');
            }
        });
    };

    function getRealTimeData() {
        var url = "/devicevars/getrealtimevalues";
        if (digitalVars.length){
            ajax.get({
                url: url,
                data: "sns=" + digitalVars.join(","),
                success: function(data) {
                    $scope.digitalValues = data;
                    $scope.isLoading = false;
                    $scope.$apply();
                },
                error: function(err) {
                    $.notify.error("获取设备变量实时值失败");
                    $scope.isLoading = false;
                    $scope.$apply();
                    console.log(err);
                }
            });
        }
        else{
            $scope.isLoading = false;
            $scope.$apply();
        }
    }

    var refreshInterval = $interval($scope.getDeviceVar, 4000);

    $scope.$on('$destroy',function(){
        $interval.cancel(refreshInterval);
    });

    $scope.getDeviceVar();
}]);

app.controller('DeviceInfoDetailCtrl', ['$scope', 'ajax', function ($scope, ajax) {
    var sn = GetQueryString("sn");
    $scope.deviceInfo = null;
    $scope.isLoading = true;
    ajax.get({
        url: '/devices/details?device_sns=' + sn,
        success: function (data) {
            $scope.isLoading = false;
            $scope.deviceInfo = data[0].device;
            $scope.$apply();
        },
        error: function () {
            $scope.isLoading = false;
            $.notify.error("获取设备信息失败");
        }
    })
}]);

app.controller('DeviceTaskHistoryCtrl', ['$scope', 'ajax', 'scrollerService', function ($scope, ajax, scrollerService) {
    var deviceSn = GetQueryString('deviceSn');
    var allTasks = [];
    $scope.TaskStatus = TaskStatus;
    $scope.showTasks = [];
    $scope.showType = 'open';    // all, open, closed
    $scope.isLoading = true;
    $scope.openTaskCount = 0;   // 未关闭的任务数
    $scope.closedTaskCount = 0; // 已关闭的任务数
    $scope.getDataList = function() {

        scrollerService.initScroll("#task_history_scroll", $scope.getDataList);
        var url = "/opstasks?device_sn=" + deviceSn;
        ajax.get({
            url: url,
            success: function(data) {
                $scope.isLoading = false;
                data.sort(sortByUpdateTime);
                for (var i in data){
                    formatTaskStatusName(data[i]);
                }
                allTasks = data;
                $scope.changeTaskType($scope.showType);
                $scope.$apply();
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
            $scope.closedTaskCount = showTasks.length;
            $scope.openTaskCount = allTasks.length - $scope.closedTaskCount;
        }else{
            for (var i in allTasks){
                if (allTasks[i].stage_id != TaskStatus.Closed){
                    showTasks.push(allTasks[i]);
                }
            }
            $scope.openTaskCount = showTasks.length;
            $scope.closedTaskCount = allTasks.length - $scope.openTaskCount;
        }
        $scope.showTasks = showTasks;
        $scope.showType = type;
    };

    $scope.openTask = function (task) {
        location.href = '/templates/task/task-detail.html?id=' + task.id + '&taskType=' + task.task_type_id;
    };

    $scope.getDataList();
}]);

app.controller('DeviceTreeCommonCtrl', ['$scope', function ($scope) {
    $scope.treeData = [];
    $scope.selectOptions = [
        {name: '分组1',children: [{name: '分组2'}]},
        {name: '分组2', children: [{name: '分组3'}]}, null, null, null];       // select内容按5级显示
    $scope.deviceSelected = [null, null, null, null, null];
    $scope.collapse = [false, false, 0];        // 表示选择器是否展开，一级、二级用true/false表示是否展开，三级用数据id表示
    $scope.maxDepth = -1;

    function formatToTreeData(data) {

        function addToGroup(newItem, items, depth) {
            if (!items || !items.length) {
                return;
            }
            if (depth > maxDepth) {
                maxDepth = depth;
            }
            for (var i=0; i<items.length; i++) {

                var item = items[i];
                if (!item.is_group){
                    continue;
                }
                if (item.id === newItem.parent_id) {
                    if (newItem.is_group) {
                        newItem.children = [];
                    }
                    newItem.text = newItem.name;
                    item.children.push(newItem);
                    if (maxDepth < depth + 1) {
                        maxDepth = depth + 1;
                    }
                    return true;
                }
                if (item.children) {
                    if (addToGroup(newItem, item.children, depth+1)) {
                        return true;
                    }
                }
            }

        }

        function _indexs_sort(item) {

            if (!item.is_group) {
                return;
            }
            if (item.indexs) {
                var newChildren = [];
                var childrenMap = {};
                item.children.forEach(function (n, i) {
                    childrenMap[n.id] = n;
                });
                item.indexs.split(',').forEach(function (i) {

                    if (childrenMap[i]) {
                        newChildren.push(childrenMap[i]);
                    }
                });
                item.children = newChildren;
            }
            item.children.forEach(function (child, i) {
                _indexs_sort(child);
            });
        }


        var formatted = [];
        var maxDepth = -1;

        // 先按照depth进行排序
        data = data.sort(function (a, b) {
            if (a.depth !== b.depth) {
                return a.depth - b.depth;
            }
            if (a.is_group !== b.is_group) {  // 分组排在前
                return b.is_group - a.is_group;
            }
            return a.name.localeCompare(b.name, 'zh-CN');
        });

        data.forEach(function (item) {
            if (item.parent_id) {
                addToGroup(item, formatted, 1);
            } else if (item.depth < 0) {
                // 根节点
                item.text = item.name;
                item.is_group = true;
                item.children = [];
                formatted.push(item);
            } else {
                item.text = item.name;
                item.children = [];
                formatted.push(item);
            }
        });

        // 根据父节点的indexs对树再次进行排序
        _indexs_sort(formatted[0]);
        $scope.maxDepth = maxDepth - 1;
        return formatted;
    }

    function setDefaultData(startDepth) {       //
        if (!startDepth) {
            var range = $scope.treeData, start=5-$scope.maxDepth;
        } else {
            var range = $scope.deviceSelected[startDepth-1].children, start=startDepth;
        }
        for (var i=0; i<$scope.maxDepth; i++) {
            if (range && range.length) {
                $scope.selectOptions[start+i] = range;
                if (range[0].group) {
                    $scope.deviceSelected[start+i] = range[0];
                }
                if (start+i===2 && range[0].group) {
                    // 默认展开被选中的group
                    $scope.collapse[2] = range[0].id;
                }
                range = range[0].children;
            } else {
                $scope.selectOptions[start+i] = null;
                $scope.deviceSelected[start+i] = null;
            }
        }
    }

    $scope.toggleCollapse = function (index) {
        // 点击下拉选择，显示或隐藏下拉选择框
        if (index < 0) {
            for (var i=0; i<2; i++) {
                $scope.collapse[i] = false;
            }
        } else {
            if (index === 1) {
                // 如果第二个选择框没有数据，则无法弹出
                if (!$scope.deviceSelected[1]) {
                    return;
                }
            }
            if ($scope.collapse[index]) {
                $scope.collapse[index] = false;
            } else {
                $scope.collapse[index] = true;
                $scope.collapse[1-index] = false;
            }
        }
    };

    var thirdSelectorCurrentCollapse = null;
    // 点击选中某一个设备或分组
    $scope.chooseDeviceOrGraph = function (selectorIndex, itemData) {   // selectorIndex: 是第几个选择器

        if (!itemData.group) {
            // 跳转到设备监测详情
            location.href = '/templates/site/device-monitor.html?stationSn=' + stationSn + '&deviceSn=' + itemData.sn + '&deviceName=' + itemData.name;
            return;
        }
        if (selectorIndex === 0 || selectorIndex === 1)
        {
            $scope.deviceSelected[selectorIndex] = itemData;
            setDefaultData(selectorIndex+1);
            $scope.toggleCollapse(selectorIndex);
        }
        else if (selectorIndex === 2) {
            if (itemData.group) {
                if ($scope.collapse[2] === itemData.id) {
                    $scope.collapse[2] = -1;
                } else {
                    $scope.collapse[2] = itemData.id;
                }
                thirdSelectorCurrentCollapse = itemData;
            }
        } else if (selectorIndex === 3) {
            $scope.deviceSelected[selectorIndex] = itemData;
            // 设置上一级为父节点
            $scope.deviceSelected[selectorIndex-1] = thirdSelectorCurrentCollapse;
            setDefaultData(selectorIndex+1);
        }
        return false;
    };
}]);

app.controller('DeviceMonitorListCtrl', ['$scope', '$stateParams', '$state', 'ajax', 'platformService', function ($scope, $stateParams, $state, ajax, platformService) {       // 检测设备列表页
    var stationSn = $stateParams.sn;
    $scope.deviceDatas = [];
    $scope.treeData = [];
    $scope.hasDevice = false; // 是否有设备
    var devices = [];       // 设备
    $scope.isLoading = false;
    $scope.loadingFailed = false;
    $scope.ellapseId = null;
    $scope.selectOptions = [
        {name: '分组1',children: [{name: '分组2'}]},
        {name: '分组2', children: [{name: '分组3'}]}, null, null, null];       // select内容按5级显示
    $scope.deviceSelected = [null, null, null, null, null];
    $scope.collapse = [false, false, 0];        // 表示选择器是否展开，一级、二级用true/false表示是否展开，三级用数据id表示
    $scope.maxDepth = -1;


    function _formatDeviceStatus(device) {
        if (!device.is_group) {
            if (device.communi_status > 0){
                device.status = 'offline';
                device.status_name = '离线';
                $scope.faultDeviceList.push(device);

            }else{
                if (device.running_status > 0){
                    device.status = 'danger';
                    device.status_name = '故障';
                    $scope.faultDeviceList.push(device);
                }else{
                    device.status = 'normal';
                    device.status_name = '正常';
                }
            }
        }
    }

    $scope.getDataList = function () {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/devices?&station_sn=' + stationSn,
            success: function (res) {
                var data = res.data;
                $scope.isLoading = false;
                // 默认状态为"未知"
                data.forEach(function (d) {
                    if (!d.is_group)
                    {
                        d.status = 'offline';
                    }
                });
                $scope.deviceDatas = data;

                $scope.hasDevice = data.length > 1; // 大于一个就说明有设备或分组
                $scope.$apply();
                getDeviceVars(data, function (newDataList) {
                    $scope.isLoading = false;
                    $scope.deviceDatas = newDataList;
                    $scope.$apply();
                });
            },
            error: function () {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    function getDeviceVars(deviceList, cb) {
        if (deviceList.length === 0){
            // cb([]);
            return;
        }
        var deviceSns = [];
        for (var i in deviceList){
            if (!deviceList[i].is_group)
            {
                deviceSns.push(deviceList[i].sn);
            }
        }
        ajax.get({
            url: '/devices/details?device_sns=' + deviceSns.join(','),
            success: function (data) {
                var deviceData = null, device=null;
                // 将实时数据写入设备列表中
                for (var i=0; i<data.length; i++){
                    deviceData = data[i];
                    for (var j=0; j < deviceList.length; j++){
                        if (deviceList[j].id === deviceData.device.id){
                            break;
                        }
                    }
                    if (j >= deviceList.length){
                        continue;
                    }
                    device = deviceList[j];
                    device.communi_status = deviceData.communi_status;
                    device.running_status = deviceData.running_status;
                    device.important_realtime_datas = deviceData.important_realtime_datas;
                    _formatDeviceStatus(device);
                }
                cb(deviceList);
            },
            error: function () {
            }
        });
    }

    $scope.gotoDevice = function (deviceData) {
        // location.href = '/templates/site/device-monitor.html?stationSn=' + stationSn + '&deviceSn=' + deviceData.sn + '&deviceName=' + encodeURIComponent(deviceData.name);
        $state.go('.detail', {deviceSn: deviceData.sn, name: deviceData.name});
    };

    $scope.getDataList();
}]);

app.controller('DeviceMonitorCtrl', ['$scope', '$stateParams', 'ajax', 'appStoreProvider', 'authService', 'platformService', '$myTranslate', function ($scope, $stateParams, ajax, appStoreProvider, authService, platformService, $myTranslate) {
    $scope.isLoading = true;
    $scope.stationSn = $scope.currentSite.sn; // GetQueryString('stationSn');
    $scope.deviceSn= $stateParams.deviceSn; // GetQueryString('deviceSn');
    $scope.deviceName = $stateParams.name; // GetQueryString('deviceName');
    $scope.realtimeLabel = $myTranslate.instant('device.realtime');
    $scope.historyLabel = $myTranslate.instant('device.history');
    $scope.analogLabel = $myTranslate.instant('var.analog');
    $scope.digitalLabel = $myTranslate.instant('var.digital');

    $scope.canControl = authService.canControlStation($scope.stationSn);  // 能效模式不能远程控制
    $scope.secondOptions = {};
    $scope.secondOptions[$scope.realtimeLabel] = [];
    $scope.secondOptions[$scope.historyLabel] = [];
    $scope.collapse = [false, false];
    $scope.showType = $scope.realtimeLabel;
    $scope.dataName = $scope.analogLabel;
    $scope.realtime = [];       // 实时数据
    $scope.history = [];        // 历史数据
    // $scope.showType = 'realtime';   // 默认显示实时数据标签页
    $scope.currentSelected = [$scope.realtimeLabel, $scope.analogLabel];

    $scope.selectShowType = function (type, force) {        // force: 即使type===showType，也强制刷新
        // 选择 实时数据还是历史数据
        if ($scope.showType !== type || force) {
            $scope.showType = type;
            var datas = $scope.secondOptions[$scope.showType];
            $scope.dataName = datas.length ? datas[0].name : '';
            $scope.toggleCollapse(-1);
            if ($scope.showType === $scope.historyLabel) {
                $scope.$broadcast('$onHistoryVarChanged', datas.length ? datas[0] : null);
            } else {
                $scope.$broadcast('$onRealtimeTypeChanged', datas.length ? datas[0] : null);
            }
        } else {
            $scope.toggleCollapse(-1);
        }
    };

    $scope.toggleCollapse = function (index) {
        // 点击下拉选择，显示或隐藏下拉选择框
        if (index < 0) {
            for (var i=0; i<$scope.collapse.length; i++) {
                $scope.collapse[i] = false;
            }
        } else {
            if (index === 1) {
                // 如果第二个选择框没有数据，则无法弹出
                if (!$scope.dataName) {
                    return;
                }
            }
            if ($scope.collapse[index]) {
                $scope.collapse[index] = false;
            } else {
                $scope.collapse[index] = true;
                $scope.collapse[1-index] = false;
            }
        }
    };

    $scope.selectDataType = function (dataItem) {
        // 数据数据项：模拟量/状态量； 电压/电流等
        $scope.dataName = dataItem.name;
        $scope.toggleCollapse(1);
        if ($scope.showType === $scope.historyLabel) {
            $scope.$broadcast('$onHistoryVarChanged', dataItem);
        } else {
            $scope.$broadcast('$onRealtimeTypeChanged', dataItem);
        }
    };

    function getDeviceVars() {  // 获取设备的所有变量
        $scope.isLoading = true;
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/devices/' + $scope.deviceSn + '/variables',
            success: function (response) {
                var data = response.data;
                var analogs=[], digitals=[];
                data.forEach(function (n) {
                    if (n.type === 'Analog') {
                        analogs.push(n.sn);
                    } else if (n.type === 'Digital') {
                        digitals.push(n.sn);
                    }
                });
                if (analogs.length) {
                    $scope.realtime.push({name: $scope.analogLabel, type: 'analog', sns: analogs});
                    $scope.secondOptions[$scope.realtimeLabel].push({name: $scope.analogLabel, type: 'analog', sns: analogs});
                }
                if (digitals.length) {
                    $scope.realtime.push({name: $scope.digitalLabel, type: 'digital', sns: digitals});
                    $scope.secondOptions[$scope.realtimeLabel].push({name: $scope.digitalLabel, type: 'digital', sns: digitals});
                }
                $scope.isLoading = false;
                $scope.vars = data;

                getVarGroups(data);
            }, error: function () {
                $scope.isLoading = false;
            }
        });
    }

    function getVarGroups() {      // 将变量按模拟量、状态量进行分组，再将模拟量进行分类
        var varGroups={};
        ajax.get({
            url: '/devices/devicevars?with_group=true&device_sns=' + $scope.deviceSn,
            success: function (data) {
                data.forEach(function (n) {
                    if (!n.var_group_name) {
                        return;
                    }
                    var groupName = $myTranslate.instant(n.var_group_name);
                    if (varGroups[groupName]) {
                        varGroups[groupName].push(n);
                    } else {
                        varGroups[groupName] = [n];
                    }
                });
                for (var groupName in varGroups){
                    $scope.history.push({name: groupName, vars: varGroups[groupName], unit: varGroups[groupName][0].unit});
                    $scope.secondOptions[$scope.historyLabel].push({name: groupName, vars: varGroups[groupName], unit: varGroups[groupName][0].unit});
                }
                $scope.selectShowType($scope.realtimeLabel, true);
                $scope.$apply();
            }
        });

    }

    getDeviceVars();

}]);

app.controller('DeviceRemoteControlCtrl', ['$scope', '$stateParams', '$interval', 'routerService', 'platformService', 'ajax', function ($scope, $stateParams, $interval, routerService, platformService, ajax) {
    $scope.device_sn = $stateParams.deviceSn; // GetQueryString('device_sn');
    $scope.varList = [];
    $scope.confirmVisible = false;
    $scope.controlObj = null;
    $scope.isLoading = true;
    var refreshInterval = null;

    function getWriteVarList() {
        $scope.isLoading = true;
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/devices/' + $scope.device_sn + '/variables?rw=2,3',
            success: function (response) {
                $scope.isLoading = false;
                // 状态量在前，模拟量在后
                $scope.varList = [];
                response.data.forEach(function (v) {
                    if (v.type === 'Analog' || v.type === 'Digital') {
                        $scope.varList.push(v);
                    }
                });
                $scope.varList = $scope.varList.sort(function (v1, v2) {
                    if (v1.type === v2.type) {
                        return 0;
                    }
                    if (v1.type === 'Analog' && v2.type === 'Digital') {
                        return 1;
                    }
                    return -1;
                });
                // 修改状态量的0/1描述
                $scope.varList.forEach(function (v) {
                    if (v.type === 'Digital') {
                        v.one_meaning = v.one_meaning || 'ON';
                        v.zero_meaning = v.zero_meaning || 'OFF';
                    }

                });
                getRealTimeData();
                if (refreshInterval === null) {
                    refreshInterval = $interval(getRealTimeData, 4000);
                }
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $.notify.error('获取可控变量失败');
            }
        });
    }

    function getRealTimeData() {        // 获取变量的实时值
        var sns = [];
        $scope.varList.forEach(function (n) {
            sns.push(n.sn);
        });
        var url = "/devicevars/getrealtimevalues";
        ajax.get({
            url: url,
            data: {sns: sns.join(",")},
            success: function(data) {
                $scope.varList.forEach(function (v) {
                    var exist = false;
                    for (var i=0; i<data.length; i++) {
                        if (data[i].var.sn === v.sn) {
                            if (v.type === 'Digital') {
                                v.value = data[i].data > 0 ? '1' : '0';
                            } else {
                                v.value = (data[i].data === null ? '' : data[i].data) + (data[i].unit || '');
                            }
                            exist = true;
                            break;
                        }
                    }
                    if (!exist) {
                        v.value = null;
                    }
                });
                $scope.$apply();
            }
        });
    }

    $scope.onToggleSwitcher = function (v) {     // 变量开关
        if (v.value === '1') {
            v.value = '0';
        } else {
            v.value = '1';
        }
        var controlObj = {
            sn: v.sn,
            value: v.value,
            name: v.name,
            action: 'yaokong-act',
            type: 'Digital',
            actionName: v.value === '1' ? v.one_meaning : v.zero_meaning,
            one_meaning: v.one_meaning,
            zero_meaning: v.zero_meaning
        };
        showConfirmModal(controlObj);
    };

    $scope.onEditAnalog = function (v) {        // 遥设
        var controlObj = {
            sn: v.sn,
            name: v.name,
            action: 'yaoshe-act',
            type: 'Analog'
        };
        showConfirmModal(controlObj);
    };

    function showConfirmModal(controlObj) {
        routerService.openPage($scope, '/templates/site/device-monitor/remote-control-confirm-modal.html', {
            controlObj: controlObj
        }, {
            hidePrev: false
        });
    }

    $scope.$on('$destroy',function(){
        if (refreshInterval !== null) {
            $interval.cancel(refreshInterval);
        }
    });

    getWriteVarList();
}]);

app.controller('DeviceRemoteControlConfirmCtrl', ['$scope', 'ajax', '$myTranslate', function ($scope, ajax, $myTranslate) {
    $scope.okEnable = $scope.controlObj.type === 'Digital' ? true : false;
    $scope.inputError = '';
    $scope.error = '';
    $scope.isSubmitting = false;
    $scope.inputValid = true;
    var newValue = '';
    var pwd = '';
    $scope.analogDesp = "设置变量【" + $scope.controlObj.name + "】的值为：";
    $scope.digitalDesp = "将对变量【" + $scope.controlObj.name + "】进行以下操作：";
    if (gIsEnglish) {
        $scope.analogDesp = "It will set new value to [" + $scope.controlObj.name + "]:";
        $scope.digitalDesp = "It will set new value to [" + $scope.controlObj.name + "]:";
    }

    $scope.onCheck = function (value) {
        $scope.controlObj.value = value;
    };

    $scope.onInputValidate = function (value) {
        newValue = value;
        $scope.inputError = '';
    };

    $scope.onPwdChange = function (value) {
        pwd = value;
        $scope.error = '';
    };

    $scope.onCancel = function () {
        history.back();
    };

    function isNumber(val) {
        var regPos = /^\d+(\.\d+)?$/; //非负浮点数
        var regNeg = /^(-(([0-9]+\.[0-9]*[1-9][0-9]*)|([0-9]*[1-9][0-9]*\.[0-9]+)|([0-9]*[1-9][0-9]*)))$/; //负浮点数
        if(regPos.test(val) || regNeg.test(val)) {
            return true;
        } else {
            return false;
        }
    }

    $scope.confirm = function () {
        if (!pwd) {
            $scope.error = $myTranslate.instant('tip.pwd.required');
            return;
        }
        if ($scope.controlObj.type === 'Analog') {
            if (!newValue) {
                $scope.inputError = $myTranslate.instant('device.control.novalue');
                return;
            } else if (!isNumber(newValue)) {
                $scope.inputError = $myTranslate.instant('tip.number.validate');
                return;
            }
        }
        postControl();
    };

    function postControl() {
        var controlObj = $scope.controlObj;
        $scope.isSubmitting = true;
        ajax.post({
            url: '/varcontrol/action',
            data: {
                type: controlObj.action === 'yaokong-act' ? 1 : 2,
                variable_sn: controlObj.sn,
                variable_value: controlObj.type === 'Digital' ? controlObj.value : newValue,
                pwd: pwd
            },
            success: function (response) {
                if (response) {
                    if (response.code === 200) {
                        $.notify.info($myTranslate.instant('issued successful'));
                        $scope.onCancel();
                    } else if (response.code === 403) {
                        $scope.isSubmitting = false;
                        $scope.error = $myTranslate.instant('tip.pwd.error');
                        $scope.$apply();
                    } else {
                        $scope.isSubmitting = false;
                        $scope.error = $myTranslate.instant('issued failed');
                        $scope.$apply();
                    }
                } else {
                    $scope.isSubmitting = false;
                    $scope.error = $myTranslate.instant('issued failed');
                    $scope.$apply();
                }
            },
            error: function () {
                $scope.isSubmitting = false;
                $scope.error = $myTranslate.instant('issued failed');
                $scope.$apply();
            }
        })
    }
}]);

app.controller('VarRealtimeCtrl', ['$scope', 'ajax', '$myTranslate', function ($scope, ajax, $myTranslate) {

    var deviceSn=$scope.$parent.deviceSn;
    $scope.realtime = null;       // 实时数据
    $scope.realtimeType = '';
    $scope.realtimeValues = [];
    $scope.isLoading = true;
    var interval = null;

    $scope.$on('$onRealtimeTypeChanged', function (event, realtimeItem) {
        if (realtimeItem) {
            $scope.realtime = realtimeItem;
            $scope.realtimeType = realtimeItem.name;
            getRealTimeData();
            if (null === interval) {
                // interval = setInterval(getRealTimeData, 5000);
            }
        } else {
            $scope.isLoading = false;
        }
    });

    $scope.$on('$onHistoryVarChanged', function (event) {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    });

    function getRealTimeData() {        // 获取变量的实时值
        var type = $scope.realtimeType, sns=$scope.realtime.sns;
        if (!sns || !sns.length) {
            $scope.realtimeValues = [];
            return;
        }
        $scope.isLoading = true;
        var url = "/devicevars/getrealtimevalues";
        ajax.get({
            url: url,
            data: "sns=" + sns.join(","),
            success: function(data) {
                $scope.isLoading = false;
                if (type === $myTranslate.instant('var.digital')) {   // 状态量
                    data.forEach(function (n) {
                        var v = n.data;
                        var isnull = false;
                        if (v < 0) { // 值<0表示实际值为NULL，+2=上一次有效值
                            v += 2;
                            isnull = true;
                        }
                        if (n.data > 0) {
                            n.value = n.var.one_meaning ? n.var.one_meaning : 'ON';
                            n.status = 'danger';
                        } else {
                            n.value = n.var.zero_meaning ? n.var.zero_meaning : 'OFF';
                            n.status = 'normal';
                        }
                        if (isnull) {
                            n.value += " ?";
                        }
                    });
                }
                var dataMap = {};
                data.forEach(function (d) {
                    dataMap[d.var.sn] = d;
                });
                var sorted = [];
                sns.forEach(function (sn) {
                    sorted.push(dataMap[sn]);
                });
                $scope.realtimeValues = sorted;
                $scope.$apply();
            },
            error: function(err) {
                $.notify.error("获取设备变量实时值失败");
                $scope.isLoading = false;
                $scope.$apply();
                console.log(err);
            }
        });
    }
}]);

app.controller('HistoryVarCtrl', ['$scope', 'ajax', '$myTranslate', function ($scope, ajax, $myTranslate) {
    $scope.currentGroupName = '';
    $scope.currentGroup = null;
    $scope.history = [];
    $scope.timeRange = 'DAY';
    $scope.isLoading = false;

    $scope.$on('$onHistoryVarChanged', function (event, dataItem) {
        if (dataItem)
        {
            $scope.currentGroup = dataItem;
            getHistoryData(dataItem.vars);
        } else {
            $scope.currentGroup = null;
        }
    });

    $scope.switchTimeRange = function (timeRange) {
        $scope.timeRange = timeRange;
        getHistoryData($scope.currentGroup.vars);
    };

    function getHistoryData(vars) {
        $scope.isLoading = true;
        var sns = [];
        vars.forEach(function (n) {
            sns.push(n.sn);
        });
        ajax.get({
            url: '/devicevars/getstatisticalvalues',
            data: {
                sns: sns.join(','),
                type: $scope.timeRange,
                calcmethod: 'AVG'
            },
            success: function (data) {
                $scope.isLoading = false;
                $scope.$apply();
                drawChart(data);
            },
            error: function () {
                $.notify.error("获取历史趋势数据失败");
                $scope.isLoading = false;
                $scope.$apply();
            }
        });
    }

    function _generateDayHours() {  // 生成一天内的24个小时
        var hours = [];
        for (var i=0; i<24; i++){
            hours.push(((i<10) ? ('0' + i) : i) + ':00');
        }
        return hours;
    }

    function _generateMonthDays() { // 生成本月的天数据
        var date = new Date(),
            firstDay = new Date(date.getFullYear(), date.getMonth(), 1),
            lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0),
            month = firstDay.getMonth() + 1,
            days = [];
        month = month < 10 ? '0' + month : month;
        for (var i=firstDay.getDate(); i<=lastDay.getDate(); i++) {
            days.push(month + '-' +((i<10) ? ('0' + i) : i));
        }
        return days;
    }

    function drawChart(data) {
        var xAxis = [];
        // 如果返回的数据为空，那么自动生成时间轴
        if ($scope.timeRange === 'DAY')
        {
            xAxis = _generateDayHours();
        } else {
            xAxis = _generateMonthDays();
        }
        var currentGroup = $scope.currentGroup;
        // 对比data与currentGroup中的变量，如果data中没有返回的，补充上空值
        var series = [];
        currentGroup.vars.forEach(function (n) {
            var exist = false;
            for (var i=0; i<data.length; i++) {
                if (data[i].name === n.name) {
                    exist = true;
                    series.push({name: $myTranslate.instant(n.name), data: data[i].datas, symbolSize: 0, type: 'line'});
                    break;
                }
            }
            var tmpData = [];
            if (!exist) {
                xAxis.forEach(function (n) {
                    tmpData.push(null);
                });
                series.push({name: $myTranslate.instant(n.name), data: tmpData, symbolSize: 0, type: 'line'});
            }
        });
        var chartTitle = currentGroup.name + ' ' + $myTranslate.instant('trend') + (currentGroup.unit ? ('(' + currentGroup.unit + ')') : '');
        var option = {
            title: {
                // text: currentGroup.name + ($scope.timeRange==='DAY' ? '今日' : '本月') + '趋势图' + (currentGroup.unit ? ('(' + currentGroup.unit + ')') : ''),
                text: chartTitle,
                x: 'center',
                align: 'right',
                textStyle: {
                    fontSize: 14,
                    fontWeight: 'normal',
                }
            },
            grid: {
                top: 50,
                left: 40,
                right: 10,
                bottom: 25
            },
            tooltip: {
                trigger: 'axis',
                alwaysShowContent: false,
                confine: true,
                formatter: function (params) {
                    if (!params.length) {
                        return null;
                    }
                    var p0 = params[0];
                    var lines = [p0.axisValue];
                    params.forEach(function (p) {
                        lines.push('<br />');
                        lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data + ' ' + currentGroup.unit));
                    });
                    return lines.join('');
                }
            },
            xAxis: {
                type: 'category',
                data: xAxis,
                axisLabel: {
                    fontSize: 11,
                },
            },
            yAxis: {
                name: currentGroup.unit,
                nameGap: 0,
                nameTextStyle: {
                },
                type: 'value',
                axisLabel: {
                    fontSize: 11,
                },
            },
            series: series,
        };
        echarts.dispose(document.getElementById('chartContainer'));
        echarts.init(document.getElementById('chartContainer'), 'custom').setOption(option);
    }
}]);

app.directive('treeView',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/site/device-monitor/tree-view.html',
        scope: {
            treeData: '=',
            canChecked: '=',
            textField: '@',
            itemClicked: '&',
            itemCheckedChanged: '&',
            itemTemplateUrl: '@'
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
            $scope.itemExpended = function(item, $event){
                item.$$isExpend = ! item.$$isExpend;
                ($scope[itemClicked] || angular.noop)({
                    $item:item,
                    $event:$event
                });
                $event.stopPropagation();
            };
            $scope.isLeaf = function(item){
                return !item.is_group;
            };
            $scope.warpCallback = function(callback, item, $event){
                item.$$isExpend = !item.$$isExpend;
                ($scope[callback] || angular.noop)({
                    $item:item,
                    $event:$event
                });
            };
        }]
    };
}]);
