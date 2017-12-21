"use strict";


app.controller('KanbanCtrl', function ($scope, $stateParams, ajax) {
    $scope.sn = GetQueryString('sn');
    $scope.hasData = true;
    $scope.isLoading = true;
    $scope.varGroups = {};
    var varTrendType = 'DAY';

    var colors = ['#f6d365', '#fda085', '#a1c4fd', '#c2e9fb', '#cfd9df', '#accbee', 'rgb(200, 221, 253)', 'rgb(84, 185, 253)', 'rgb(250, 137, 143)'];

    $scope.getRandomColor = function(index) {
        // var index = Math.floor(Math.random() * 7 );
        if (index >= colors.length){
            index = index % colors.length;
        }
        return colors[index];
    };

    function getDataList() {
        ajax.get({
            url: "/homeVargroupNames",
            cache: false,
            success: function(result) {
                $scope.isLoading = false;
                $scope.$apply();
                $scope.varGroups = result;
                for(var key in result){
                    var isRealTime = false;
                    if (key === 'keyVarGroupName' || key === 'pieVarGroupName'){
                        isRealTime = true;
                    }
                    getVarGroupData(key, result[key], isRealTime);
                }
                // 判断是否有数据
                var var1 = $scope.varGroups.topVarGroupName, var2 = $scope.varGroups.pieVarGroupName;
                var dataLen = 2;
                if (!var1 || !var1.data || !var1.data.length){
                    $("#barChart").hide();
                    dataLen -= 1;
                }
                if (!var2 || !var2.data || !var2.data.length){
                    $("#pieChart").hide();
                    dataLen -= 1;
                }
                if (!dataLen){  //  隐藏图表
                    $("#chartCard").hide();
                }
                // 如果数据都为空，页面显示无数据
                if ($("#realtime .mui-card:visible").length === 0){
                    $scope.hasData = false;
                }
                $scope.$apply();
            },
            error: function (a,b,c) {
                $scope.isLoading = false;
                $scope.$apply();
            }
        });
    }

    function getVarGroupData(groupKey, groupNam, isRealTimeData) {      // 获取变量组实时数组
        var url = "/stations/" + $scope.sn + "/vargroups/" + groupNam + "/VarStatisticalDatas?type=" + varTrendType;
        if (isRealTimeData){
            url = "/stations/" + $scope.sn + "/vargroups/" + groupNam + "/VarRealtimeDatas";
        }
        ajax.get({
            url: url,
            async: false,
            cache: false,
            success: function(result) {
                $scope.varGroups[groupKey] = {
                    name: groupNam,
                    data: result,
                    isRealTimeData: isRealTimeData ? true : false
                };
                if (groupKey === 'pieVarGroupName')
                {
                    drawPieVarGroupName(groupNam, result);
                }else if (groupKey === 'topVarGroupName'){
                    drawTopVarGroupName(groupNam, result);
                }
                $scope.$apply();
            },
            error: function (a,b,c) {
                console.log('get var group fail');
            }
        });
    }
    var chartCount = 1;
    function drawPieVarGroupName(name, data) {
        if (!data || !data.length){
            return;
        }
        var valueList = [], names=[];
        for (var i in data){
            data[i].name = data[i].name;
            data[i].y = data[i].data;
            names.push(data[i].name);
        }
        Highcharts.getOptions().colors = Highcharts.map(['#90CAF9'], function (color) {
            return {
                radialGradient: { cx: 0.2, cy: 0.3, r: 0.7 },
                stops: [
                    [0, color],
                    [1, Highcharts.Color(color).brighten(0.1).get('rgb')] // darken
                ]
            };
        });
        var config = {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie',
                height:250,
                margin: 10
            },
            credits: {
                enabled: false
            },
            title: {
                text: name
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            plotOptions: {
                pie: {
                    // allowPointSelect: true,
                    cursor: 'pointer',
                    colors: ['#BBDEFB', '#FFE0B2', '#D1C4E9', '#F8BBD0', '#C8E6C9', '#FFF59D'],
                    dataLabels: {
                        enabled: true,
                        format: '<span>{point.name}</span><br>{point.options.data}{point.options.unit}<br>{point.percentage:.1f}%',
                        distance: 0,
                        style: {
                            color: '#444',
                            fontWeight: 'normal'
                        },
                        filter: {
                            property: 'percentage',
                            operator: '>',
                            value: 4
                        }
                    }
                }
            },
            series: [{
                name: 'Brands',
                data: data
            }]
        };
        // 动态增加一个图标
        drawChart(name, config);
    }

    function drawTopVarGroupName(name, data) {
        if (!data || !data.length){
            return;
        }
        data = data[0];
        if (data.unit){
            name += '/' + data.unit;
        }
        var timeList = [], values = [];
        for (var i in data.time_keys){
            if (varTrendType === 'DAY') {
                timeList.push(data.time_keys[i].substring(11, 16));
            }else{
                timeList.push(data.time_keys[i].substring(5, 10));
            }
            values.push(data.datas[i] ? data.datas[i] : 0);
        }
        var config = {
            chart: {
                type: 'area',
                height: 230
            },
            title: {
                text: '能耗实时趋势'
            },
            subtitle:{
                text: data.name + "/日"
            },
            credits: {
                enabled: false
            },
            legend:{
                enabled: false
            },
            xAxis: {
                allowDecimals: false,
                categories: timeList,
                label: {
                    step: 4
                },
                tickAmount: 4,
                tickInterval: 5
            },
            yAxis: {
                title: {
                    enabled: false
                },
                labels: {
                    formatter: function () {
                        return this.value / 1000 + 'k';
                    }
                }
            },
            tooltip: {
                pointFormat: '{series.name} 制造 <b>{point.y:,.0f}</b>枚弹头'
            },
            plotOptions: {
                area: {
                    // pointStart: 1940,
                    marker: {
                        enabled: false,
                        symbol: 'circle',
                        radius: 2,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    }
                }
            },
            series: [{
                name: '美国',
                data: values
            }]
        };
        // 动态增加一个图标
        drawChart(name, config);
    }

    function drawChart(name, config) {
        var id = 'chart' + chartCount;
        if (chartCount === 1){
            $("#chartGroup").empty();
        }
        /*jshint multistr: true */
        $('<div class="mui-slider-item">\
            <div class="card-content">\
            <div class="mui-content-padded no-margin">\
            <div class="chart" id="' + id + '"></div>\
            <div style="position: absolute;left:0;top:0;width:100%;height:100%;"></div>\
            </div>\
            </div>\
            </div>').prependTo($("#chartGroup"));

        if (chartCount === 1)
        {
            $('<li class="slidesjs-pagination-item"><a href="#" class="active">1</a></li>').prependTo($("#chartSlidesPagination"));
            document.querySelector("#chartSlider").addEventListener('slide', function (event) {
               var slideNumber = event.detail.slideNumber;
               $("#chartSlidesPagination li a").removeClass('active');
                $("#chartSlidesPagination li:eq(" + (slideNumber-1) + ") a").addClass('active');
            });
        }else{
            $('<li class="slidesjs-pagination-item"><a href="#">1</a></li>').prependTo($("#chartSlidesPagination"));
        }

        Highcharts.chart(id, config);
        chartCount += 1;
    }

    getDataList();

});