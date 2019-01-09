function getCurrentMonthLast(data) {
    var date = new Date(data);
    var currentMonth = date.getMonth();
    var nextMonth = ++currentMonth;
    var nextMonthFirstDay = new Date(date.getFullYear(), nextMonth, 1);
    var oneDay = 1000 * 60 * 60 * 24;
    return new Date(nextMonthFirstDay - 1);
}

var g_line_colors = ['#9474df','#ef7e9c', '#6bc1dd', '#13cf5a',  '#f3a15d', '#6c7fff', '#ca8622', '#bda29a','#6e7074', '#546570', '#c4ccd3'];
var g_pvf_colors = {
    'p': 'rgba(239, 150, 166, 0.18)',
    'v': 'rgba(138, 212, 199, 0.18)',
    'f': 'rgba(136, 169, 248, 0.18)'
};

var g_pvf_label_colors = {
    'p': 'rgba(239, 150, 166, 1)',
    'v': 'rgba(138, 212, 199, 1)',
    'f': 'rgba(136, 169, 248, 1)',
};

app.directive('dropDownMenu', [function () {
    return {
        restrict: 'E',
        templateUrl: 'templates/site-monitor/dropdown-menu.html',
        scope: {
            options: '=',
            onSelect: '=',
            modelName: '=',
            defaultValue: '=',
            selected: '=',
            disabled: '='
        },
        replace: true,
        controller:['$scope', '$attrs', function($scope, $attrs){
            $scope.active = false;
            $scope.selected = $scope.selected || {};

            $scope.toggle = function () {
                if ($scope.disabled) {
                    return;
                }
                $scope.active = !$scope.active;
                if ($scope.active) {
                    var mark = $('<div style="position: fixed;background-color: transparent;width: 100%;height: 100%;top:60px;z-index: 1;left: 0;" ng-click="toggle()"></div>')
                        .appendTo($scope.domEle);
                } else {
                    $scope.domEle.find('div:last').remove();
                }
            };

            $scope.onClick = function ($event, id) {
                if ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                }
                for (var i=0; i<$scope.options.length; i++) {
                    if ($scope.options[i].id === id) {
                        $scope.selected = $scope.options[i];
                        $scope.toggle();
                        $scope.onSelect($scope.modelName, $scope.selected.id, $scope.selected.name);
                        return false;
                    }
                }
            };

            if ($scope.defaultValue !== undefined) {
                for (var i=0; i<$scope.options.length; i++) {
                    if ($scope.options[i].id === $scope.defaultValue) {
                        $scope.selected = $scope.options[i];
                        break;
                    }
                }
            } else if ($scope.options.length) {
                $scope.selected = $scope.options[0];
            }
        }],
        link: function (scope, element, attrs) {
            console.log(element);
            scope.domEle = element;
        }
    }
}]);

app.directive('historyTable', [function(){
    return {
        restrict: 'E',
        templateUrl: 'templates/site-monitor/history-table-template.html',
        replace: true,
        scope: {
            tableHeader: '=',
            tableBodyData: '='
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
                    var height = screen.height - 154;
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
    var pfvSettingsF = null;     // 用电电价
    var pfvSettingsR = null;     // 发电电价
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
                    $scope.$apply();
                    refreshData();
                });
            } else {
                var options = {type: 'date'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    currentDay = rs.text + 'T00:00:00.000Z';
                    refreshDateShowName();
                    // _self.picker.dispose();
                    // _self.picker = null;
                    $scope.$apply();
                    refreshData();
                });
            }
        }, false);
    }

    function getStationInfo(sn) {
        // 获取站点信息，主要是为了得到电价配置
        ajax.get({
            url: '/stations/' + sn,
            success: function (data) {
                if(data.pfv_settings_f && data.pfv_settings_f != '') {
                    pfvSettingsF = JSON.parse(data.pfv_settings_f);
                }
                if(data.pfv_settings_r && data.pfv_settings_r != '') {
                    pfvSettingsR = JSON.parse(data.pfv_settings_r);
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
            getDataInfoOfGroup(group.id);
        });
    }

    function getDataInfoOfGroup(groupId) {
        ajax.get({
            url: '/trendgroups/' + groupId + '/datainfo?type=' + $scope.timeType.id + '&calcmethod=' + $scope.calcMethod.id + '&starttime=' + currentDay,
            success: function (data) {
                showChart(groupId, data, $scope.timeType.id, currentDay, $scope.calcMethod.id);
            }
        });
    }
    function createChartSeriesForGroup(data, chartOption) {
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
                scale: true
            },
            {
                "axisLine": {
                    lineStyle: {
                        color: '#e7ecf1'
                    }
                },
            }
        ];
        for (var l = 0; l < data.data.length; l++) {
            if(!data.data[l].unit) {
                data.data[l].unit = '';
            }
            if(data.data[l].unit.indexOf("kW") != -1) {
                showPfvSettingsF = true;
            }
            var mhharr = [];
            for (var h = 0; h < data.data[l].time_keys.length; h++) {
                var myarr = [];
                var nian = data.data[l].time_keys[h].slice(0, 4);
                var yue = data.data[l].time_keys[h].slice(5, 7) - 1;
                var ri = data.data[l].time_keys[h].slice(8, 10);
                var shi = data.data[l].time_keys[h].slice(11, 13);
                var fen = data.data[l].time_keys[h].slice(14, 16);
                var miao = data.data[l].time_keys[h].slice(17, 19);
                myarr[0] = new Date(nian, yue, ri, shi, fen, miao);
                myarr[1] = data.data[l].datas[h];
                mhharr.push(myarr)
            }
            arr.push({
                name: data.data[l].name,
                type: 'line',
                symbolSize: 2,
                symbol: 'circle',
                yAxisIndex: 0,
                data: mhharr
            });
            namearr.push(data.data[l].name + "(" + data.data[l].unit + ")");
        }

        //增加电价信息
        if(showPfvSettingsF && pfvSettingsF && data.type === "day") {
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
            createPfvSettingMark(pfvSettingsF, [nian, yue, ri], arr);
        }
        $.extend(chartOption, {
            legend: {
                data: namearr
            },
            yAxis: yAxis,
            series: arr
        });
    }

    function createPfvSettingMark(tempPfvSettings, ymd, series) {
        var nian = ymd[0], yue = ymd[1], ri = ymd[2];
        for(var i=0; i<tempPfvSettings.length; i++){
            var markAreaData = [];
            var chargeData = [];

            var tempPfv = tempPfvSettings[i].pfv;
            var tempCharge = tempPfvSettings[i].charge;
            var tempName = '';
            var tempColor = 'gray';
            var tempLabelColor = 'gray';
            if(tempPfv === 'p') {
                tempName = '峰';
                tempColor = g_pvf_colors.p;
                tempLabelColor = g_pvf_label_colors.p;
            } else if(tempPfv === 'f') {
                tempName = '平';
                tempColor = g_pvf_colors.f;
                tempLabelColor = g_pvf_label_colors.f;
            } else if(tempPfv === 'v') {
                tempName = '谷';
                tempColor = g_pvf_colors.v;
                tempLabelColor = g_pvf_label_colors.v;
            }

            var startDate = new Date(nian, yue, ri, parseInt(tempPfvSettings[i].starttime.substr(0,2)), parseInt(tempPfvSettings[i].starttime.substr(3,5)), 00);
            var endDate = new Date(nian, yue, ri, parseInt(tempPfvSettings[i].endtime.substr(0,2)), parseInt(tempPfvSettings[i].endtime.substr(3,5)), 00);

            var tempAreaData = [{
                name: tempName+'\n'+tempPfvSettings[i].charge+'元',
                xAxis: startDate,
                yAxis: 0
            }, {
                xAxis: endDate,
                yAxis: tempPfvSettings[i].charge,
            }];

            chargeData.push([endDate, tempPfvSettings[i].charge]);
            markAreaData.push(tempAreaData);

            var newDate = {
                name: i,
                yAxisIndex: 1,
                type:'line',
                symbolSize: 0,
                itemStyle: {
                    normal: {
                        color: tempLabelColor,
                        lineStyle: {
                            width: 0
                        }
                    }
                },
                data: chargeData,
                markArea: {
                    data: markAreaData,
                    itemStyle: {
                        normal: {
                            color: tempColor
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
                'left': 55,
                'right': 30,
                'top': 20,
                bottom: 30
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                left: 'center',
                bottom: 0,
                orient: 'horizontal',
                formatter: function(name) {
                    return (name.length > 8 ? (name.slice(0, 8) + "...") : name);
                },
                padding: [0, 0, 2, 0]
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
        createChartSeriesForGroup(data, option);
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
});

// 历史报表
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
                    $scope.$apply();
                    getDataInfoOfReport();
                });
            } else {
                var options = {type: 'date'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    currentDay = rs.text + 'T00:00:00.000Z';
                    refreshDateShowName();
                    // _self.picker.dispose();
                    // _self.picker = null;
                    $scope.$apply();
                    getDataInfoOfReport();
                });
            }
        }, false);
    }
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
                    $scope.currentReport = report;
                    $scope.reportSetting = JSON.parse(report.extend_js);
                    getDataInfoOfReport(report);

                    // 初始化报告选择器
                    var pickerData = [];
                    data.forEach(function (item) {
                        pickerData.push({
                            value: item.id,
                            text: item.name
                        })
                    });
                    taskTypePicker = new mui.PopPicker();
                    taskTypePicker.setData(pickerData);
                    var taskTypeButton = document.getElementById('reportPicker');
                    taskTypeButton.addEventListener('click', function(event) {
                        taskTypePicker.show(function(items) {
                            if (items[0].value !== $scope.currentReport.id) {
                                $scope.currentReport.name = items[0].text;
                                $scope.currentReport.id = items[0].value;
                                getDataInfoOfReport();
                                $scope.$apply();
                            }
                        });
                    }, false);
                }
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $.notify.error('获取数据失败');
            }
        });
    }

    $scope.onChangeReport = function (reportId) {
        $scope.reportGroups.forEach(function (report) {
            if (report.id === reportId) {
                $scope.currentReport = report;
                $scope.reportSetting = JSON.parse(report.extend_js);
                return false;
            }
        })
    };

    $scope.onSelect = function (key, value, name) {
        if (key === 'timeType') {
            if (value === 'DAY') {
                $scope.calcMethodList = [{
                    id: 'MAX',
                    name: '瞬时值'
                }];
            } else {
                $scope.calcMethodList = [{
                    id: 'AVG',
                    name: '平均值'
                }, {
                    id: 'MAX',
                    name: '最大值'
                }];
            }
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
        getDataInfoOfReport();
        refreshDateShowName();
    };

    $scope.onSelectReport = function (key, value, name) {
        $scope.currentReport.id = value;
        $scope.currentReport.name = name;
        getDataInfoOfReport($scope.currentReport);
    };

    function getDataInfoOfReport() {
        if (!$scope.currentReport) {
            return;
        }
        $scope.isLoading = true;
        $.notify.progressStart('', true);
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
                $scope.isLoading = false;
                $scope.$apply();
                $.notify.progressStop();
            },
            error: function () {
                $.notify.progressStop();
                $scope.isLoading = false;
                $scope.$apply();
            }
        })
    }

    function refreshTable() {
        if ($scope.table) {
            $scope.table.destroy(true);
            $scope.table = null;
            var html = "<history-table table-header='tableHeader' table-body-data='tableBodyData'></history-table>";
            var compileFn = $compile(html);
            var $dom = compileFn($scope);
            // 添加到文档中
            $dom.appendTo($('#tableParent'));
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
                if (t.slice(11, 13) === '00') {
                    timeKeys.push('24时');
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
        var tableHeader = [{
            name: '时间'
        }];       // 表头
        var dataList = [];      // 取出所有数据
        dataInfo.forEach(function (data) {
            tableHeader.push({
                name : data.name,
                unit: data.unit
            });
            dataList.push(data.datas);
        });
        var tableColumnHeader = [];     // 表的固定列，为二元数组
        for (var i=0; i<timeKeys.length; i++) {
            tableColumnHeader.push([{name: timeKeys[i]}]);
        }

        var tableBodyData = [];
        // if (timeType === 'DAY' && setting.timeSlots && setting.timeSlots.length) {
        if (false) {        // 先注释掉时间段的显示
            // 如果配置了时间段，那么会增加一列
            $scope.hasTimeSlot = true;
            tableHeader.unshift({name: '分段'});

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
        if (taskTypePicker) {
            taskTypePicker.dispose();
            taskTypePicker = null;
        }
        $.notify.progressStop();
    });

    setTimeout($scope.getDataList, 500);
});