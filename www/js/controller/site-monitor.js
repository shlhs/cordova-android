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
    'f': 'rgba(136, 169, 248, 0.18)',
};

var g_pvf_label_colors = {
    'p': 'rgba(239, 150, 166, 1)',
    'v': 'rgba(138, 212, 199, 1)',
    'f': 'rgba(136, 169, 248, 1)',
};
// 历史曲线
app.controller('SiteHistoryTrendCtrl', function ($scope, ajax) {
    var stationSn = GetQueryString("sn");
    var pfvSettingsF = null;     // 用电电价
    var pfvSettingsR = null;     // 发电电价
    $scope.currentDay = moment().format('YYYY-MM-DDTHH:mm:ss.000') + 'Z';
    $scope.calcMethod = 'AVG';
    $scope.timeType = 'DAY';
    var chartsMap = {};     // group与chartId的对应关系
    var trendGroups = [];

    function init() {
        getStationInfo(stationSn);
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
        if (chartsMap[groupId]) {
            return document.getElementById('chart' + groupId)
        } else {
            chartsMap[groupId] = true;
            return $('<div id="chart' + groupId + '"></div>').appendTo($('.charts-group')).get(0);
        }
    }

    function getTrendGroupOfSite(sn) {
        ajax.get({
            url: '/stations/' + sn + '/trendgroups',
            success: function (response) {
                trendGroups = response;
                refreshData(response);
            }
        })
    }

    function refreshData(trendGroups) {
        trendGroups.forEach(function (group) {
            getDataInfoOfGroup(group.id);
        });
    }

    function getDataInfoOfGroup(groupId) {
        ajax.get({
            url: '/trendgroups/' + groupId + '/datainfo?type=' + $scope.timeType + '&calcmethod=' + $scope.calcMethod + '&starttime=' + $scope.currentDay,
            success: function (data) {
                showChart(groupId, data, $scope.timeType, $scope.currentDay, $scope.calcMethod);
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
        };
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

    init();
});