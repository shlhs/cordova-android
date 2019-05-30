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

function EnergyFuncApi(scope, varDataService) {
    this.scope = scope;
    this.varDataApi = varDataService;
}

// 获取数据并计算某个设备某月的电费数据
EnergyFuncApi.prototype.fetchAndCalcCharges = function (stationSn, electricConfig, device, month, callback) {
    /**
     * callback :
     {
        allDegree: float,           // 总电度
        degreeCharge: float,       // 电度电费
        additionCharge: float,           // 加征电费
        capacityMethod: '最大需量法',    // 基本电费的计算方法
        capacityDemandCharge: float,    // 按需量计算的电费
        capacityVcCharge: float,        // 按容量计算的电费
        cosCharge: float,                 // 力调电费
        cos: float,                 // 功率因素
        maxDemand: float,           // 最大需量
        allCharge: float,               // 总电费
        avgDegreePrice: float,      // 平均电度电费
        avgPrice: float,            // 平均电费
        chargeDetail: {},           // 电度电费的详情
        varMap: {}
    }
     */
    if (!device || !device.sn) {
        return null;
    }
    var varDataApi = this.varDataApi;

    var codes = ['P', 'EQf', 'EPf'];
    var self = this;
    // 先取站点的电费配置
    var returnObj = {};
    // 取需要的变量
    varDataApi.getVarsOfDevice(device.sn, codes, function (varMap) {
        if (!varMap.EPf) {
            // 如果不存在电度变量，则直接返回null
            callback(returnObj);
            return;
        }
        returnObj.varMap = varMap;
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
        if (!sns.length) {
            callback(returnObj);
            return;
        }
        // 获取电度电费统计值
        varDataApi.getDegreeSummary(varMap.EPf.sn, month, function (degreeData) {
            if (degreeData && degreeData.allCharge) {
                Object.assign(returnObj, {
                    degreeDetail: degreeData,
                    allDegree: degreeData.allDegree,
                    avgDegreePrice: parseFloat((degreeData.allCharge / degreeData.allDegree).toFixed(2))
                });
                // 计算功率因素、最大需量
                var startDate = moment(month.format('YYYY-MM-01'));
                varDataApi.getVarSummarizedData(sns, startDate.format('YYYY-MM-01 00:00:00.000'), month.endOf('month').format('YYYY-MM-DD 23:59:59.000'), ['MAX', 'MIN'], function (dataList) {
                    // 通过有功电度、无功电度计算功率因数
                    var qValue = 0, pValue = 0;
                    var cos = null, maxDemand = null;
                    dataList.forEach(function (item) {
                        if (item.sn === pSn) {
                            maxDemand = item.max_value_data;
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
                        cos = parseFloat((pValue/s).toFixed(2));
                    }
                    // 计算总电费
                    var result = self.calcFullCharge(electricConfig, device.vc, degreeData.allDegree, degreeData.allCharge, cos, maxDemand);

                    Object.assign(returnObj, result, {
                        cos: cos,
                        maxDemand: maxDemand,
                        avgPrice: parseFloat((result.allCharge/degreeData.allDegree).toFixed(2))
                    });
                    callback(returnObj);
                });
            } else {
                callback(returnObj);
            }
        });
    });
};

EnergyFuncApi.prototype.statisticMonthFromChargeTrend = function (degreeList) {
    var today = moment().date();
    var todayData = degreeList[degreeList.length-1];
    var pageData = {};
    if (today === parseInt(todayData.time.substring(8, 10))) {
        pageData.todayDegree = todayData.allDegree;
        pageData.todayCharge = todayData.allCharge;
    }
    var monthDegree = 0;
    var monthCharge = 0;
    degreeList.forEach(function (item) {
        if (item.allCharge) {
            monthCharge += item.allCharge;
        }
        if (item.allDegree) {
            monthDegree += item.allDegree;
        }
    });
    pageData.monthDegree = parseFloat(monthDegree.toFixed(1));
    pageData.monthCharge = parseFloat(monthCharge.toFixed(1));
    pageData.avgPrice = monthDegree ? parseFloat((monthCharge/monthDegree).toFixed(2)) : null;
    return pageData;
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

// 计算出电度电费以外的所有电费
EnergyFuncApi.prototype.calcFullCharge = function (config, vc, allDegree, degreeCharge, cos, maxDemand) {
    /**
     * config: 站点电费配置
     * vc: 设备额定容量
     * allDegree: 电度总量
     * degreeCharge: 电度电费
     * cos：月度功率因数
     * maxDemand: 月度最大需量
     */
    var result = {
        degreeCharge: degreeCharge,       // 电度电费
        additionCharge: null,           // 加征电费
        capacityMethod: '最大需量法',    // 基本电费的计算方法
        capacityCharge: null,           // 基本电费
        capacityDemandCharge: null,    // 按需量计算的电费
        capacityVcCharge: null,        // 按容量计算的电费
        cosCharge: null,                 // 力调电费
        allCharge: degreeCharge
    };
    if (!config) {
        return result;
    }
    // 加征收电费
    if (config.addition_charge) {
      if (allDegree !== null && allDegree !== undefined) {
          result.additionCharge = 0;
          var items = JSON.parse(config.addition_charge).items;
          if (items) {
              var total = 0;
              items.forEach(function (item) {
                  total += parseFloat(item.charge);
              });
              result.additionCharge = parseFloat((allDegree * total).toFixed(2));
          }
      }
    }

    // 基本电费
    if (config.capacity_charge) {
        var obj = JSON.parse(config.capacity_charge);
        var capacityResult = this.calcCapacityCharge(obj, vc, maxDemand);
        Object.assign(result, capacityResult);
    }

    // 力调电费
    if (config.cos_charge) {
        var obj = JSON.parse(config.cos_charge);
        if (obj.normal_cos) {
            var cosRatio = this.getCosChargeRatio(obj.normal_cos, cos);
            var capacityCharge = result.capacityCharge;
            if (degreeCharge && cosRatio !== null) {
                var baseCharge = capacityCharge ? (degreeCharge + capacityCharge) : degreeCharge;
                result.cosCharge = parseFloat((baseCharge * cosRatio / 100).toFixed(2));
            }
        }
    }
    if (degreeCharge !== null && degreeCharge !== undefined) {
        var total = degreeCharge;
        if (result.additionCharge) {
            total += result.additionCharge;
        }
        if (result.capacityCharge) {
            total += result.capacityCharge;
        }
        if (result.cosCharge) {
            total += result.cosCharge;
        }
        Object.assign(result, {
            degreeCharge: degreeCharge,
            allCharge: parseFloat(total.toFixed(2))
        });
    }
    return result;
};

// 计算基本电费
EnergyFuncApi.prototype.calcCapacityCharge = function (capacityConfig, vc, maxDemand) {
    if (!capacityConfig) {
        return null;
    }
    var result = {};
    if (capacityConfig.normal_capacity && capacityConfig.capacity_price && capacityConfig.capacity_threshold && capacityConfig.capacity_multiple) {
        var threshhold = capacityConfig.normal_capacity * (1 + capacityConfig.capacity_threshold);
        var capacity = capacityConfig.normal_capacity;
        if (maxDemand > threshhold) {
            // 默认超过5%部分按2倍计算
            capacity = threshhold + (maxDemand - threshhold) * capacityConfig.capacity_multiple;
        }
        result.capacityDemandCharge = parseFloat((capacity * capacityConfig.capacity_price).toFixed(2));
    }
    if (capacityConfig.transformer_price && vc) {
        result.capacityVcCharge = parseFloat((vc * capacityConfig.transformer_price).toFixed(2));
    }
    result.capacityMethod = capacityConfig.method;
    result.capacityCharge = result.capacityMethod === '最大需量法' ? result.capacityDemandCharge : result.capacityVcCharge;
    return result;
};

// 计算力调电费
EnergyFuncApi.prototype.getCosChargeRatio = function (baseCos, cos) {

    function _subtractRatio() {
        if (baseCos === 0.90) {
            if (cos >= 0.95) {
                return -0.75;
            }
            return -(cos-baseCos) * 100 * 0.15;     // 每增0.01，减少0.15%
        }
        if (baseCos === 0.85) {
            if (cos >= 0.94) {
                return -0.75;
            }
            if (cos <= 0.9) {
                return -(cos-baseCos) * 100 * 0.1;
            }
            return -(cos - 0.9) * 100 * 0.15 - 0.5;
        }
        if (baseCos === 0.8) {
            if (cos >= 0.92) {
                return -1.3;
            }
            if (cos === 0.91) {
                return -1.15;
            }
            return -(cos-baseCos) * 100 * 0.1;
        }
    }

    function _addRatio() {
        var separate1 = 0.70;
        var separate2 = 0.64;
        if (baseCos === 0.85) {
            separate1 = 0.65;
            separate2 = 0.59;
        } else if (baseCos === 0.8) {
            separate1 = 0.6;
            separate2 = 0.54;
        }
        if (cos >= separate1) {
            return (baseCos-cos) * 100 * 0.5;
        }
        if (cos > separate2) {
            return (separate1 - cos) * 100 + 10;
        }
        return (separate2 - cos) * 100 * 2 + 15;
    }
    // baseCos：功率因数标准值，cos：实际的功率因数
    if (!baseCos || !cos) {
        return null;
    }
    baseCos = parseFloat(baseCos);
    cos = parseFloat(cos.toFixed(2));
    if (cos >= baseCos) {
        return _subtractRatio();
    }
    return _addRatio();
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
    $scope.chargesData = {};            // 设备总电费数据
    $scope.isCurrentMonth = true;       // 所选月份是否当前月份
    var datePicker = null;
    var energyApi = new EnergyFuncApi($scope, varDataService);
    var siteChangeFunc = function (stationSn, stationName) {};
    var deviceChangeFunc = function (device) {};    //
    var dateChangeFunc = function (date) {};
    var stationElectricConfig = null;

    $scope.$on('onSiteChange', function (event, stationSn, stationName) {

        $scope.stationSn = stationSn;
        $scope.stationName = stationName;
        if (stationSn) {
            onSiteChange(stationSn, stationName);
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

    function onSiteChange(stationSn, stationName) {
        if (!stationSn) {
            return;
        }
        $scope.isLoading = true;
        // 获取站点电费配置
        varDataService.getStationElectricConfig(stationSn, $scope.selectedDate, function (config) {
            if (config) {
                stationElectricConfig = config;
                setStorageItem(stationSn + '-electric_config', JSON.stringify(config));
            }
            if (siteChangeFunc) {
                siteChangeFunc(stationSn, stationName);
            }
        });
    }

    $scope.onChangeDevice = function (device) {
        $scope.currentDevice = device;
        if (device) {
            energyApi.fetchAndCalcCharges($scope.stationSn, stationElectricConfig, device, $scope.selectedDate, function (result) {
                $scope.chargesData = result;
                $scope.$apply();
            });
            if (deviceChangeFunc) {
                deviceChangeFunc(device);
            }
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

    // 设置设备本月默认电费数据
    $scope.setDefaultDeviceDegreeData = function (degreeData) {
        setStorageItem($scope.currentDevice.sn + '-degree', JSON.stringify(degreeData));
    };

    // 获取设备本月默认电费数据
    $scope.getDefaultDeviceDegreeData = function (deviceSn) {
        var str = getStorageItem(deviceSn + '-degree');
        if (str) {
            return JSON.parse(str);
        }
        return {};
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

    $scope.selectedApps = defaultEnergyMenus;
    $scope.degreeVarSn = null;     // 设备的电度变量sn
    $scope.currentMonthData = {};
    var energyApi = new EnergyFuncApi($scope, varDataService);

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

        // 重新计算电费信息
        energyApi.fetchAndCalcCharges($scope.stationSn, $scope.getThisMonthElectricConfig(), device, $scope.selectedDate, function (degreeData) {
            if (degreeData) {
                Object.assign($scope.currentMonthData, degreeData);
                $scope.setDefaultDeviceDegreeData(degreeData);      // 默认保存到本地
            }
            calcAvgPriceChange();
        });
        $scope.degreeVarSn = null;

        varDataService.getVarsOfDevice(device.sn, ['EPf'], function (varMap) {
            if (varMap.EPf) {
                $scope.degreeVarSn = varMap.EPf.sn;
                // 获取每日电度数据
                varDataService.getDegreeChargeTrend($scope.degreeVarSn, moment(), function (degreeList) {
                    energyApi.paintAvgPriceTrend('main_chart', degreeList);
                    if (degreeList.length) {
                        // $scope.currentMonthData = energyApi.statisticMonthFromChargeTrend(degreeList);
                        // 获取今日电度电费
                        var lastData = degreeList[degreeList.length-1];
                        if (lastData.time.substring(8, 10) === moment().format('DD')) {
                            Object.assign($scope.currentMonthData, {
                                todayDegree: lastData.allDegree,
                                todayCharge: lastData.allCharge
                            });
                        }
                    }
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
        if ($scope.lastMonthPrice !== null && $scope.currentMonthData.avgDegreePrice) {
            $scope.currentMonthData.priceChangeRatio = parseFloat((($scope.currentMonthData.avgDegreePrice - $scope.lastMonthPrice)/$scope.lastMonthPrice*100).toFixed(1));
        }
    }
});

// 用电概况
app.controller('EnergyOverviewCtrl', function ($scope, ajax, platformService, varDataService) {
    $scope.statisticsObj = $scope.getDefaultDeviceDegreeData($scope.currentDevice.sn);
    var electricConfig = $scope.getThisMonthElectricConfig();
    $scope.charges = {};

    $scope.degreeVarSn = null;
    var energyApi = new EnergyFuncApi($scope, varDataService);

    $scope.registerDateChangeListener(function (date) {
        // 日期变更后，重新读取电费配置
        varDataService.getStationElectricConfig($scope.stationSn, date, function (config) {
            $scope.statisticsObj = {};
            electricConfig = config;
            refreshData($scope.currentDevice);
        });
    });

    $scope.registerDeviceChangeListener(function (device) {
        $scope.statisticsObj = {};
        refreshData(device);
    });
    
    function refreshData(device) {
        echarts.dispose(document.getElementById('charge_chart'));
        echarts.dispose(document.getElementById('price_chart'));
        echarts.dispose(document.getElementById('load_chart'));
        energyApi.fetchAndCalcCharges($scope.stationSn, electricConfig, $scope.currentDevice, $scope.selectedDate, function (degreeData) {
            Object.assign($scope.statisticsObj, degreeData);
            $scope.$apply();
        });
        varDataService.getVarsOfDevice(device.sn, ['EPf', 'P', 'EQf'], function (varMap) {
            var degreeVar = varMap.EPf;
            varDataService.getDegreeChargeTrend(degreeVar.sn, $scope.selectedDate, function (degreeList) {
                energyApi.paintAvgPriceTrend('price_chart', degreeList);
                paintPfvChargeTrend(degreeList);
                if (degreeList.length) {
                    var statistics = energyApi.statisticMonthFromChargeTrend(degreeList);
                    Object.assign($scope.statisticsObj, statistics);
                }
            });
            calcCosAndLoad(varMap);
            paintMaxLoadTrend(varMap);
            $scope.$apply();
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
        if (!varMap.P) {
            return;
        }
        varDataService.getVarSummarizedData([varMap.P.sn], $scope.selectedDate.format('YYYY-MM-01 00:00:00.000'), $scope.selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59.000'), ['MAX', 'AVG'], function (dataList) {
            var item = dataList[0];
            $scope.statisticsObj.maxDemand = item.max_value_data === null ? '-' : item.max_value_data + 'kW';
            if ($scope.currentDevice.vc) {
                if (item.avg_value_data !== null) {
                    $scope.statisticsObj.avgLoad = (item.avg_value_data/$scope.currentDevice.vc*100).toFixed(1) + '%';
                }
                if (item.max_value_data !== null) {
                    $scope.statisticsObj.maxLoad = (item.max_value_data/$scope.currentDevice.vc*100).toFixed(1) + '%';
                }
            }
            $scope.$apply();
        });
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
    $scope.statisticsObj = $scope.getDefaultDeviceDegreeData($scope.currentDevice.sn);
    var energyApi = new EnergyFuncApi($scope, varDataService);

    $scope.registerDateChangeListener(function (date) {
        refreshData($scope.currentDevice);
    });

    $scope.registerDeviceChangeListener(function (device) {
        refreshData(device);
    });

    function refreshData(device) {
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
                            paintPfvPie(degreeMap, 'kWh', 'chart1');
                            paintPfvPie(chargeMap, '元', 'chart2');
                        }
                        $scope.degreeTexts = degreeTexts;
                        $scope.chargeTexts = chargeTexts;
                        $scope.$apply();
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

app.controller('EnergyLoadAnalysisCtrl', function ($scope, varDataService) {
    $scope.charges = $scope.getDefaultDeviceDegreeData($scope.currentDevice.sn);
    var electricConfig = $scope.getThisMonthElectricConfig();
    $scope.maxLoad = '-';
    $scope.maxLoadRatio = '-';

    var energyApi = new EnergyFuncApi($scope, varDataService);

    $scope.registerDateChangeListener(function (date) {
        $scope.charges = {};
        refreshData($scope.currentDevice);
    });

    $scope.registerDeviceChangeListener(function (device) {
        $scope.charges = {};
        refreshData(device);
    });

    function refreshData(device) {
        echarts.dispose(document.getElementById('chart1'));
        echarts.dispose(document.getElementById('chart2'));
        $scope.maxLoad = '-';
        $scope.maxLoadRatio = '-';
        varDataService.getVarsOfDevice(device.sn, ['P'], function (varMap) {
            if (!varMap.P) {
                return;
            }
            var pSn = varMap.P.sn;
            var startTime = $scope.selectedDate.format('YYYY-MM-01 00:00:00.000');
            var endTime = $scope.selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59.000');
            var vc = $scope.currentDevice.vc;
            if (vc) {
                // 获取日最大负荷趋势数据
                varDataService.getHistoryTrend([pSn], startTime, endTime, 'DAY', 'MAX', function (dataList) {
                    var data = dataList[0];
                    paintMaxLoadTrendByDay(data.time_keys, data.datas);
                });

                // 获取按小时统计的平均负荷数据
                varDataService.getHistoryTrend([pSn], startTime, endTime, 'HOUR', 'AVG', function (dataList) {
                    var data = dataList[0];
                    // 按小时统计
                    var avgList = statisticAvgLoadByHour(data.time_keys, data.datas);
                    paintAvgLoadByHour(avgList);
                });
            }


            // 获取最大、平均负荷值
            varDataService.getVarSummarizedData([pSn], startTime, endTime, ['MAX'], function (dataList) {
                var data = dataList[0];
                if (data.max_value_data !== null) {
                    $scope.maxLoad = data.max_value_data;
                    if (vc) {
                        $scope.maxLoadRatio = (data.max_value_data/$scope.currentDevice.vc*100).toFixed(1) + '%';
                    }
                }
                $scope.$apply();
            });
        });
    }

    function statisticAvgLoadByHour(timeKeys, datas) {
        // 将所有负荷按小时统计平均
        var loadTotalList = [];
        for (var i=0; i<=23; i++) {
            loadTotalList.push([]);
        }
        // 先求和
        timeKeys.forEach(function (t, i) {
            if (datas[i]) {
                var hour = parseInt(t.substring(11, 13));
                loadTotalList[hour].push(datas[i]);
            }
        });
        // 再取平均
        var vc = $scope.currentDevice.vc;
        var avgList = [];
        for (var i=0; i<=23; i++) {
            var total = 0;
            if (loadTotalList[i].length) {
                loadTotalList[i].forEach(function (d) {
                    total += d;
                });
                avgList.push(parseFloat((total/loadTotalList[i].length/vc*100).toFixed(1)));
            } else {
                avgList.push(0);
            }
        }
        return avgList;
    }

    function paintAvgLoadByHour(avgList) {
        var times = [];
        for (var i=0; i<=23; i++) {
            times.push(i + '时');
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
                },
            },
            series: [{
                data: avgList,
                type: 'line',
                symbolSize: 0,
                itemStyle: {
                    color: '#8D6ADD'
                }
            }]
        };
        echarts.init(document.getElementById('chart1')).setOption(option);
    }

    function paintMaxLoadTrendByDay(timeKeys, datas) {
        var vc = $scope.currentDevice.vc;
        if (!timeKeys || !timeKeys.length) {
            return;
        }
        var times = [], yAxis = [];
        timeKeys.forEach(function (t, i) {
            times.push(parseInt(t.substring(8, 10)) + '日');
            if (datas[i] !== null) {
                yAxis.push((datas[i]/vc*100).toFixed(1));
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
                },
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
        echarts.init(document.getElementById('chart2')).setOption(option);
    }

    refreshData($scope.currentDevice);
});

app.controller('EnergyMaxDemandCtrl', function ($scope, varDataService) {
    var charges = $scope.getDefaultDeviceDegreeData($scope.currentDevice.sn);
    var electricConfig = $scope.getThisMonthElectricConfig();
    $scope.maxDemand = '-';
    $scope.maxDemandTime = '';
    $scope.requiredMaxDemand = null;       // 核定最大需量
    var pSn = null;

    var energyApi = new EnergyFuncApi($scope, varDataService);

    $scope.registerDateChangeListener(function (date) {
        $scope.charges = {};
        refreshData($scope.currentDevice);
    });

    $scope.registerDeviceChangeListener(function (device) {
        $scope.charges = {};
        refreshDeviceVar(device);
    });

    function refreshDeviceVar(device) {
        varDataService.getVarsOfDevice(device.sn, ['P'], function (varMap) {
            if (varMap.P) {
                pSn = varMap.P.sn;
                refreshData();
            }
        });
    }

    function getRequiredMaxDemand(config) {
        if (config && config.capacity_charge) {
            var obj = JSON.parse(config.capacity_charge);
            $scope.requiredMaxDemand = obj.normal_capacity;
        }  else {
            $scope.requiredMaxDemand = null;
        }
    }

    function refreshData() {
        echarts.dispose(document.getElementById('chart1'));
        if (!pSn) {
            $scope.maxDemand = '-';
            $scope.maxDemandTime = '';
            return;
        }
        var startTime = $scope.selectedDate.format('YYYY-MM-01 00:00:00.000');
        var endTime = $scope.selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59.000');
        varDataService.getVarSummarizedData([pSn], startTime, endTime, ['MAX'], function (dataList) {
            $scope.maxDemand = '-';
            $scope.maxDemandTime = '';
           if (dataList && dataList.length) {
               var data = dataList[0];
               if (data.max_value_data !== null) {
                   $scope.maxDemand = data.max_value_data;
                   $scope.maxDemandTime = data.max_value_time;
               }
           }
           $scope.$apply();
        });
        paintDemandTrend(startTime, $scope.selectedDate.format('YYYY-MM-01 23:59:59.000'));
    }

    function paintDemandTrend(startTime, endTime) {
        varDataService.getHistoryTrend([pSn], startTime, endTime, 'NORMAL', 'MAX', function (dataList) {
           var data = dataList[0];
            var times = [], yAxis = [];
            data.time_keys.forEach(function (t, i) {
                times.push(t.substring(5, 16));
            });
            var option = {
                grid: {
                    top: 15,
                    left: 60,
                    right: 10,
                    bottom: 25
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b0}: {c0}kW'
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
                        formatter: '{value}'
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
                    },
                },
                series: [{
                    data: data.datas,
                    type: 'line',
                    symbolSize: 0,
                    itemStyle: {
                        color: '#8D6ADD'
                    }
                }]
            };
            echarts.init(document.getElementById('chart1')).setOption(option);
        });
    }

    refreshDeviceVar($scope.currentDevice);
    getRequiredMaxDemand(electricConfig);
});

app.controller('EnergyQualityMonitorCtrl', function ($scope, varDataService) {
    var codes = [];
    var varSnsMap = {};
    var electricConfig = $scope.getThisMonthElectricConfig();
    $scope.current = {};
    $scope.warning = {};        // 告警数据

    $scope.registerDeviceChangeListener(function (device) {
        getVarsOfDevice();
    });

    function initCodes() {
        var phases = ['a', 'b', 'c'];
        var keys = ['U', 'I'];
        phases.forEach(function (phase) {
            keys.forEach(function (k) {
                codes.push(k+phase);
            });
            // 谐波
            for (var i=1; i<=13; i+=2) {
                codes.push('harm'+i+'u'+phase);
                codes.push('harm'+i+'i'+phase)
            }
        });
        codes.push('f');
        codes.push('PF');
        codes.push('P');
        codes.push('Q');
    }
    
    function getVarsOfDevice() {
        $scope.current = {};
        varDataService.getVarsOfDevice($scope.currentDevice.sn, codes, function (varMap) {
            varSnsMap = {};
            Object.keys(varMap).forEach(function (code) { 
                varSnsMap[code] = varMap[code].sn;
            });
            refresh();
        });
    }

    function refresh() {

        var sns = [];
        Object.keys(varSnsMap).forEach(function (t) { 
            sns.push(varSnsMap[t]);
        });
        varDataService.getRealtimeValue(sns, function (dataList) {
            var valueMap = {};
            dataList.forEach(function (d) {
                valueMap[d.var.var_code] = d.data;
            });
            $scope.current = valueMap;
            paintPolar('chart1', 'voltage', valueMap);
            paintPolar('chart2', 'current', valueMap);
            paintThdTrend('chart3', 'voltage', valueMap);
            paintThdTrend('chart4', 'current', valueMap);
            calcThd(valueMap);
            calcUblu(valueMap);
            calcWarning(valueMap);
            $scope.$apply();
        });
    }

    function getBaseCosFromConfig() {
        // 从电费配置中获取功率因数标准值，没有的话默认为0.9
        if (electricConfig && electricConfig.cos_charge) {
            var obj = JSON.parse(electricConfig.cos_charge);
            if (obj && obj.normal_cos) {
                return parseFloat(obj.normal_cos);
            }
        }
        return 0.9;
    }

    function calcWarning(valueMap) {
        function _isNumber(v) {
            if (v === undefined || v === null) {
                return false;
            }
            return true;
        }
        // 计算告警的数据
        var warning = {};
        if (_isNumber(valueMap.f)) {
            if (valueMap.f > 50.2 || valueMap.f < 49.8) {
                warning.f = true;
            }
        }
        // 计算功率因素是否告警
        var baseCos = getBaseCosFromConfig();
        if (_isNumber(valueMap.PF)) {
            if (valueMap.PF < baseCos) {
                warning.PF = true;
            }
        }
        // 计算无功功率是否告警
        if (_isNumber(valueMap.P) && _isNumber(valueMap.Q) && valueMap.P>0) {
            var cos = (valueMap.P) / Math.sqrt(Math.pow(valueMap.P) + Math.pow(valueMap.Q));
            if (cos < baseCos) {
                warning.Q = true;
            }
        }

        // 电压是否告警
        ['a', 'b', 'c'].forEach(function (phase) {
            var voltage = valueMap['U'+phase];
            if (_isNumber(voltage)) {
                if (voltage > 220*1.07 || voltage < 220*0.93) {
                    warning['U' + phase] = true;
                }
            }

            // 谐波畸变率，额定电压<=400V时，需<5%
            if (_isNumber(valueMap['thdu' + phase])) {
                var thdu = valueMap['thdu' + phase];
                if (thdu > 5) {
                    warning['thdu' + phase] = true;
                }
            }
        });
        // 不平衡度，<2%
        if (_isNumber(valueMap['ublup'])) {
            if (valueMap['ublup'] > 2) {
                warning['ublup'] = true;
            }
        }
        $scope.warning = warning;
    }
    
    function calcUblu(valueMap) {     // 计算电压/电流不平衡度
        var codes = ['U', 'I'];
        var phases = ['a', 'b', 'c'];
        var data = {};
        codes.forEach(function (code) {
            var dataList = [];
            var max = null, min = null;
            phases.forEach(function (p) {
                var varCode = code + p;
                var value = valueMap[varCode];
                if (value !== null && value !== undefined) {
                    dataList.push(value);
                    if (max === null || max < value) {
                        max = value;
                    }
                    if (min === null || min < value) {
                        min = value;
                    }
                }
            });
            var key = 'ubl' + code.toLowerCase() + 'p';
            var value = null;
            if (max) {
                value = parseFloat(((max-min)/max*100).toFixed(2));
            }
            $scope.current[key] = value;
        });
        return data;
    }
    
    function calcThd(valueMap) {
        var phases = ['ua', 'ub', 'uc', 'ia', 'ib', 'ic'];
        var thdMap = {};
        phases.forEach(function (phase) {
            var dataList = [];
            for (var i=1; i<=13; i+=2) {
                dataList.push(valueMap['harm' + i + phase]);
            }
            if (!dataList || !dataList.length) {
                thdMap[phase] = null;
                return;
            }
            var count = null;
            for (var i=1; i<dataList.length; i++) {
                if (dataList[i] !== null && dataList[i] !== undefined) {
                    var v = dataList[i]*dataList[i];
                    count = count === null ? v : (count + v);
                }
            }
            if (count === null || dataList[0] === null) {
                thdMap[phase] = null;
                return;
            }
            // 对和进行开根号，并除以一次谐波
            thdMap[phase] = parseFloat((Math.sqrt(count) / dataList[0] * 100).toFixed(2));
        });
        Object.keys(thdMap).forEach(function (key) {
            $scope.current['thd' + key] = thdMap[key];
        })
    }
    
    function paintPolar(chartId, type, varDatas) {
        // 三相不平衡图， type=current、voltage
        var aseries = [];
        var keys = type === 'current' ? [{code: 'I', ang: 'angi', name: '电流', unit: 'A'}] : [{code: 'U', ang: 'angu', name: '电压', unit: 'V'}];
        keys.forEach(function (key) {
            var phases = [
                {color: '#F5BC4F', name: 'A相', code: 'a', startAngle: 0},
                {color: '#45c6b1', name: 'B相', code: 'b', startAngle: 120},
                {color: '#e94a45', name: 'C相', code: 'c', startAngle: 240}];
            phases.forEach(function (phase) {

                var tmpAng = varDatas[key.ang + phase.code];
                var value = varDatas[key.ang + phase.code];
                if (value === null || value === undefined) {
                    aseries.push({
                        type: 'graph',
                        data: [0, 0],
                        edgeSymbol: ['', ''],
                    });
                    return;
                }
                var angle = (tmpAng === null || tmpAng === undefined) ? 0 : (tmpAng);
                var tempSeries = {
                    type: 'graph',
                    coordinateSystem: 'polar',
                    name: '',
                    symbolSize: 1,
                    edgeSymbol: ['', 'arrow'],
                    data: [[0, 0], {name: (phase.name + key.name), value: [value, angle]}],
                    label: {
                        normal: {
                            show: true,
                        },
                    },
                    links: [{
                        source:0,
                        target:1,
                    }],
                    tooltip:{
                        formatter: "{a}",
                    },
                    itemStyle: {
                        normal: {
                            label: {
                                position: ['500%', '500%'],
                                textStyle: {
                                    fontSize: 16,
                                    color: phase.color,
                                },
                            },
                        }
                    },
                    lineStyle: {
                        normal: {
                            width: 3,
                            color: phase.color,
                        },
                    },
                };
                aseries.push(tempSeries);
            });
        });
        var option = {
            title: {
                left: 'center',
                text: '',
                textStyle: {
                    color: '#787878',
                },
            },
            polar: {
                radius: 50,
            },
            tooltip: {
                trigger: 'item',
                axisPointer: {
                    type: 'cross',
                },
            },
            grid: {
                top: 100,
                show: false,
            },
            angleAxis: {
                type: 'value',
                startAngle: 0,
                min: 0,
                max: 360,
            },
            radiusAxis: {
                splitNumber: 3,
                axisLabel: {
                    color: '#999',
                },
            },
            series: aseries,
        };
        echarts.init(document.getElementById(chartId)).setOption(option);
    }

    function paintThdTrend(chartId, type, varDatas) {
        /**
         * 画谐波趋势图
         * type: current、voltage
         */
        var phases = [
            {color: '#F5BC4F', name: 'A相', code: 'a'},
            {color: '#45c6b1', name: 'B相', code: 'b'},
            {color: '#e94a45', name: 'C相', code: 'c'}];
        var keys = type === 'current' ? {code: 'i', name: '电流', unit: 'A'} : {code: 'u', name: '电压', unit: 'V'};
        var xAxis = [];
        for (var i=1; i<=13; i+=2) {
            if (i === 1) {
                xAxis.push('基波');
            } else {
                xAxis.push(i + '次');
            }
        }
        var series = [];
        phases.forEach(function (phase) {
            var datas = [];
            for (var i=1; i<=13; i++) {
                var key = 'harm' + i + keys.code + phase.code;
                if (i === 1) {
                    // 如果一次谐波不存在，就用电压或电流值来替代
                    if (varDatas[key] === undefined) {
                        datas.push(varDatas[keys.code.toUpperCase() + phase.code]);
                    } else {
                        datas.push(varDatas[key]);
                    }
                } else {
                    datas.push(varDatas[key]);
                }
            }
            series.push({
                type: 'line',
                name: phase.name,
                data: datas,
                symbolSize: 2,
                itemStyle: {
                    color: phase.color
                }
            });
        });
        var option = {
            grid: {
                top: 25,
                left: 35,
                right: 10,
                bottom: 25
            },
            legend: {
                data: ['A相', 'B相', 'C相'],
                right: 0,
                textStyle: {
                    color: '#6b6b6b',
                    fontSize: 10
                },
                itemHeight: 10
            },
            tooltip: {
                trigger: 'axis',
            },
            xAxis: {
                type: 'category',
                data: xAxis,
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
                name: keys.unit,
                type: 'value',
                splitNumber: 4,
                nameTextStyle: {
                    color: '#6b6b6b',
                },
                nameGap: 5,
                axisLabel: {
                    fontSize: 11,
                    color: '#6b6b6b',
                    formatter: '{value}'
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
                },
                axisTick: {
                    show: false
                }
            },
            series: series
        };
        echarts.init(document.getElementById(chartId)).setOption(option);
    }

    $scope.getPercent = function (v) {      // 用于界面显示百分比数据
        if (v === undefined || v === null) {
            return '-';
        }
        return v + '%';
    };

    initCodes();
    getVarsOfDevice();
});