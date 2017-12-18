'use strict';

/**
 * Created by liucaiyun on 2017/8/26.
 */

app.controller('DeviceListCtrl', function ($scope, ajax, scrollerService) {
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
                for (var i in result){
                    result[i].status = 'normal';
                    result[i].status_name = '正常';
                }
                $scope.deviceList = result;
                $scope.deviceLoading = false;
                $scope.changeDeviceType(null, $scope.showType);
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
        location.href = '/templates/site/device-detail.html?stationSn=' + stationSn + '&deviceSn=' + deviceSn + '&deviceName=' + deviceName;
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
                scrollerService.initScroll("#devices", $scope.getDataList);
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

    $scope.getDataList();
});

app.controller('DeviceDetailCtrl', function ($scope, $rootScope, $stateParams, ajax) {
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
});

app.controller('DeviceAnalogVarCtrl', function ($scope, ajax, $interval) {        //模拟量

    var stationSn = GetQueryString('stationSn'), deviceSn=GetQueryString('deviceSn');
    var analogVars = [];
    $scope.analogValues=[];
    $scope.has_data = true;
    $scope.isLoading = true;
    $scope.getDeviceVar = function() {
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
});

app.controller('DeviceDigitalVarCtrl', function ($scope, ajax, $interval) {        //状态量

    var stationSn = GetQueryString('stationSn'), deviceSn=GetQueryString('deviceSn');
    var digitalVars=[];
    $scope.digitalValues=[];
    $scope.has_data = true;
    $scope.isLoading = true;
    $scope.getDeviceVar = function() {
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
    }

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
});

app.controller('DeviceInfoDetailCtrl', function ($scope, ajax) {
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
});