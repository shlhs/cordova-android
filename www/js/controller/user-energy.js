var g_pvf_label = {
    p: '峰',
    f: '平',
    v: '谷',
    s: '尖'
};
var g_pvf_colors = {
    'p': 'rgba(239, 150, 166, 1)',
    'v': 'rgba(138, 212, 199, 1)',
    'f': 'rgba(136, 169, 248, 1)',
    's': 'rgba(254,139,106, 1)',
};

function EnergyFuncApi(scope, ajax) {
    this.scope = scope;
    this.ajax = ajax;
}

// 获取变量的月电度趋势数据
EnergyFuncApi.prototype.getDegreeChargeTrend = function (sn, month, successCallback) {
    //  month：moment对象
    // successCallback(dataList, {monthDegree, monthCharge, avgPrice, todayDegree, todayCharge})
    function _thisMonthStatistics(data) {
        var today = moment().date();
        var todayData = data[data.length-1];
        var pageData = {};
        if (today === parseInt(todayData.time.substring(8, 10))) {
            pageData.todayDegree = todayData.allDegree;
            pageData.todayCharge = todayData.allCharge;
        }
        var monthDegree = 0;
        var monthCharge = 0;
        data.forEach(function (item) {
            if (item.allCharge) {
                monthCharge += item.allCharge;
            }
            if (item.allDegree) {
                monthDegree += item.allDegree;
            }
        });
        pageData.monthDegree = monthDegree.toFixed(1);
        pageData.monthCharge = monthCharge.toFixed(1);
        pageData.avgPrice = monthDegree ? (monthCharge/monthDegree).toFixed(2) : '-';
        return pageData;
    }
    var self = this;
    this.ajax.get({
        url: '/devicevars/getelectricaldegreeandcharge/trend',
        data: {
            sns: sn,
            start_date: month.format('YYYY-MM-01'),
            end_date: month.endOf('month').format('YYYY-MM-DD')
        },
        success: function (data) {
            var degreeList = data[sn];
            if (degreeList) {
                var statistics = _thisMonthStatistics(degreeList);
                successCallback(degreeList, statistics);
            } else {
                successCallback([], {});
            }
            self.scope.$apply();
        },
        error: function () {
            self.scope.$apply();
            successCallback([], {});
        }
    })
};

// 本月平均电度电价曲线
EnergyFuncApi.prototype.paintAvgPriceTrend = function (chartId, data) {

    var times = [];
    var yAxis = [];
    var dataIndex = 0;
    var lastDay = moment().endOf('month');
    for (var i=1; i<=lastDay.date(); i++) {
        times.push(i + '日');
        if (dataIndex < data.length) {
            var dataItem = data[dataIndex];
            var dataDay = parseInt(dataItem.time.substring(8, 10));
            if (dataDay === i) {
                dataIndex += 1;
                var avgPrice = dataItem.allDegree ? parseFloat((dataItem.allCharge/dataItem.allDegree).toFixed(2)) : '-';
                yAxis.push(avgPrice);
                continue;
            }
        }
        yAxis.push('-');
    }
    var option = {
        grid: {
            top: 15,
            left: 40,
            right: 10,
            bottom: 25
        },
        tooltip: {
            trigger: 'axis',
            formatter: '{b0}: {c0}元'
        },
        xAxis: {
            type: 'category',
            data: times,
            axisLabel: {
                fontSize: 11,
                color: '#6b6b6b'
            },
            axisLine: {
                lineStyle: {
                    color: '#E7EAED'
                }
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                fontSize: 11,
                color: '#6b6b6b'
            },
            axisLine: {
                lineStyle: {
                    color: '#E7EAED'
                }
            },
            splitLine: {
                lineStyle: {
                    color: '#E7EAED'
                }
            }
        },
        series: [{
            data: yAxis,
            type: 'line',
            symbolSize: 0,
            itemStyle: {
                color: '#8D6ADD'
            }
        }]
    };
    echarts.init(document.getElementById(chartId)).setOption(option);
};


// 能源管理基础控制，主要用于获取所有监测点，并显示设备显示页面
app.controller('EnergyBaseCtrl', function ($scope, ajax, platformService, routerService, varDataService) {
    $scope.stationSn = GetQueryString('sn');
    $scope.stationName = GetQueryString('name');
    $scope.devices = [];
    $scope.currentDevice = {
        sn: GetQueryString('device_sn'),
        name: GetQueryString("device_name"),
        vc: GetQueryString('vc') || null
    };

    $scope.contentHeight = window.screen.height - 60;
    $scope.isLoading = true;
    $scope.selectedDate = moment();
    $scope.showDateName = $scope.selectedDate.format('YYYY.MM');
    $scope.isCurrentMonth = true;       // 所选月份是否当前月份
    var datePicker = null;
    var energyApi = new EnergyFuncApi($scope, ajax, platformService.getDeviceMgmtHost());
    var siteChangeFunc = function (stationSn, stationName) {};
    var deviceChangeFunc = function (device) {};    //
    var dateChangeFunc = function (date) {};

    $scope.$on('onSiteChange', function (event, stationSn, stationName) {

        $scope.stationSn = stationSn;
        $scope.stationName = stationName;
        if (stationSn) {
            if (siteChangeFunc) {
                siteChangeFunc(stationSn, stationName);
            }
            // 获取站点电费配置
            varDataService.getStationElectricConfig(stationSn, moment(), function (config) {
                if (config) {
                    setStorageItem(stationSn + '-electric_config', JSON.stringify(config));
                }
            });
        } else {
            $scope.isLoading = false;
        }
    });

    $scope.getThisMonthElectricConfig = function () {       // 获取当前站点本月的电费配置
        if ($scope.stationSn) {
            var configStr = getStorageItem($scope.stationSn + '-electric_config');
            if (configStr) {
                return JSON.parse(configStr);
            }
        }
        return null;
    };

    $scope.onChangeDevice = function (device) {
        $scope.currentDevice = device;
        if (deviceChangeFunc) {
            deviceChangeFunc(device);
        }
    };

    $scope.registerStationChangeListener = function (func) {        // 注册站点切换监听器
        siteChangeFunc = func;
    };

    $scope.registerDeviceChangeListener = function (func) {         // 注册设备切换监听器
        deviceChangeFunc = func;
    };

    $scope.registerDateChangeListener = function (func) {
        dateChangeFunc = func;
    };

    $scope.setIsLoading = function (loading) {
        $scope.isLoading = loading;
    };

    $scope.openDeviceSelector = function () {
        // 打开设备选择页面
        routerService.openPage($scope, '/templates/energy/device-select-page.html',
            {treeData: $scope.devices ? $scope.devices[0].children : [], onSelect: $scope.onChangeDevice, selectedSn: $scope.currentDevice.sn});
    };

    function findFirstDevice(data) {
        if (!data || !data.length) {
            return null;
        }
        for (var i=0; i<data.length; i++) {
            if (!data[i].is_group) {
                return data[i];
            }
            if (data[i].children) {
                var foundDevice = findFirstDevice(data[i].children);
                if (foundDevice) {
                    return foundDevice;
                }
            }
        }
        return null;
    }

    $scope.getMonitorDevices = function(stationSn, callback) {
        if (!stationSn) {
            return;
        }
        $scope.isLoading = true;
        $scope.currentMonthData = {};
        ajax.get({
            url: '/stations/' + stationSn + '/devicetree',
            success: function (data) {
                $scope.devices = formatToTreeData(data);
                // 找到第一个设备
                $scope.currentDevice = findFirstDevice($scope.devices);
                $scope.isLoading = false;
                if ($scope.currentDevice) {
                    if (callback) {
                        callback($scope.currentDevice);
                    }
                }
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $scope.$apply();
            }
        })
    };

    function initDatePicker() {
        if (document.getElementById('datePicker')) {
            document.getElementById('datePicker').addEventListener('tap', function() {
                if(datePicker) {
                    datePicker.show(function (rs) {
                        onMonthChange(rs.text);
                        $scope.$apply();
                    });
                } else {
                    var options = {type: 'date'};
                    datePicker = new mui.DtPicker(options);
                    datePicker.show(function(rs) {
                        onMonthChange(rs.text);
                        $scope.$apply();
                    });
                }
            }, false);
        }
    }

    function onMonthChange(text) {
        $scope.selectedDate = moment(text);
        $scope.showDateName = $scope.selectedDate.format('YYYY.MM');
        $scope.isCurrentMonth = $scope.showDateName === moment().format('YYYY.MM');
        if (dateChangeFunc) {
            dateChangeFunc($scope.selectedDate);
        }
    }

    $scope.getMonitorDevices($scope.stationSn);

    $scope.$on('$destroy', function (event) {
        if (datePicker) {
            datePicker.dispose();
            datePicker = null;
        }
    });

    initDatePicker();
});

// 能源管理
app.controller('EnergyHomeCtrl', function ($scope, ajax, platformService, varDataService) {

    $scope.devices = [];
    $scope.stationName = null;
    $scope.currentDevice = null;
    $scope.selectedApps = defaultEnergyMenus;
    $scope.degreeVarSn = null;     // 设备的电度变量sn
    $scope.currentMonthData = {};
    var energyApi = new EnergyFuncApi($scope, ajax, platformService.getDeviceMgmtHost());

    $scope.registerStationChangeListener(function (stationSn, stationName) {
        $scope.getMonitorDevices(stationSn, function (device) {
            if (device) {
                $scope.setIsLoading(true);
                refreshForDeviceChange(device);
            }
        });
    });

    $scope.registerDeviceChangeListener(function (device) {
        refreshForDeviceChange(device);
    });

    function refreshForDeviceChange(device) {
        $scope.currentMonthData = {};
        $scope.currentDevice = device;
        if (!device) {
            return;
        }
        $scope.degreeVarSn = null;
        varDataService.getVarsOfDevice(device.sn, ['EPf'], function (varMap) {
            if (varMap.EPf) {
                $scope.degreeVarSn = varMap.EPf.sn;
                energyApi.getDegreeChargeTrend($scope.degreeVarSn, moment(), function (degreeList, statistics) {
                    $scope.currentMonthData = statistics;
                    energyApi.paintAvgPriceTrend('main_chart', degreeList);
                    calcAvgPriceChange();
                });
                getLastMonthDegree($scope.degreeVarSn);
            } else {
                $scope.degreeVarSn = null;
            }
            $scope.setIsLoading(false);
        });
    }

    function getLastMonthDegree(sn) {       // 获取上月的电费统计信息
        ajax.get({
            url: '/devicevars/getelectricaldegreeandcharge',
            data: {
                sns: sn,
                type: 'MONTH',
                querytime: moment().subtract(1, 'M').format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z'
            },
            success: function (data) {
                if (data && data.length) {
                    $scope.lastMonthPrice = data[0].allCharge/data[0].allDegree;
                    calcAvgPriceChange();
                    $scope.$apply();
                }
            }
        })
    }

    function calcAvgPriceChange() {
        if ($scope.lastMonthPrice !== null && $scope.currentMonthData.avgPrice) {
            $scope.currentMonthData.priceChangeRatio = parseFloat((($scope.currentMonthData.avgPrice - $scope.lastMonthPrice)/$scope.lastMonthPrice*100).toFixed(1));
        }
    }
});


// 用电概况
app.controller('EnergyOverviewCtrl', function ($scope, ajax, platformService, varDataService) {
    $scope.statisticsObj = {};

    $scope.degreeVarSn = null;
    var energyApi = new EnergyFuncApi($scope, ajax, platformService.getDeviceMgmtHost());

    $scope.registerDateChangeListener(function (date) {
        refreshData($scope.currentDevice);
    });

    $scope.registerDeviceChangeListener(function (device) {
        refreshData(device);
    });
    
    function refreshData(device) {
        echarts.dispose(document.getElementById('charge_chart'));
        echarts.dispose(document.getElementById('price_chart'));
        echarts.dispose(document.getElementById('load_chart'));
        varDataService.getVarsOfDevice(device.sn, ['EPf', 'P', 'EQf'], function (varMap) {
            var degreeVar = varMap.EPf;
            energyApi.getDegreeChargeTrend(degreeVar.sn, $scope.selectedDate, function (degreeList, statisticsObj) {
                energyApi.paintAvgPriceTrend('price_chart', degreeList);
                paintPfvChargeTrend(degreeList);
                Object.assign($scope.statisticsObj, statisticsObj);
            });
            calcCosAndLoad(varMap);
            paintMaxLoadTrend(varMap);
        });
    }

    function paintPfvChargeTrend(degreeList) {
        // 峰谷平电费趋势
        // 获取峰谷平的数据
        var times = [];
        var chargeMap = {f: [], p: [], v: []};
        var dataIndex = 0;
        var lastDay = $scope.selectedDate.endOf('month');
        for (var i=1; i<=lastDay.date(); i++) {
            times.push(i + '日');
            if (dataIndex < degreeList.length) {
                var dataItem = degreeList[dataIndex];
                var dataDay = parseInt(dataItem.time.substring(8, 10));
                if (dataDay === i) {
                    dataIndex += 1;
                    Object.keys(chargeMap).forEach(function (key) {
                        chargeMap[key].push(dataItem[key+'Charge']);
                    });
                    continue;
                }
            }
            Object.keys(chargeMap).forEach(function (key) {
                chargeMap[key].push(null);
            });
        }
        var series = [];
        var colors = [];
        ['p', 'f', 'v'].forEach(function (key) {
            series.push({
                name: g_pvf_label[key],
                type:'bar',
                stack: '总量',
                barMaxWidth: "20px",
                barGap: 0,
                data: chargeMap[key],
            });
            colors.push(g_pvf_colors[key]);
        });
        var option = {
            backgroundColor:'#ffffff',
            legend: {
                data: ['峰', '平', '谷'],
                right: 20,
                top: 0,
                textStyle: {
                    color: '#666666',
                    fontSize: 10,
                },
                itemWidth: 14,
                itemHeight: 9
            },
            tooltip: {
                trigger: 'axis',
            },
            grid: {
                top: 25,
                left: 45,
                right: 15,
                bottom: 20,
            },
            xAxis: {
                type: 'category',
                data: times,
                axisLabel: {
                    fontSize: 11,
                    color: '#6b6b6b'
                },
                axisLine: {
                    lineStyle: {
                        color: '#E7EAED'
                    }
                },
            },
            yAxis: {
                type: 'value',
                name: 'kWh',
                nameGap: 10,
                nameTextStyle: {
                    color: '#6b6b6b'
                },
                axisLabel: {
                    fontSize: 11,
                    color: '#6b6b6b'
                },
                axisLine: {
                    lineStyle: {
                        color: '#E7EAED'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#E7EAED'
                    }
                }
            },
            color: colors,
            series: series,
        };
        echarts.init(document.getElementById('charge_chart')).setOption(option);
    }

    function calcCosAndLoad(varMap) {
        // 计算功率因素和负荷，功率因素=月总无功功率/月总有功功率
        var codes = ['P', 'EQf', 'EPf'];
        var sns = [];
        var epfSn = null, eqfSn = null, pSn = null;
        codes.forEach(function (code) {
            if (varMap[code]) {
                var sn = varMap[code].sn;
                if (code === 'EQf') {
                    eqfSn = sn;
                } else if (code === 'EPf') {
                    epfSn = sn;
                } else {
                    pSn = sn;
                }
                sns.push(sn);
            }
        });
        Object.assign($scope.statisticsObj, {
            cos: '-',
            maxDemand: '-',
            avgLoad: '-',
            maxLoad: '-'
        });
        if (!sns.length) {
            return;
        }
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/summarized',
            data: {
                sns: sns.join(','),
                startTime: $scope.selectedDate.format('YYYY-MM') + '-01 00:00:00.000',
                endTime: $scope.selectedDate.endOf('month').format('YYYY-MM-DD') + ' 00:00:00.000',
                calcmethod: 'MAX,MIN,AVG'
            },
            success: function (data) {
                var qValue = 0, pValue = 0;
                data.forEach(function (item) {
                    if (item.sn === pSn) {
                        $scope.statisticsObj.maxDemand = item.max_value_data === null ? '-' : item.max_value_data + 'kW';
                        if ($scope.currentDevice.vc) {
                            if (item.avg_value_data !== null) {
                                $scope.statisticsObj.avgLoad = (item.avg_value_data/$scope.currentDevice.vc*100).toFixed(1) + '%';
                            }
                            if (item.max_value_data !== null) {
                                $scope.statisticsObj.maxLoad = (item.max_value_data/$scope.currentDevice.vc*100).toFixed(1) + '%';
                            }
                        }
                    }
                    if (item.max_value_data !== null && item.min_value_data !== null) {
                        var value = item.max_value_data - item.min_value_data;
                        if (item.sn === epfSn) {
                            pValue = value;
                        } else if (item.sn === eqfSn) {
                            qValue = value;
                        }
                    }

                });
                if (pValue) {
                    var s = Math.sqrt(Math.pow(pValue, 2) + Math.pow(qValue, 2));
                    $scope.statisticsObj.cos = (pValue/s).toFixed(2);
                }
                $scope.$apply();
            }
        })
    }

    function paintMaxLoadTrend(varMap) {
        if (!varMap.P || !$scope.currentDevice.vc) {
            return;
        }
        var startTime = $scope.selectedDate.format('YYYY-MM-01 00:00:00.000');
        var endTime = $scope.selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59.000');
        var vc = $scope.currentDevice.vc;
        varDataService.getHistoryTrend([varMap.P.sn], startTime, endTime, 'DAY', 'MAX', function (dataList) {
                if (dataList.length) {
                    var data = dataList[0];
                    var yAxis = [];
                    var times = [];
                    data.time_keys.forEach(function (t) {
                        times.push(t.substring(8, 10) + '日');
                    });
                    data.datas.forEach(function (d) {
                        if (d === null) {
                            yAxis.push('-');
                        } else {
                            yAxis.push((d/vc*100).toFixed(1));
                        }
                    });
                    var option = {
                        grid: {
                            top: 15,
                            left: 40,
                            right: 10,
                            bottom: 25
                        },
                        tooltip: {
                            trigger: 'axis',
                            formatter: '{b0}: {c0}%'
                        },
                        xAxis: {
                            type: 'category',
                            data: times,
                            axisLabel: {
                                fontSize: 11,
                                color: '#6b6b6b'
                            },
                            axisLine: {
                                lineStyle: {
                                    color: '#E7EAED'
                                }
                            }
                        },
                        yAxis: {
                            type: 'value',
                            axisLabel: {
                                fontSize: 11,
                                color: '#6b6b6b',
                                formatter: '{value}%'
                            },
                            axisLine: {
                                lineStyle: {
                                    color: '#E7EAED'
                                }
                            },
                            splitLine: {
                                lineStyle: {
                                    color: '#E7EAED'
                                }
                            }
                        },
                        series: [{
                            data: yAxis,
                            type: 'line',
                            symbolSize: 0,
                            itemStyle: {
                                color: '#8D6ADD'
                            }
                        }]
                    };
                    echarts.init(document.getElementById('load_chart')).setOption(option);
                }
            }
        );
    }

    refreshData($scope.currentDevice);

});

// 电费分析
app.controller('EnergyCostAnalysisCtrl', function ($scope, ajax, platformService, varDataService) {
    $scope.degreeTexts = [];
    $scope.chargeTexts = [];
    $scope.degreeVarSn = null;
    var energyApi = new EnergyFuncApi($scope, ajax, platformService.getDeviceMgmtHost());

    $scope.registerDateChangeListener(function (date) {
        refreshData($scope.currentDevice);
    });

    $scope.registerDeviceChangeListener(function (device) {
        refreshData(device);
    });

    function refreshData(device) {
        $scope.charge = {
            degree: '-',    // 电度电费
            capacity: '-',  // 基本电费
            cos: '-',       // 力率电费
            addition: '-',  // 加征电费
        };
        echarts.dispose(document.getElementById('chart1'));
        echarts.dispose(document.getElementById('chart2'));
        varDataService.getVarsOfDevice(device.sn, ['EPf', 'P', 'EQf'], function (varMap) {
            var degreeVar = varMap.EPf;
            if (degreeVar) {
                $scope.degreeVarSn = degreeVar.sn;
                $scope.chargeTexts = [];
                $scope.degreeTexts = [];
                varDataService.getDegreeSummary(degreeVar.sn, $scope.selectedDate, function (data) {
                    if (data) {
                        var keys = ['s', 'p', 'v', 'f'];
                        var degreeMap = {};
                        var chargeMap = {};
                        var degreeTexts = [];
                        var chargeTexts = [];
                        if (data.allCharge) {
                            keys.forEach(function (key) {
                                var degree = data[key+'Degree'];
                                var charge = data[key+'Charge'];
                                degreeMap[key] = degree;
                                chargeMap[key] = charge;
                                if (degree) {
                                    degreeTexts.push({
                                        label: g_pvf_label[key],
                                        value: degree,
                                        ratio: (degree/data.allDegree*100).toFixed(2),
                                        color: g_pvf_colors[key]
                                    });
                                }
                                if (charge) {
                                    chargeTexts.push({
                                        label: g_pvf_label[key],
                                        value: charge,
                                        ratio: (charge/data.allCharge*100).toFixed(2),
                                        color: g_pvf_colors[key]
                                    });
                                }
                            });
                            $scope.degreeTexts = degreeTexts;
                            $scope.chargeTexts = chargeTexts;
                            paintPfvPie(degreeMap, 'kWh', 'chart1');
                            paintPfvPie(chargeMap, '元', 'chart2');
                        }
                    }
                });
            } else {
                $scope.degreeVarSn = null;
            }
        });
    }
    
    function paintPfvPie(data, unit, chartId) {
        var seriesData = [];
        var colors = [];
        var total = 0;
        var legendData = [];
        Object.keys(data).forEach(function (key) {
            seriesData.push({
                name: g_pvf_label[key],
                value: data[key],
                selected: false,
            });
            total += data[key];
            colors.push(g_pvf_colors[key]);
            legendData.push(g_pvf_label[key]);
        });
        total = parseFloat(total.toFixed(1));
        var option = {
            title: {
                text: total + (unit ? '\n' + unit : ''),
                textStyle: {
                    fontSize: 13,
                    color: '#666666',
                    align: 'center'
                },
                x: 'center',
                y: 'center',
            },
            tooltip: {
                show: false,
                trigger: 'none',
                triggerOn: 'none',
                formatter: '{b} : {c} ({d}%)',
            },
            backgroundColor:'#ffffff',
            grid: {
                top: '20%',
                left: 0,
                right: 0,
                bottom: 0,
                containLabel: true,
            },
            color: colors,
            series: [
                {
                    avoidLabelOverlap: false,
                    hoverAnimation: true, //设置饼图默认的展开样式
                    radius: ['60%', '80%'],
                    center: ['50%', '50%'],
                    name: 'pie',
                    type: 'pie',
                    selectedMode: 'single',
                    clockwise: true,
                    startAngle: 90,
                    data: seriesData,
                    itemStyle: {
                        emphasis: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)',
                        },
                    },
                    label: {
                        normal: {
                            show: false,
                        },
                    },
                    labelLine: {
                        normal: {
                            show: false
                        }
                    },
                },
            ],
        };
        echarts.init(document.getElementById(chartId)).setOption(option);
    }

    refreshData($scope.currentDevice);

});

app.controller('EnergyLoadAnalysisCtrl', function ($scope, ajax, platformService) {
    $scope.capacityCharge = '-';
    $scope.maxLoad = '-';
    $scope.maxLoadRatio = '-';
});