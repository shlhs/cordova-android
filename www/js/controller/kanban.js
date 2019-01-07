"use strict";


app.controller('KanbanCtrl', function ($scope, $stateParams, ajax, $timeout) {
    $scope.sn = GetQueryString('sn');
    // $scope.sn = $stateParams.sn;
    $scope.hasData = true;
    $scope.isLoading = true;
    $scope.havaEventList = false;
    $scope.varGroups = {};
    $scope.keyVarDatas = [];
    $scope.keyStaticDatas = [];
    $scope.queryTime = moment().format('YYYY-MM-DD HH:mm:ss');
    var varTrendType = 'DAY';
    var chartCount = 1;
    var pfvSettingsF = null;
    var pfvSettingsR = null;
    var g_devicevar_unit_map = {};

    var colors = ['#f6d365', '#fda085', '#a1c4fd', '#c2e9fb', '#cfd9df', '#accbee', 'rgb(200, 221, 253)', 'rgb(84, 185, 253)', 'rgb(250, 137, 143)'];

    $scope.getRandomColor = function(index) {
        // var index = Math.floor(Math.random() * 7 );
        if (index >= colors.length){
            index = index % colors.length;
        }
        return colors[index];
    };
    var needChartCount = 0, paintedChartCount=0, paintFailedCount=0;

    function paintFailed() {        // 检测图表绘制是否已完成
        paintFailedCount += 1;
        if (paintedChartCount + paintFailedCount == needChartCount) {
            _initSlider(paintedChartCount);
        }
    }

    function paintSuccess() {
        paintedChartCount += 1;
        if (paintedChartCount + paintFailedCount == needChartCount) {
            _initSlider(paintedChartCount);
        }
    }

    function _initSlider(count) {
        if (count === 1) {
            $('<ul class="slidesjs-pagination">' +
                '<li class="slidesjs-pagination-item">' +
                '<a href="#" data-slidesjs-item="0" class="active">1</a>' +
                '</li>' +
                '</ul>').appendTo($('#chartSlider'));
        } else {
            var slide = $("#chartSlider");
            slide.slidesjs({
                width: window.screen.width,
                play: {
                    active: true,
                    swap: true
                }
            });
        }
    }
    function getKanbanData() {
        needChartCount = 0;
        paintedChartCount = 0;
        paintFailedCount = 0;
        ajax.get({
            url: "/station/" + $scope.sn + "/dashboardsetting/",
            cache: false,
            success: function(result) {
                if (!result){
                    return;
                }
                var contentsResult = JSON.parse(result.data).widgets.contents;
                var keyVarDatas = [];
                var keyStaticDatas = [];
                var haveChart = false;
                var chartCount = 0;
                for(var i in contentsResult){
                    if(contentsResult[i].type === 'singlestate' || contentsResult[i].type === 'multistate'){
                        for(var j in contentsResult[i].content) {
                            var processedValue = getProcessedValue($scope.sn, contentsResult[i].content[j], $scope.queryTime);
                            if(contentsResult[i].content[j].type === 'device-data') {
                                var tempVarData = {};
                                // 如果name中含有单位，将单位去除
                                if (processedValue.name.indexOf("（") > 0) {
                                    tempVarData.name = processedValue.name.substring(0, processedValue.name.indexOf('（'));
                                } else {
                                    tempVarData.name = processedValue.name;
                                }

                                tempVarData.value = processedValue.processed_value;
                                tempVarData.unit = processedValue.unit;
                                
                                keyVarDatas.push(tempVarData);
                            } else {
                                keyStaticDatas.push({'name': processedValue.name, 'value': processedValue.processed_value});
                            }
                        }
                    }else if(contentsResult[i].type === 'pfv-electric-consumption-pie'){
                        var deviceVarSn = contentsResult[i].content[0].varInfo.deviceVarSn;
                        if(!deviceVarSn) {
                            continue;
                        }
                        haveChart = true;
                        needChartCount += 1;
                        getElectricalDegreeandCharge(contentsResult[i].title, deviceVarSn, contentsResult[i].period, $scope.queryTime, contentsResult[i].degreeOrCharge);
                    }else if(contentsResult[i].type === 'trend-analysis'){
                        var deviceVarSns = [];
                        for(var j in contentsResult[i].content) {
                            deviceVarSns.push(contentsResult[i].content[j].varInfo.deviceVarSn);
                        }
                        if(deviceVarSns.length == 0) {
                            continue;
                        }
                        haveChart = true;
                        needChartCount += 1;
                        getTrendAnalysis(contentsResult[i].title, deviceVarSns, contentsResult[i].period, $scope.queryTime, contentsResult[i].pfvSettings, contentsResult[i].showType);
                    }else if(contentsResult[i].type === 'ratio-pie'){
                        var ratioPieData = [];
                        var unit = '';
                        for(var j in contentsResult[i].content) {
                            var tempVarSn = contentsResult[i].content[j].varInfo.deviceVarSn;
                            if(!tempVarSn || tempVarSn == '') {
                                continue;
                            }
                            var tempData = {};
                            var tempName = contentsResult[i].content[j].varInfo.deviceVarName;
                            if(tempName.length > 8) {
                                var pos = parseInt(tempName.length/2);
                                tempName = tempName.substring(0, pos) + "\n" + tempName.substring(pos)
                            }
                            tempData.name = tempName;
                            var tempValue = getDeviceVarData(tempVarSn, $scope.queryTime, contentsResult[i].period, contentsResult[i].calcMethod);
                            tempData.value = parseFloat(tempValue);
                            if(unit == '' && tempValue.length > String(tempData.value).length) {
                                unit = tempValue.substring(String(tempData.value).length);
                            }
                            ratioPieData.push(tempData);
                        }
                        haveChart = true;
                        needChartCount += 1;
                        getRatioPie(contentsResult[i].title, ratioPieData, unit);
                    }else if(contentsResult[i].type === 'device-statics'){
                        continue;
                    }else if(contentsResult[i].type === 'alarm-list'){
                        $scope.havaEventList = true;
                    }
                }

                $scope.keyVarDatas = keyVarDatas;
                $scope.keyStaticDatas = keyStaticDatas;

                if (!haveChart){  //  隐藏图表
                    $("#chartCard").hide();
                }

                $scope.isLoading = false;
                $scope.$apply();

            },
            error: function (a,b,c) {
                $scope.isLoading = false;
                $scope.$apply();
            }
        });
    }

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
                // $('#chartSlider').swiper({
                //     pagination: '.swiper-pagination'
                // });
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

    function getProcessedValue(stationSn, keyVaule, queryTime) {
        var processedValue = {};
        var tempContent = keyVaule;
        processedValue.name = tempContent.name;
        var tempType = tempContent.type;
        processedValue.type = tempType;

        var tempValue = '请进行配置';
        if(tempType == 'normal-text') {
            tempValue = tempContent.value;
        } else if(tempType == 'station-manage-info') {
            ajax.get({
                url: '/stations/' + stationSn,
                async: false,
                dataType: 'json',
                xhrFields: {
                    withCredentials: true
                },
                crossDomain: true,
                success: function(data) {
                    var stationInfo = data;
                    stationInfo.capacity = stationInfo.capacity + 'KVA';
                    stationInfo.safe_operation_days='' +  parseInt((Math.abs(new Date() - Date.parse(stationInfo.init_time)))/1000/60/60/24) + '天';
                    tempValue = stationInfo[tempContent.value];
                },
                error: function(err){
                    console.log('获取站点信息失败 '+stationSn+err);
                }
            });
        } else if(tempType == 'device-data') {
            var tempRes = getDeviceVarData(tempContent.varInfo.deviceVarSn, queryTime, tempContent.period, tempContent.calcMethod);
            tempValue = tempRes.value;
            processedValue.unit = tempRes.unit;
        }
        processedValue.processed_value = tempValue;

        return processedValue;
    }

    function getDeviceVarData(deviceSn, queryTime, queryPeriod, calcMethod){
        var res = {'value': '', unit: ''};
        if(deviceSn == null || deviceSn == '') {
            console.warn('no deviceSn for getDeviceVarData');
            return res;
        }
        if(queryTime == null || queryTime == '') {
            console.warn('no queryTime for getDeviceVarData');
            return res;
        }
        if(queryPeriod == null || queryPeriod == '') {
            console.warn('no queryPeriod for getDeviceVarData');
            return res;
        }
        if(calcMethod == null || calcMethod == '') {
            console.warn('no calcMethod for getDeviceVarData');
            return res;
        }

        if(queryPeriod == 'real_time') {
            ajax.get({
                url: '/devicevars/getrealtimevalues?sns=' + deviceSn,
                async: false,
                success: function (data) {
                    if(!data || data.length == 0) {
                        return;
                    }
                    var tempValue = data[0].data;
                    if(tempValue != null) {
                        //  type: "Digital"   one_meaning: "闭合 ON 红色"  zero_meaning: "断开 OFF 绿色"
                        if(data[0].var.type == 'Digital') {
                            if(tempValue == 0) {
                                res.value = '<div style="background-color: #08b762; color: white;padding: 0px 6px; border-radius: 4px; width: fit-content;">'+data[0].var.zero_meaning ? data[0].var.zero_meaning : 'OFF' +'</div>';
                            }
                            if(tempValue == 1) {
                                res.value = '<div style="background-color: #e00202; color: white;padding: 0px 6px; border-radius: 4px; width: fit-content;">'+data[0].var.one_meaning ? data[0].var.one_meaning : 'ON' +'</div>';
                            }
                        } else {
                            res.value = tempValue;
                            res.unit = data[0].unit || ''
                        }
                    }
                    g_devicevar_unit_map[deviceSn] = data[0].unit || '';
                },
                error: function () {
                    console.warn('获取设备变量实时值失败 '+deviceSn);
                }
            });
            return res;
        }


        var tempQueryTime = queryTime.substr(0,10) + 'T' + queryTime.substr(11,8) + '.000Z';

        if(calcMethod == 'average') {
            if(queryPeriod == 'current_month') {
                var resultValue = '';
                ajax.get({
                    url: '/devicevars/getstatisticalvalues?type=YEAR&calcmethod=AVG&sns=' + deviceSn + '&querytime=' + tempQueryTime,
                    async: false,
                    dataType: 'json',
                    xhrFields: {
                        withCredentials: true
                    },
                    crossDomain: true,
                    success: function(data) {
                        if(data.length == 0) {
                            return;
                        }
                        var varData = data[0];
                        var queryMonth = parseInt(tempQueryTime.substr(5,2));
                        var index = null;
                        if(varData.time_keys != null) {
                            for(var i=0; i<varData.time_keys.length; i++) {
                                var temp = parseInt(varData.time_keys[i].substr(5,2));
                                if(temp == queryMonth) {
                                    index=i;
                                    break;
                                }
                            }
                        }
                        if(index != null && varData.datas != null && varData.datas.length > index) {
                            if(varData.datas[index] != null) {
                                var tempValue = varData.datas[index];
                                resultValue = tempValue+varData.unit;
                                g_devicevar_unit_map[deviceSn] = data[0].unit;
                            }
                        }
                    },
                    error: function(){
                        console.log('获取设备变量值失败 '+deviceSn);
                    }
                });
                return resultValue;
            }
        }

        if(calcMethod == 'max') {
            if(queryPeriod == 'current_month') {
                var resultValue = '';
                ajax.get({
                    url: '/devicevars/getstatisticalvalues?type=YEAR&calcmethod=MAX&sns=' + deviceSn + '&querytime=' + tempQueryTime,
                    async: false,
                    dataType: 'json',
                    xhrFields: {
                        withCredentials: true
                    },
                    crossDomain: true,
                    success: function(data) {
                        if(data.length == 0) {
                            return;
                        }
                        var varData = data[0];
                        var queryMonth = parseInt(tempQueryTime.substr(5,2));
                        var index = null;
                        if(varData.time_keys != null) {
                            for(var i=0; i<varData.time_keys.length; i++) {
                                var temp = parseInt(varData.time_keys[i].substr(5,2));
                                if(temp == queryMonth) {
                                    index=i;
                                    break;
                                }
                            }
                        }
                        if(index != null && varData.datas != null && varData.datas.length > index) {
                            if(varData.datas[index] != null) {
                                var tempValue = varData.datas[index];
                                resultValue = tempValue+varData.unit;
                                g_devicevar_unit_map[deviceSn] = data[0].unit;
                            }
                        }
                    },
                    error: function(){
                        console.log('获取设备变量值失败 '+deviceSn);
                    }
                });
                return resultValue;
            }
        }

        if(calcMethod == 'diff'){
            if(queryPeriod == 'current_month') {
                var diffValue = "";

                var startQueryTime = queryTime.substr(0,7) + '-01T00:00:00.000Z';
                var endQueryTime = queryTime.substr(0,10) + 'T' + queryTime.substr(11,8) + '.000Z';

                var queryData = "&sns=" + [deviceSn].join(",");
                queryData += '&querytimes=' + startQueryTime + ',' + endQueryTime;
            
                ajax.get({
                    url: '/devicevars/getOneTimeDatas',
                    async: false,
                    data: queryData,
                    dataType: 'json',
                    xhrFields: {
                        withCredentials: true
                    },
                    crossDomain: true,
                    success: function(values) {
                    var startValues, endValues = null;
                    for(var i=0; i<values.length; i++) {
                        if(values[i].time == startQueryTime) {
                        startValues = values[i].values;
                        continue;
                        }
                        if(values[i].time == endQueryTime) {
                        endValues = values[i].values;
                        continue;
                        }
                    }
                    if(startValues == null || endValues == null){
                        if(startValues == null) {
                        console.warn('获取时间点的值失败: '+startQueryTime+deviceSn);
                        }
                        if(endValues == null) {
                        console.warn('获取时间点的值失败: '+endQueryTime+deviceSn);
                        }
                    } else {
                        //resultValue = endValues[deviceSn] - startValues[deviceSn];
                        if(!g_devicevar_unit_map[deviceSn]) {
                        //待后台
                        ajax.get({
                            url: '/devicevars/getbysn/' + deviceSn,
                            async: false,
                            success: function (data) {
                            if(!data) {
                                return;
                            }
                            g_devicevar_unit_map[deviceSn] = data.unit;
                            },
                            error: function () {
                            console.warn('获取设备变量信息 '+deviceSn);
                            }
                        });
                        }
                        var tempValue = endValues[deviceSn] - startValues[deviceSn];
                        //tempValue = tempValue == 0 ? tempValue:tempValue.toFixed(valueFixNum);
                        diffValue = tempValue + g_devicevar_unit_map[deviceSn];
                    }
                    },
                    error: function(){
                        console.log('获取设备变量值失败 '+deviceSn);
                    }
                });
                return diffValue;
            }
        }
        return '暂不支持：'+queryPeriod+'/'+calcMethod;
    }

    function getElectricalDegreeandCharge(name, deviceVarSn, period, queryTime, degreeOrCharge) {
        var queryType = 'MONTH';
        if(period === 'current_day') {
            queryType = 'DAY';
        } else if(period == 'current_year') {
            queryType = 'YEAR';
        }

        ajax.get({
            url: '/devicevars/getelectricaldegreeandcharge',
            data: {
                sns: deviceVarSn,
                type: queryType,
                querytime: queryTime.substr(0,10) + 'T' + queryTime.substr(11,8) + '.000Z'
            },
            success: function (data) {
                if (!data){
                    paintFailed();
                    return;
                }
                var p = 0;
                var f = 0;
                var v = 0;
                var sum = 0;
                var unit = degreeOrCharge == 'charge' ? '元' : 'kWh';

                if(degreeOrCharge == 'charge') {
                    for(var i=0; i < data.length; i++) {
                        p += data[i].pCharge;
                        f += data[i].fCharge;
                        v += data[i].vCharge;
                        sum += data[i].allCharge;
                    }
                } else {
                    for(var j=0; j < data.length; j++) {
                        p += data[j].pDegree;
                        f += data[j].fDegree;
                        v += data[j].vDegree;
                        sum += data[j].allDegree;
                    }
                }

                var newData = [{
                    value: p,
                    name: '峰'
                }, {
                    value: f,
                    name: '平'
                }, {
                    value: v,
                    name: '谷'
                }];

                var echartOptions = {
                    title: [{
                        text: ''+sum+'\n'+unit,
                        textStyle: {
                            fontFamily: 'Microsoft YaHei',
                            fontSize: 12
                        },
                        x: 'center',
                        y: 'center'
                    }],
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    legend: {
                        orient: 'vertical',
                        show: false,
                        x: 'left',
                        data: ['峰', '平', '谷']
                    },
                    color: ['#F04863', '#F9CC13', '#369FFF', '#12C1C1', '#8442E0', '#2FC15B'],
                    series: [{
                        name: '用电量',
                        type: 'pie',
                        radius: ['30%', '65%'],
                        label: {
                            normal: {
                                formatter: '{b}: {c}'+unit+'\n{d}%'
                            }
                        },
                        data: newData
                    }]
                };

                drawEchart(name, echartOptions);

            },
            error: function () {
                paintFailed();
                console.warn('获取数据失败');
            }
        });
    }

    function getTrendAnalysis(name, deviceVarSns, period, queryTime, pfvSettings, inputShowType) {
        var queryType = 'MONTH';
        if(period == 'current_day') {
            queryType = 'DAY';
        } else if(period == 'current_year') {
            queryType = 'YEAR';
        } else if(period == 'normal') {
            queryType = 'NORMAL';
        }

        var showType = 'line';
        var boundaryGap = true;
        if(inputShowType != null && inputShowType != '') {
            showType = inputShowType;
        }
        if(showType == 'line') {
            boundaryGap = false;
        }

        ajax.get({
            url: '/devicevars/getstatisticalvalues',
            data: {
                sns: deviceVarSns.join(','),
                type: queryType,
                calcmethod: 'AVG',
                querytime: queryTime.substr(0,10) + 'T' + queryTime.substr(11,8) + '.000Z'
            },
            success: function (data) {
                if (!data || !data.length){
                    paintFailed();
                    return;
                }
                var times = [];
                for(var i in data[0].time_keys) {
                    var t = data[0].time_keys[i];
                    if(queryType == 'DAY' || queryType == 'NORMAL') {
                        times.push(t.substring(11, 16));
                    } else if(queryType == 'MONTH') {
                        times.push(t.substring(5, 10));
                    } else if(queryType == 'YEAR') {
                        times.push(t.substring(0, 7));
                    } else {
                        times.push(t);
                    }
                }

                var chartDatas = [];
                for(var j in data) {
                    chartDatas.push({name: data[j].name+' '+data[j].unit, type:showType, data: data[j].datas, yAxisIndex: 0});
                }

                var showPfvSetting = (period == 'current_day' || period == 'normal')&& (pfvSettings == 'pfv-settings-f' || pfvSettings == 'pfv-settings-r')
                drawEchart(name, getTrendAnalysisEchartOption(showPfvSetting, pfvSettings, times, chartDatas, boundaryGap));
            },
            error: function () {
                paintFailed();
                console.warn('获取数据失败');
            }
        });
    }

    function getTrendAnalysisEchartOption(showPfvSetting, pfvSettings, times, data, boundaryGap) {
        var yAxis =[
            {
                type: 'value'
            },{

            }];

        if(showPfvSetting) {
            var tempPfvSettings = pfvSettings == 'pfv-settings-f' ? pfvSettingsF : pfvSettingsR;
            if(tempPfvSettings != null) {
                yAxis[1]={
                    type: 'value'
                };

                //只支持 'DAY' 'NORMAL'
                var timesInt = [];
                for(var k in times) {
                    timesInt.push(60*parseInt(times[k].substr(0,2)) + parseInt(times[k].substr(3,5)));
                }

                /*
                [
                {
                    "starttime": "00:00",
                    "endtime": "23:59",
                    "charge": "6",
                    "pfv": ""
                }
                ]
                */
                for(var i=0; i<tempPfvSettings.length; i++){
                    var markAreaData = [];
                    var chargeData = [];

                    var tempStartTimeInt = 60*parseInt(tempPfvSettings[i].starttime.substr(0,2)) + parseInt(tempPfvSettings[i].starttime.substr(3,5));
                    var tempEndTimeInt = 60*parseInt(tempPfvSettings[i].endtime.substr(0,2)) + parseInt(tempPfvSettings[i].endtime.substr(3,5));
                    if(tempStartTimeInt >= tempEndTimeInt) {
                        continue;
                    }
                    var tempStartIndex = null;
                    var tempEndIndex = null;
                    for(var j=0; j<timesInt.length; j++) {
                        if(tempStartIndex != null && tempEndIndex != null) {
                            break;
                        }
                        if(tempStartIndex == null && timesInt[j] >= tempStartTimeInt) {
                            tempStartIndex = j;
                        }
                        if(tempEndIndex == null && timesInt[j] > tempEndTimeInt) {
                            tempEndIndex = j > 0 ? (j-1) : 0;
                        }
                        if(tempEndIndex == null && j==timesInt.length-1 && timesInt[j] <= tempEndTimeInt) {
                            tempEndIndex = j;
                        }
                    }

                    if(tempStartIndex == null || tempEndIndex == null || tempStartIndex >= tempEndIndex) {
                        continue;
                    }

                    var tempPfv = tempPfvSettings[i].pfv;
                    var tempCharge = tempPfvSettings[i].charge;
                    var tempName = '';
                    var tempColor = 'gray';
                    var tempLabelColor = 'gray';
                    if(tempPfv == 'p') {
                        tempName = '峰';
                        tempColor = 'rgba(193,35,35,0.2)';
                        tempLabelColor = 'rgba(193,35,35)';
                    } else if(tempPfv == 'f') {
                        tempName = '平';
                        tempColor = 'rgba(0,152,217,0.2)';
                        tempLabelColor = 'rgba(0,152,217)';
                    } else if(tempPfv == 'v') {
                        tempName = '谷';
                        tempColor = 'rgba(46,165,1,0.2)';
                        tempLabelColor = 'rgba(46,165,1)';
                    }

                    var tempAreaData = [{
                        name: tempName+'\n'+tempPfvSettings[i].charge+'元',
                        xAxis: tempStartIndex,
                        yAxis: 0
                    }, {
                        xAxis: tempEndIndex,
                        yAxis: tempPfvSettings[i].charge,
                    }];

                    chargeData.push(tempPfvSettings[i].charge*1.2);
                    markAreaData.push(tempAreaData);

                    var newDate = {
                        name: i,
                        yAxisIndex: 1,
                        type:'line',
                        symbolSize: 0,
                        itemStyle: {
                            normal: {
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
                            },
                            label: {
                                normal: {
                                    color: tempLabelColor
                                }
                            }
                        }
                    };

                    data.push(newDate);

                }
            }
        }

        var legendData = [];
        for(var i in data) {
            legendData.push(data[i].name);
        }

        return {
            tooltip: {
                trigger: 'axis',
                formatter: "{b} <br/>{a} : {c}",
            },
            legend: {
                data: legendData,
                bottom: -5,
                textStyle: {
                    fontSize: 10,
                    lineHeight: 14
                },
                pageIconSize: 10,
                itemWidth: 15,
                itemHeight: 10
            },
            grid: {
                top: 15,
                left: 4,
                right: 2,
                bottom: 25,
                containLabel: true
            },
            toolbox: {
                feature: {
                    saveAsImage: false
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: boundaryGap,
                data: times
            },
            yAxis: yAxis,
            color: ['#369FFF', '#F9CC13', '#F04863', '#12C1C1', '#8442E0', '#2FC15B'],
            series: data
        };
    }

    function getStationPfvSettings() {
        ajax.get({
            url: '/stations/' + $scope.sn,
            async: false,
            success: function (data) {
                if(data.pfv_settings_f && data.pfv_settings_f != '' && data.pfv_settings_f != '[]') {
                    pfvSettingsF = JSON.parse(data.pfv_settings_f);
                }
                if(data.pfv_settings_r && data.pfv_settings_r != '' && data.pfv_settings_r != '[]') {
                    pfvSettingsR = JSON.parse(data.pfv_settings_r);
                }
            },
            error: function(err) {
                console.log('获取站点信息失败 '+$scope.sn+err);
            }
        })
    }

    function getRatioPie(title, data, unit) {

        var echartOptions = {
            title: [],
            color: ['#F04863', '#F9CC13', '#369FFF', '#12C1C1', '#8442E0', '#2FC15B'],
            series: [{
                name: '2',
                type: 'pie',
                radius: ['25%', '60%'],
                label: {
                    normal: {
                    formatter: '{b}:\n{c}' + unit + '\n{d}%',
                    },
                },
                data: data,
                },
            ],
        };

        setTimeout(function(){drawEchart(title, echartOptions);}, 1000);

    }

    function drawEchart(name, config) {
        var id = 'chart__' + chartCount;
        if (chartCount === 1){
            $("#chartGroup").empty();
        }

        $('<div class="card-content">\
            <div class="mui-content-padded no-margin">\
            <span>'+ name +'</span>\
            <div class="chart" id="' + id + '"></div>\
            <div style="position: absolute;left:0;top:0;width:100%;height:100%;"></div>\
            </div>\
            </div>').prependTo($("#chartSlider"));
        echarts.init(document.getElementById(id)).setOption(config);
        chartCount += 1;
        paintSuccess();
    }

    //getDataList();
    $timeout(function () {
        getStationPfvSettings();
        getKanbanData();
    }, 500);

});