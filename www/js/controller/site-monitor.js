function getCurrentMonthLast(data) {
    var date = new Date(data);
    var currentMonth = date.getMonth();
    var nextMonth = ++currentMonth;
    var nextMonthFirstDay = new Date(date.getFullYear(), nextMonth, 1);
    var oneDay = 1000 * 60 * 60 * 24;
    return new Date(nextMonthFirstDay - 1);
}

var g_line_colors = ['#9474df','#ef7e9c', '#6bc1dd', '#13cf5a',  '#f3a15d', '#6c7fff', '#ca8622', '#bda29a','#6e7074', '#546570', '#c4ccd3'];
var g_pvf_colors_opacity = {
    'p': 'rgba(239, 150, 166, 0.18)',
    'v': 'rgba(138, 212, 199, 0.18)',
    'f': 'rgba(136, 169, 248, 0.18)',
    's': 'rgba(254,139,106, 0.18)',
};

var g_pvf_label_colors = {
    'p': 'rgba(239, 150, 166, 1)',
    'v': 'rgba(138, 212, 199, 1)',
    'f': 'rgba(136, 169, 248, 1)',
    's': 'rgba(254,139,106, 1)',
};

app.directive('historyTable', [function(){
    return {
        restrict: 'E',
        templateUrl: 'templates/site-monitor/history-table-template.html',
        replace: true,
        scope: {
            tableHeader: '=',
            tableBodyData: '=',
            hasGroup: '='
        },
        controller: ['$scope', '$attrs', function($scope, $attrs){
            // var pageData = routerService.getNextPage();
            // var params = pageData.params, config=pageData.config;
            // if (params){
            //     for (var key in params){
            //         $scope[key] = params[key];
            //     }
            // }
            // if (config.addHistory)
            // {
            //     routerService.addHistory($scope, $element);
            // }
            console.log('finish');
        }]
    };
}]);

app.directive('siteHistoryRepeatFinish',function(){
    return {
        link: function(scope,element,attr){
            if(scope.$last == true){
                setTimeout(function () {
                    $.fn.dataTable.ext.errMode = 'none'; //不显示任何错误信息
                    var height = screen.height - siteHistoryTableScrollHeight;
                    // 如果宽度小于屏幕宽度，则不设置fixedColumns
                    var $table = $('#siteHistoryTable');
                    var config = {
                        searching: false,
                        ordering: false,
                        scrollY:        height + 'px',
                        scrollX:        true,
                        scrollCollapse: true,
                        paging:         false,
                        info: false
                    };
                    var width = parseInt($table.css('width'));
                    if (width <= screen.width) {
                        $table.css('width', '100%');
                    } else {
                        config.fixedColumns = {
                            leftColumns: 1
                        };
                    }
                    var table = $table.DataTable(config);
                    scope.$parent.table = table;
                }, 100);
            }
        }
    }
});

// 历史曲线
app.controller('SiteHistoryTrendCtrl', function ($scope, ajax) {
    var stationSn = $scope.sn;    // GetQueryString("sn");
    var deviceChargeSettingF = null;    // 设备用电电价配置
    var deviceChargeSettingR = null;    // 设备发电电价配置
    var stationPfvSettingF = null; // 站点发电价配置
    var stationPfvSettingR = null; // 站点用电价配置
    $scope.timeTypeList = [{
        id: 'DAY',
        name: '按日'
    }, {
        id: 'MONTH',
        name: '按月'
    }, {
        id: 'YEAR',
        name: '按年'
    }];
    $scope.calcMethodList= [{
        id: 'MAX',
        name: '所有值'
    }];
    $scope.calcMethod = {id: 'MAX', name: '最大值'};
    $scope.timeType = {id: 'DAY', name: '按日'};
    $scope.trendGroups = [];
    $scope.picker = null;
    $scope.screenWidth = window.screen.width;
    var currentDay = moment().format('YYYY-MM-DDT00:00:00.000') + 'Z';
    refreshDateShowName();

    $scope.isLoading = true;
    $scope.getDataList = function() {
        getStationInfo(stationSn);
        initDatePicker();
    };

    $scope.onSelect = function (key, value, name) {
        if (key === 'timeType') {
            if (value === 'DAY') {
                $scope.calcMethodList = [{
                    id: 'MAX',
                    name: '所有值'
                }];
            } else {
                $scope.calcMethodList = [{
                    id: 'AVG',
                    name: '平均值'
                }, {
                    id: 'ACCU',
                    name: '累计值'
                }, {
                    id: 'MAX',
                    name: '最大值'
                }, {
                    id: 'MIN',
                    name: '最小值'
                }];
            }
            refreshDateShowName();
            $scope.calcMethod = $scope.calcMethodList[0];
            // 给body加上timeType
            var className = document.body.className;
            if (className.indexOf('timeType') < 0) {
                document.body.className = className + ' timeType-' + value + ' ';
            } else {
                var lastClassName = className.substring(className.indexOf('timeType'));
                document.body.className = className.replace(lastClassName, 'timeType-' + value + ' ');
            }

            // $scope.picker.dispose();
            // $scope.picker = null;
        }
        $scope[key] = {
            id: value,
            name: name
        };
        refreshData();
        refreshDateShowName();
    };

    function refreshDateShowName() {
        // 根据按日、按月、按年，显示当前时间的格式
        switch ($scope.timeType.id) {
            case 'DAY':
                $scope.dateName = currentDay.substring(0, 10);
                break;
            case 'MONTH':
                $scope.dateName = currentDay.substring(0, 7);
                break;
            case 'YEAR':
                $scope.dateName = currentDay.substring(0, 4);
        }
    }

    function initDatePicker() {

        document.getElementById('datePicker').addEventListener('tap', function() {
            var _self = $scope;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    currentDay = rs.text + 'T00:00:00.000Z';
                    refreshDateShowName();
                    setTimeout(function () {
                        refreshData();
                        $scope.$apply();
                    }, 50);
                });
            } else {
                var options = {type: 'date'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    currentDay = rs.text + 'T00:00:00.000Z';
                    refreshDateShowName();
                    setTimeout(function () {
                        refreshData();
                        $scope.$apply();
                    }, 50);
                });
            }
        }, false);
    }

    function getStationInfo(sn) {
        // 获取站点信息，主要是为了得到电价配置
        ajax.get({
            url: '/stations/' + sn + '/charge_config?chargeType=electricity',
            success: function (data) {
                if(data.pfv_settings_f && data.pfv_settings_f !== '') {
                    stationPfvSettingF = JSON.parse(data.pfv_settings_f);
                }
                if(data.pfv_settings_r && data.pfv_settings_r !== '') {
                    stationPfvSettingR = JSON.parse(data.pfv_settings_r);
                }
                if (data.device_settings) {
                    deviceChargeSettingF = JSON.parse(data.device_settings);
                }
                if (data.device_settings_r) {
                    deviceChargeSettingR = JSON.parse(data.device_settings_r);
                }
                getTrendGroupOfSite(sn);
            }
        });
    }

    function getChartDiv(groupId) {
        return document.getElementById('chart' + groupId);
    }

    function getTrendGroupOfSite(sn) {
        $scope.isLoading = true;
        ajax.get({
            url: '/stations/' + sn + '/trendgroups',
            success: function (response) {
                $scope.isLoading = false;
                $scope.trendGroups = response;
                refreshData();
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
            }
        })
    }

    function refreshData() {
        $scope.trendGroups.forEach(function (group) {
            group.isLoading = true;
            var echartDiv = getChartDiv(group.id);
            if (echartDiv) {
                echarts.init(echartDiv).setOption({});
            }
            getDataInfoOfGroup(group.id);
        });
    }

    function getDataInfoOfGroup(groupId) {
        function _setLoadFinish(groupId) {
            for (var i=0; i<$scope.trendGroups.length; i++) {
                if ($scope.trendGroups[i].id === groupId) {
                    $scope.trendGroups[i].isLoading = false;
                    break;
                }
            }
        }

        ajax.get({
            url: '/trendgroups/' + groupId + '/datainfo?type=' + $scope.timeType.id + '&calcmethod=' + $scope.calcMethod.id + '&starttime=' + currentDay,
            success: function (data) {
                _setLoadFinish(groupId);
                $scope.$apply();
                showChart(groupId, data, $scope.timeType.id, currentDay, $scope.calcMethod.id);
            },
            error: function () {
                _setLoadFinish(groupId);
                $scope.$apply();
            }
        });
    }

    function createChartSeriesForGroup(groupId, data, chartOption) {
        // 从datainfo返回的数据创建曲线的series
        var arr = [];
        var namearr = [];
        var showPfvSettingsF = false;
        var yAxis = [
            {
                type: 'value',
                nameTextStyle: {
                    color: '#999999'
                },
                "axisLine": {
                    lineStyle: {
                        color: '#e7ecf1'
                    }
                },
                axisLabel: {
                    textStyle: {
                        color: '#999999'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: ['#e7ecf1']
                    }
                },
                axisTick: {
                    "show": false
                },
                scale: false
            },
            {
                "axisLine": {
                    lineStyle: {
                        color: '#e7ecf1'
                    }
                },
            }
        ];
        var group = $scope.trendGroups.find(function (item) {
            return item.id === groupId;
        }); // 配置信息
        if (group && group.extend_js) {
            var extendJs = JSON.parse(group.extend_js);
            if (extendJs.yAxisScale) {
                yAxis[0].scale = true;
            }
        }
        var groupVars = group ? group.device_vars : [];
        var pfvSetting = null;
        for (var l = 0; l < data.data.length; l++) {
            var item = data.data[l];
            if(!item.unit) {
                item.unit = '';
            }
            var mhharr = [];
            for (var h = 0; h < item.time_keys.length; h++) {
                var myarr = [];
                var nian = item.time_keys[h].slice(0, 4);
                var yue = item.time_keys[h].slice(5, 7) - 1;
                var ri = item.time_keys[h].slice(8, 10);
                var shi = item.time_keys[h].slice(11, 13);
                var fen = item.time_keys[h].slice(14, 16);
                var miao = item.time_keys[h].slice(17, 19);
                myarr[0] = new Date(nian, yue, ri, shi, fen, miao);
                myarr[1] = item.datas[h];
                mhharr.push(myarr)
            }
            var name = item.name;
            var setting = groupVars.find(function (v) {
                return v.sn === item.var.sn;
            });
            if (setting && setting.label1_value) {
                name = setting.label1_value;
            }
            if (item.unit) {
                name += "(" + item.unit + ")";
            }
            var s = {
                name: name,
                type: 'line',
                symbolSize: 2,
                symbol: 'circle',
                yAxisIndex: 0,
                data: mhharr,
                color: setting.label2_value || null
            };
            if (setting && setting.label2_value) {
                s.color = setting.label2_value;
            }
            arr.push(s);
            namearr.push(name);
            if (!pfvSetting) {
                pfvSetting = getPfvSetting(item.var);
            }
        }

        //增加电价信息
        if(pfvSetting && data.type === "day") {
            if(data.data.length > 0 && data.data[0].time_keys.length) {
                ri = data.data[0].time_keys[0].slice(8, 10); //针对最后一个点 为第二天0点 的特殊处理
            }
            yAxis[1]={
                "axisLine": {
                    lineStyle: {
                        color: '#e7ecf1'
                    }
                },
                axisLabel: {
                    textStyle: {
                        color: '#999999'
                    }
                },
                splitLine: {
                    show: false,
                },
                type: 'value'
            };
            var dateTime = item.time_keys[0];
            createPfvSettingMark(pfvSetting, dateTime, arr);
        }
        $.extend(chartOption, {
            yAxis: yAxis,
            series: arr,
        });
        chartOption.legend.data = namearr;
    }

    function _getPfvOfDevice(varInfo, pfvSetting, deviceSetting) {
        if (!pfvSetting || !pfvSetting.length) {
            return null;
        }
        if (deviceSetting) { // 获取设备对应的用电电价设置。 如果设备没有配置，则返回第一个电价设置
            for (var i=0; i<deviceSetting.length; i++) {
                if (varInfo.device_sn === deviceSetting[i].device_sn) {
                    var label = deviceSetting[i].label;
                    for (var j=0; j<pfvSetting.length; j++) {
                        if (pfvSetting[j].label === label) {
                            return pfvSetting[j].pfv;
                        }
                    }
                }
            }
        }
        return pfvSetting[0].pfv;
    }

    function getPfvSetting(varInfo) { // 获取变量对应的电价设置，如果不是有功电度或电价未配置，则返回null
        if (varInfo.var_code === 'EPr') { // 反向有功功率，使用发电
            return _getPfvOfDevice(varInfo, stationPfvSettingR, deviceChargeSettingR);
        } else if (varInfo.unit.toLowerCase().indexOf('kw') === 0 || varInfo.unit.toLowerCase().indexOf('mw') === 0 ||
            varInfo.var_code === 'EPf') { // 有功电度或以kw/mw为单位的变量
            return _getPfvOfDevice(varInfo, stationPfvSettingF, deviceChargeSettingF);
        }
        return null;
    }

    function createPfvSettingMark(pfvSetting, dateTime, series) {
        if (!pfvSetting) {
            return;
        }
        var nian = Number.parseInt(dateTime.slice(0, 4));
        var yue = Number.parseInt(dateTime.slice(5, 7)) - 1;
        var ri = Number.parseInt(dateTime.slice(8, 10));
        for(var i=0; i<pfvSetting.length; i++){
            var markAreaData = [];
            var chargeData = [];
            var pfvItem = pfvSetting[i];
            var tempPfv = pfvItem.pfv;
            var tempCharge = pfvItem.charge;
            var tempName = '';
            var tempColor = 'gray';
            var tempLabelColor = 'gray';
            if(tempPfv === 'p') {
                tempName = '峰';
                tempColor = g_pvf_colors_opacity.p;
                tempLabelColor = g_pvf_label_colors.p;
            } else if(tempPfv === 'f') {
                tempName = '平';
                tempColor = g_pvf_colors_opacity.f;
                tempLabelColor = g_pvf_label_colors.f;
            } else if(tempPfv === 'v') {
                tempName = '谷';
                tempColor = g_pvf_colors_opacity.v;
                tempLabelColor = g_pvf_label_colors.v;
            } else if(tempPfv === 's') {
                tempName = '尖';
                tempColor = g_pvf_colors_opacity.s;
                tempLabelColor = g_pvf_label_colors.s;
            }
            var now = new Date();
            var startDate = new Date(nian, yue, ri,
                parseInt(pfvItem.starttime.substr(0,2)), parseInt(pfvItem.starttime.substr(3,5)), 10);
            var endDate = new Date(nian, yue, ri,
                parseInt(pfvItem.endtime.substr(0,2)), parseInt(pfvItem.endtime.substr(3,5)), 10);
            var tempAreaData = [{
                name: tempName+'\n'+pfvItem.charge+'元',
                xAxis: startDate,
                yAxis: 0
            }, {
                xAxis: endDate,
                yAxis: pfvItem.charge,
            }];

            chargeData.push([endDate, pfvItem.charge]);
            markAreaData.push(tempAreaData);

            var newDate = {
                name: i,
                yAxisIndex: 1,
                type:'line',
                symbolSize: 0,
                tooltip: {
                    show: false,
                },
                itemStyle: {
                    normal: {
                        color: tempLabelColor,
                        lineStyle: {
                            width: 0,
                        },
                    }
                },
                data: chargeData,
                markArea: {
                    data: markAreaData,
                    itemStyle: {
                        normal: {
                            color: tempColor,
                        }
                    }
                }
            };

            series.push(newDate);
        }
    }

    function showChart(groupId, data, timety, dataday, calcMethod) { //依据时间段展示
        /**
         * @param timety: 'DAY', 'MONTH', 'YEAR'
         * @param dataday: 显示日期
         * @param calcMethod: 'AVG', 'MAX', 'MIN', 'ACCU'
         */
        var nian = dataday.slice(0, 4);
        var yue = dataday.slice(5, 7) - 1;
        var ri = dataday.slice(8, 10);
        var mintime = "";
        var maxtime = "";
        var xname = "";
        var xlm = "";
        var xType = "time";
        if (timety === "DAY") {
            mintime = new Date(nian, yue, ri, 00, 00, 00);
            maxtime = new Date(nian, yue, ri, 24, 00, 00);
        }
        if (timety === "MONTH") {
            mintime = new Date(nian, yue, 01, 00, 00, 00);
            maxtime = getCurrentMonthLast(dataday.slice(0, 10));
        }
        if (timety === "YEAR") {
            mintime = new Date(nian, 00, 01, 00, 00, 00);
            maxtime = new Date(nian, 11, 11, 00, 00, 00);
        }
        var echartsDiv = $('#chart' + groupId);
        if (echartsDiv.length) {
            echarts.dispose(echartsDiv[0]);
        }
        var echartsObj = echarts.init(getChartDiv(groupId));
        var that = "";
        var option = {
            color: g_line_colors,
            grid: {
                left: 55,
                right: 30,
                top: 20,
                bottom: 50
            },
            tooltip: {
                trigger: 'axis',
                confine: true
            },
            legend: {
                type: 'scroll',
                top: 'bottom',
                pageIconSize: 10,
                itemWidth: 15,
                itemHeight: 8,
                textStyle: {
                    color: '#848484',
                    fontSize: 11,
                },
            },
            xAxis: {
                type: xType,
                splitNumber: 6,
                min: mintime,
                max: maxtime,
                nameTextStyle: {
                    color: '#999999'
                },
                boundaryGap: false,
                splitLine: {
                    show: false
                },
                "axisLine": {
                    lineStyle: {
                        color: '#e7ecf1'
                    }
                },
                axisLabel: {
                    textStyle: {
                        color: '#999999'
                    },
                    formatter: function(value, index) {

                        var date = new Date(value);
                        var texts = [];
                        if (timety === "DAY") {
                            texts = [date.getHours(), "00"];
                            return texts.join(':');
                        }
                        if (timety === "MONTH") {
                            texts = [(date.getMonth() + 1), date.getDate()];
                            return texts.join('-');
                        }
                        if (timety === "YEAR") {
                            var temp = date.getMonth() + 1;
                            if(temp === 1) {
                                return date.getFullYear() + "-1";
                            }else {
                                return temp;
                            }
                        }
                    }
                }
            },
            yAxis: {},
            series: []
        };
        createChartSeriesForGroup(groupId, data, option);
        echartsObj.setOption(option);
    }
    $scope.$on('$destroy', function (event) {

        // 页面返回时去除body上的timeType类
        var className = document.body.className;
        var startIndex = className.indexOf('timeType');
        if (startIndex >= 0) {
            var lastClassName = className.substring(startIndex);
            document.body.className = className.replace(lastClassName, ' ');
        }
        if ($scope.picker) {
            $scope.picker.dispose();
            $scope.picker = null;
        }
        $.notify.progressStop();
    });

    setTimeout($scope.getDataList, 500);

    var groupWrapper = $("#group_charts");
    var lastScrollTop = -20;
    function startScrollListen() {
        groupWrapper.get(0).addEventListener('scroll', function () {
            refreshChartsVisibleStatus();
        });
    }

    function refreshChartsVisibleStatus() {
        var scrollTop = groupWrapper.scrollTop();
        if (Math.abs(scrollTop - lastScrollTop) < 20) {
            return;
        }
        var charts = groupWrapper.find('.chart');
        // 6个及以下图表不需要进行显示状态切换，默认一直显示
        if (charts.length <= 6) {
            return;
        }
        lastScrollTop = scrollTop;
        var screenHeight = window.screen.height;
        // 计算应该显示的图表的第一个和最后一个的索引
        var startIndex = Math.floor(scrollTop/245);
        var endIndex = Math.ceil((scrollTop+screenHeight)/245);
        $.each(charts, function (i) {

            if (i < startIndex) {
                $(this).hide();
            } else if (i > endIndex) {
                $(this).hide();
            } else {
                $(this).show();
            }
        })
        // // 每一个图表所占高度为245
        // console.log(scrollTop);
    }

    function stopScrollListen() {
        groupWrapper.off('touchstart');
        groupWrapper.off('touchmove');
        groupWrapper.off('touchend');
    }
    startScrollListen();

    $scope.$on('$destroy', function (event) {
        stopScrollListen();
    })
});

// 历史报表
var siteHistoryTableScrollHeight = 174;
app.controller('SiteHistoryReportCtrl', function ($scope, $compile, ajax) {

    var stationSn = $scope.sn;  //GetQueryString("sn");
    $scope.timeTypeList = [{
        id: 'DAY',
        name: '日报'
    }, {
        id: 'MONTH',
        name: '月报'
    }, {
        id: 'YEAR',
        name: '年报'
    }];
    $scope.calcMethodList = [{
        id: 'MAX',
        name: '瞬时值'
    }];
    var currentDay = moment().format('YYYY-MM-DDTHH:mm:ss.000') + 'Z';
    $scope.calcMethod = $scope.calcMethodList[0];
    $scope.timeType = {id: 'DAY', name: '日报'};
    $scope.reportGroups = [];
    $scope.currentReport = null;
    $scope.reportDataInfo = [];
    $scope.reportSetting = {};
    $scope.isLoading = false;
    $scope.hasGroup = false;
    $scope.dataRefreshing = false;
    var reportPicker = null;
    refreshDateShowName();
    var taskTypePicker = null;

    $scope.getDataList = function() {
        getReports(stationSn);
        initDatePicker();
    };

    function initDatePicker() {

        document.getElementById('datePicker').addEventListener('tap', function() {
            var _self = $scope;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    currentDay = rs.text + 'T00:00:00.000Z';
                    refreshDateShowName();
                    getDataInfoOfReport();
                    $scope.$apply();
                });
            } else {
                var options = {type: 'date'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    currentDay = rs.text + 'T00:00:00.000Z';
                    refreshDateShowName();
                    // _self.picker.dispose();
                    // _self.picker = null;
                    getDataInfoOfReport();
                    $scope.$apply();
                });
            }
        }, false);
    }

    function refreshDateShowName() {
        // 根据按日、按月、按年，显示当前时间的格式
        var timeType = $scope.timeType.id;
        switch (timeType) {
            case 'DAY':
                $scope.dateName = currentDay.substring(0, 10);
                break;
            case 'MONTH':
                $scope.dateName = currentDay.substring(0, 7);
                break;
            case 'YEAR':
                $scope.dateName = currentDay.substring(0, 4);
        }
        // 给body加上timeType
        var className = document.body.className;
        if (className.indexOf('timeType') < 0) {
            document.body.className = className + ' timeType-' + timeType + ' ';
        } else {
            var lastClassName = className.substring(className.indexOf('timeType'));
            document.body.className = className.replace(lastClassName, 'timeType-' + timeType + ' ');
        }
    }

    function getReports(sn) {
        // 获取站点信息，主要是为了得到电价配置
        $scope.isLoading = true;
        ajax.get({
            url: '/stations/' + sn + '/reportgroups',
            success: function (data) {
                $scope.isLoading = false;
                $scope.reportGroups = data;
                if (data.length) {
                    var report = data[0];

                    // 初始化报告选择器
                    var pickerData = [];
                    data.forEach(function (item) {
                        pickerData.push({
                            value: item.id,
                            text: item.name
                        })
                    });
                    reportPicker = new mui.PopPicker();
                    reportPicker.setData(pickerData);
                    var reportPickerBtn = document.getElementById('reportPicker');
                    reportPickerBtn.addEventListener('click', function(event) {
                        reportPicker.show(function(items) {
                            if (items[0].value !== $scope.currentReport.id) {
                                for (var i=0; i<data.length; i++) {
                                    if (data[i].id === items[0].value) {
                                        onSelectReport(data[i]);
                                        break;
                                    }
                                }
                                $scope.$apply();
                            }
                        });
                    }, false);
                    // 默认选择第一个报告
                    onSelectReport(report);
                }
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $.notify.error('获取数据失败');
            }
        });
    }

    function onSelectReport(report) {
        clearTable();
        var reportName = report.name;
        if (reportName.indexOf('月') >= 0) {
            // 名字中含有"月"，默认显示月报表
            $scope.timeType = {
                id: 'MONTH',
                name: '月报'
            };
            $scope.calcMethodList = [{
                id: 'MAX',
                name: '最大值'
            }, {
                id: 'AVG',
                name: '平均值'
            }];
            $scope.calcMethod = $scope.calcMethodList[0];
            refreshDateShowName();
        } else if (reportName.indexOf('日') >= 0){
            // 默认显示日报表
            $scope.timeType = {
                id: 'DAY',
                name: '日报'
            };
            $scope.calcMethodList = [{
                id: 'MAX',
                name: '瞬时值'
            }];
            $scope.calcMethod = $scope.calcMethodList[0];
            refreshDateShowName();
        }
        if (reportName.indexOf('度') >=0 || reportName.indexOf('用量') >=0 || reportName.indexOf('流量') >= 0) {
            if ($scope.timeType.id !== 'DAY') {     // 只有月报、年报才有最大值
                $scope.calcMethod = {
                    id: 'MAX',
                    name: '最大值'
                };
            }
        }
        $scope.currentReport = report;
        $scope.reportSetting = JSON.parse(report.extend_js);
        getDataInfoOfReport();
        $scope.$apply();
    }

    $scope.onSelect = function (key, value, name) {
        if (key === 'timeType') {
            if (value === 'DAY') {
                $scope.calcMethodList = [{
                    id: 'MAX',
                    name: '瞬时值'
                }];
                $scope.calcMethod = $scope.calcMethodList[0];
            } else {
                $scope.calcMethodList = [{
                    id: 'MAX',
                    name: '最大值'
                }, {
                    id: 'AVG',
                    name: '平均值'
                }];
                // 如果上一次也是选最大或平均值，则保持不变
                if ($scope.calcMethod.name !== '最大值' && $scope.calcMethod.name !== '平均值') {
                    $scope.calcMethod = $scope.calcMethodList[0];
                }
                $scope.tableBodyData = [];
                clearTable();
            }
            $scope.calcMethod = $scope.calcMethodList[0];
        }
        $scope[key] = {
            id: value,
            name: name
        };
        getDataInfoOfReport();
        refreshDateShowName();
    };

    function getDataInfoOfReport() {
        if (!$scope.currentReport) {
            return;
        }
        if ($scope.timeType.id === 'DAY') {
            getDataInfoOfDayReport();
            return;
        }
        $scope.dataRefreshing = true;
        clearTable();
        ajax.get({
            url: '/reportgroups/' + $scope.currentReport.id + '/datainfo',
            data: {
                type: $scope.timeType.id,
                calcmethod: $scope.calcMethod.id,
                querytime: currentDay
            },
            success: function (response) {
                // 根据reportSetting看是否需要对数据进行统计
                // 调用接口补充数据中的空时间点
                response.data.forEach(function (data) {
                    var startTime, endTime, queryPeriod;
                    switch ($scope.timeType.id) {
                        case 'YEAR':
                            startTime = currentDay.substring(0, 4) + '-01-01 00:00:00.000';
                            endTime = currentDay.substring(0, 4) + '-12-01 00:00:00.000';
                            queryPeriod = 'MONTH';
                            break;
                        case 'MONTH':
                            startTime = currentDay.substring(0, 7) + '-01 00:00:00.000';
                            var startMoment = moment(startTime);
                            startMoment.add(1, 'M').subtract(1, 'd');
                            endTime = startMoment.format().substring(0, 10) + ' 00:00:00.000';
                            queryPeriod = 'DAY';
                            break;
                        case 'DAY':
                            startTime = currentDay.substring(0, 10) + ' 01:00:00.000';     // 从1点开始，到第二天0点结束
                            var startMoment = moment(startTime);
                            startMoment.add(1, 'd');
                            endTime = startMoment.format().substring(0, 10) + ' 00:00:00.000';
                            queryPeriod = 'HOUR';
                            break;
                    }
                    var result = fillTrendDataVacancy(startTime, endTime, queryPeriod, data.time_keys, data.datas);
                    data.time_keys = result.time_keys;
                    data.datas = result.datas;
                });
                calcDataBySetting($scope.reportSetting, response.data);
                refreshTable();
                $scope.dataRefreshing = false;
                $scope.$apply();
            },
            error: function () {
                $scope.dataRefreshing = false;
                $scope.$apply();
            }
        })
    }

    function getDataInfoOfDayReport() {
        if (!$scope.currentReport) {
            return;
        }
        $scope.dataRefreshing = true;
        // 适配报表起始时间不为00:00的问题
        var nextDay = null;
        var configStartTime = $scope.reportSetting.startTime.substring(0, 2);
        if (configStartTime !== '00' && configStartTime !== '01') {       // 跨天
            var startMoment = moment(currentDay);
            startMoment.add(1, 'd');
            nextDay = moment(startMoment).format('YYYY-MM-DD') + 'T00:00:00.000Z';
        }
        var currentDayData = null, nextDayData = null;
        ajax.get({
            url: '/reportgroups/' + $scope.currentReport.id + '/datainfo',
            data: {
                type: $scope.timeType.id,
                calcmethod: $scope.calcMethod.id,
                querytime: currentDay
            },
            success: function (response) {
                currentDayData = response;
                if (!nextDay || nextDayData) {
                    formatDayData();
                }
            },
            error: function () {
                $scope.dataRefreshing = false;
            }
        });
        if (nextDay) {
            ajax.get({
                url: '/reportgroups/' + $scope.currentReport.id + '/datainfo',
                data: {
                    type: $scope.timeType.id,
                    calcmethod: $scope.calcMethod.id,
                    querytime: nextDay
                },
                success: function (response) {
                    nextDayData = response;
                    if (currentDayData) {
                        formatDayData();
                    }
                },
                error: function () {
                    $scope.dataRefreshing = false;
                }
            });
        }

        function formatDayData() {
            // var configStartTime = $scope.reportSetting.startTime;
            var startTime = currentDay.substring(0, 10) + " " + configStartTime + ':00:00.000';
            var endTime = moment(startTime).add(23, 'h').format('YYYY-MM-DD HH:mm:ss') + '.000Z';
            var times = createTimeList(startTime, endTime, 'HOUR', 'YYYY-MM-DD HH:mm:ss.000');
            // 从startTime开始去数据
            var offset = parseInt(configStartTime.substring(0, 2)) - 1;     // 起始时间的位移
            currentDayData.data.forEach(function (varData) {
                var datas = [];
                for (var i=offset; i<24; i++) {
                    datas.push(varData.datas[i]);       // 从当日取一部分，再从次日取一部分
                }
                if (nextDayData) {
                    for (var j=0; j<nextDayData.data.length; j++) {
                        var nextDayVarData = nextDayData.data[j];
                        if (nextDayVarData.var.id === varData.var.id) {
                            for (var i=0; i<offset; i++) {
                                datas.push(nextDayVarData.datas[i]);
                            }
                            break;
                        }
                    }
                }
                varData.datas = datas;
                varData.time_keys = times;
            });
            calcDataBySetting($scope.reportSetting, currentDayData.data);
            refreshTable();
            $scope.dataRefreshing = false;
        }
    }

    function clearTable() {
        // try {
        //     var table = $("#siteHistoryTable").DataTable();
        //     if (table) {
        //         table.destroy(true);
        //     }
        // } catch (err) {}
        // $("#tableParent").empty();
    }

    function refreshTable() {
        $("#tableParent").empty();
        var html = "<history-table table-header='tableHeader' table-body-data='tableBodyData' has-group='hasGroup'></history-table>";
        var compileFn = $compile(html);
        var $dom = compileFn($scope);
        // 添加到文档中
        $dom.appendTo($('#tableParent'));
    }

    function strlen(str){       // 获取字符串占位符，中文两位，英文一位
        var len = 0;
        for (var i=0; i<str.length; i++) {
            var c = str.charCodeAt(i);
            //单字节加1
            if ((c >= 0x0001 && c <= 0x007e) || (0xff60<=c && c<=0xff9f)) {
                len++;
            }
            else {
                len+=2;
            }
        }
        return len;
    }

    function _formatVarName(name, unit, maxLine) {      // 将变量名和单位进行合理的分行
        if (strlen(name) > 10) {
            var tmpName = name + (unit ? ('(' + unit+ ')') : '');
            var totalLen = strlen(tmpName);
            var lineCount = Math.ceil(totalLen / 10);      // 计算一共有几行
            var lineCharCount = Math.ceil(totalLen/maxLine);
            var lines=[], len=0, lastIndex=0;
            for (var i=0; i<tmpName.length; i++) {
                var currentLen = strlen(tmpName[i]);
                if ((len + currentLen) >= lineCharCount) {
                    lines.push(tmpName.substring(lastIndex, i+1));
                    len = 0;
                    lastIndex = i+1;
                } else {
                    len += currentLen;
                }
            }
            if (lastIndex < tmpName.length -1) {
                lines.push(tmpName.substring(lastIndex));
            }
            return lines.join('<br>');
        } else {
            return name + (unit ? ('<br>(' + unit+ ')') : '');
        }
    }

    function calcDataBySetting(setting, dataInfo) {
        if (!dataInfo || !dataInfo.length) {
            $scope.tableHeader = [];
            $scope.tableBodyData = [];
            return;
        }
        // 先按timeType简化显示时间
        var timeKeys = [];
        var timeType = $scope.timeType.id;
        dataInfo[0].time_keys.forEach(function (t) {
            if (timeType === 'DAY') {
                var hour = t.slice(11, 13);
                if (hour === '00') {
                    timeKeys.push('24时');
                } else if (t.substring(8, 10) > currentDay.substring(8, 10)) {
                    timeKeys.push('次日' + t.slice(11, 13) + '时');
                } else {
                    timeKeys.push(t.slice(11, 13) + '时');
                }
            } else if (timeType === 'MONTH') {
                timeKeys.push(parseInt(t.slice(8, 10)) + '日');
            } else if (timeType === 'YEAR') {
                timeKeys.push(parseInt(t.slice(5, 7)) + '月');
            }
        });
        // 根据配置统计数据，只有按日统计时需要
        // if (!setting) {
        //     return;
        // }
        var tableHeader = [];       // 表头
        var dataList = [];      // 取出所有数据
        var maxLine = 1;
        // 对名字进行处理，有别名的显示别名，如果别名中有斜杠的，那么将第一层斜杠作为分组处理
        var hasGroup = false;
        dataInfo.forEach(function (data) {
            var nameOrigin = data.var.label1_value || data.name;
            var index = nameOrigin.indexOf('/');
            if (index >= 0) {
                data.name = nameOrigin.substring(index + 1);
                data.group_name = nameOrigin.substring(0, index);
                hasGroup = true;
            } else {
                data.name = nameOrigin;
                data.group_name = null;
            }
        });
        // 取所有名称的最大行数
        dataInfo.forEach(function (data) {
            var lines = 0;
            if (strlen(data.name) < 10) {
                lines = data.unit ? 2 : 1;
            } else {
                var name = data.name + (data.unit ? ('(' + data.unit+ ')') : '');
                lines = Math.ceil(strlen(name) / 10);      // 计算一共有几行
            }
            if (lines > maxLine) {
                maxLine = lines;
            }
        });
        // 如果存在group_name，那么增加分组表头
        $scope.hasGroup = hasGroup;
        if (hasGroup) {
            // 将dataInfo按group_name进行排序
            var groupNameMapList = {};
            var groupNames = [];
            dataInfo.forEach(function (data) {
                var groupName = data.group_name;
                if (groupNameMapList[groupName] === undefined) {
                    groupNameMapList[groupName] = [data];
                } else {
                    groupNameMapList[groupName].push(data);
                }
                if (groupNames.indexOf(groupName) < 0) {
                    groupNames.push(groupName);
                }
            });
            // 按groupNames进行排序
            var headerRow1 = [{
                name: '时间',
                rowSpan: 2
            }];
            var sorted = [];
            groupNames.forEach(function (groupName) {
                groupNameMapList[groupName].forEach(function (d) {
                    sorted.push(d);
                });
                if (groupName === null) {
                    groupNameMapList[groupName].forEach(function (d) {
                        headerRow1.push({
                            name: _formatVarName(d.name, d.unit, maxLine),
                            rowSpan: 2
                        });
                    });
                } else {
                    headerRow1.push({
                        name: groupName,
                        colSpan: groupNameMapList[groupName].length
                    });
                }
            });
            dataInfo = sorted;
            tableHeader.push(headerRow1);
        }
        // 每个名称都按最大行数显示
        var tableVarHeader = [];
        dataInfo.forEach(function (data) {
            var name = data.name + (data.unit ? ('(' + data.unit+ ')') : '');
            if (hasGroup && data.group_name === null) {
                // 如果是带分组的数据，且某一项的分组名为空，则该变量名称已经在之前加入到头部过，这里不需要重复加入
                dataList.push(data.datas);
                return;
            }
            tableVarHeader.push({
                name: _formatVarName(data.name, data.unit, maxLine)
            });
            dataList.push(data.datas);
        });
        if (hasGroup) {
            tableHeader[1] = tableVarHeader;
        } else {
            tableVarHeader.unshift({
                name: '时间'
            });
            tableHeader.push(tableVarHeader);
        }
        siteHistoryTableScrollHeight = 126 + 24 * maxLine;
        if (hasGroup) {
            siteHistoryTableScrollHeight += 30;
        }
        var tableColumnHeader = [];     // 表的固定列，为二元数组
        for (var i=0; i<timeKeys.length; i++) {
            tableColumnHeader.push([{name: timeKeys[i]}]);
        }

        var tableBodyData = [];
        // if (timeType === 'DAY' && setting.timeSlots && setting.timeSlots.length) {
        if (false) {        // 先注释掉时间段的显示
            // 如果配置了时间段，那么会增加一列
            $scope.hasTimeSlot = true;
            if (hasGroup) {
                tableHeader[0].unshift({name: '分段', rowSpan: 2});
            } else {
                tableHeader[0].unshift({name: '分段'});
            }
            // 如果时段中出现跨天，那么分为两个时段
            setting.timeSlots.forEach(function (timeSlot) {
                if (timeSlot.endTime < timeSlot.startTime) {
                    var tmpTime = '24:00';
                    var endTime = timeSlot.endTime;

                    var newTimeSlot = $.extend({}, timeSlot, {startTime: '00:00'});
                    setting.timeSlots.push(newTimeSlot);
                    timeSlot.endTime = tmpTime;
                }
            });
            for (var i=0; i<timeKeys.length; i++) {
                var time = parseInt(timeKeys[i].slice(0, 2)) - 1;
                var exist = false;
                for (var j=0; j<setting.timeSlots.length; j++) {
                    var timeSlot = setting.timeSlots[j];
                    if (parseInt(timeSlot.startTime.slice(0, 2)) === time) {
                        var span = parseInt(timeSlot.endTime.slice(0,2)) - parseInt(timeSlot.startTime.slice(0, 2));    // 时间段跨度
                        tableBodyData.push([
                            {
                                value: timeSlot.name,
                                rowSpan: span,
                                backgroundColor: timeSlot.backgroundColor
                            }, {
                                value: timeKeys[i]
                            }
                        ]);
                        // 其他行只有时间
                        for (var k=i+1; k<i+span; k++) {
                            tableBodyData.push([{
                                value: timeKeys[k]
                            }]);
                        }

                        // 对数据进行累计计算
                        setting.calcMethods.forEach(function (method) {
                            var start = tableBodyData.length - 1;
                            var newLine = statistic(dataList, tableBodyData.length-span, tableBodyData.length-1, method);
                            var name = '';
                            switch (method) {
                                case 'sum':
                                    name = '累计值';
                                    break;
                                case 'max':
                                    name = '最大值';
                                    break;
                                case 'min':
                                    name = '最小值';
                                    break;
                                case 'avg':
                                    name = '平均值';
                                    break;
                            }
                            // 将统计数据加入到对应行
                            dataList.forEach(function (item, n) {
                                item.splice(tableBodyData.length, 0, newLine[n])
                            });
                            tableBodyData.push([{
                                value: name,
                                colSpan: 2
                            }])
                        });
                        i += (span-1);
                        exist = true;
                        break;
                    }
                }
                if (!exist) {
                    // 如果没有分段，则直接加入时间
                    tableBodyData.push([
                        {
                            value: timeKeys[i]
                        }
                    ]);
                }
            }
        } else {
            $scope.hasTimeSlot = false;
            timeKeys.forEach(function (time) {
                tableBodyData.push([
                    {
                        value: time
                    }
                ]);
            });
        }
        // 将dataList加入到表格数据中
        for (var i=0; i<tableBodyData.length; i++) {
            for (var j=0; j<dataList.length; j++) {
                tableBodyData[i].push({value: dataList[j][i] === null ? '-' : dataList[j][i]});
            }
        }
        $scope.tableHeader = tableHeader;
        $scope.tableBodyData = tableBodyData;
    }

    function statistic(dataList, start, end, method) {
        var newLine = [];
        if (method === 'sum' || method === 'avg') {
            for (var i=0; i<dataList.length; i++) {
                var sum = null;
                for (var j=start; j<=end; j++) {
                    if (dataList[i][j] !== null) {
                        if (sum === null) {
                            sum = dataList[i][j];
                        } else {
                            sum += dataList[i][j];
                        }
                    }
                }
                if (method === 'sum') {
                    newLine.push(sum);
                } else {
                    newLine.push((sum/dataList.length).toFixed(3));
                }
            }
        } else if (method === 'max') {
            for (var i=start; i<=end; i++) {
                var max = dataList[0][i];
                for (var j=1; j<dataList.length; j++) {
                    if (max < dataList[j][i]) {
                        max = dataList[j][i];
                    }
                }
                newLine.push(max);
            }
        } else if (method === 'min') {
            for (var i=start; i<=end; i++) {
                var min = dataList[0][i];
                for (var j=1; j<dataList.length; j++) {
                    if (min > dataList[j][i]) {
                        min = dataList[j][i];
                    }
                }
                newLine.push(min);
            }
        }
        return newLine;
    }
    $scope.$on('$destroy', function (event) {

        // 页面返回时去除body上的timeType类
        var className = document.body.className;
        var startIndex = className.indexOf('timeType');
        if (startIndex >= 0) {
            var lastClassName = className.substring(startIndex);
            document.body.className = className.replace(lastClassName, ' ');
        }
        if ($scope.picker) {
            $scope.picker.dispose();
            $scope.picker = null;
        }
        if (reportPicker) {
            reportPicker.dispose();
            reportPicker = null;
        }
        $.notify.progressStop();
    });

    setTimeout($scope.getDataList, 500);
});