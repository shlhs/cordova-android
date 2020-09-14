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

    var codes = ['P', 'MD', 'EQf', 'EPf'];
    var self = this;
    // 先取站点的电费配置
    var returnObj = {};
    // 基本电费：不管有没有用电，都需要计算
    if (electricConfig) {
        var obj = JSON.parse(electricConfig.capacity_charge);
        var capacityResult = this.calcCapacityCharge(obj, device.capacity, null);
        Object.assign(returnObj, capacityResult);
    }

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
                } else if (code === 'MD') {
                    pSn = sn;
                } else if (code === 'P' && !pSn) {
                    pSn = sn;
                }
                if (sns.indexOf(sn) < 0) {
                    sns.push(sn);
                }
            }
        });
        if (!sns.length) {
            callback(returnObj);
            return;
        }
        // 获取电度电费统计值
        varDataApi.getDegreeSummary(varMap.EPf.sn, 'MONTH', month, month, function (res) {
            if (!res || !res.length) {
                return;
            }
            var degreeData = {
                allDegree: res[0].all_degree,
                allCharge: res[0].all_charge
            };
            if (degreeData && degreeData.allCharge !== null) {
                Object.assign(returnObj, {
                    degreeDetail: degreeData,
                    degreeCharge: degreeData.allCharge,
                    allDegree: degreeData.allDegree,
                    allCharge: degreeData.allCharge
                });
                if (degreeData.allCharge === 0) {
                    callback(returnObj);
                    return;
                }
                returnObj.avgDegreePrice = parseFloat((degreeData.allCharge / degreeData.allDegree).toFixed(2));
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
                    var result = self.calcFullCharge(electricConfig, device.capacity, degreeData.allDegree, degreeData.allCharge, cos, maxDemand);

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
    data.forEach(function (n, i) {
        times.push(parseInt(n.time.substring(8, 10)) + '日');
        if (n.all_charge) {
            yAxis.push(parseFloat((n.all_charge/n.all_degree).toFixed(2)));
        } else {
            yAxis.push('-');
        }
    });
    var option = {
        grid: {
            top: 20,
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
            },
        },
        yAxis: {
            name: '元',
            nameGap: 0,
            type: 'value',
            axisLabel: {
                fontSize: 11,
            },
            splitNumber: 4,
        },
        series: [{
            data: yAxis,
            type: 'line',
            symbolSize: 4,
        }]
    };
    echarts.init(document.getElementById(chartId), "custom").setOption(option);
};

// 计算出电度电费以外的所有电费
EnergyFuncApi.prototype.calcFullCharge = function (config, deviceCapacity, allDegree, degreeCharge, cos, maxDemand) {
    /**
     * config: 站点电费配置
     * deviceCapacity: 设备额定容量
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
        var capacityResult = this.calcCapacityCharge(obj, deviceCapacity, maxDemand);
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
EnergyFuncApi.prototype.calcCapacityCharge = function (capacityConfig, deviceCapacity, maxDemand) {
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
    if (capacityConfig.transformer_price && deviceCapacity) {
        result.capacityVcCharge = parseFloat((deviceCapacity * capacityConfig.transformer_price).toFixed(2));
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

// 计算月度最大、平均负荷率，以及日负荷率
EnergyFuncApi.prototype.calcAvgMaxLoadAndTrend = function (dataList, month) {
    // 平均负荷率=平均负荷/最大负荷
    var maxLoad = 0;    // 最大负荷
    var avgSum = 0;     // 平均负荷的总和
    var times = [];
    var pRateList = [];     // 日平均负荷率
    var maxRate = 0;        // 最大负荷率
    var nextDate = 1;
    dataList.forEach(function (data) {
        if (data.avg_value_data) {
            avgSum += data.avg_value_data;
        }
        var dataDate = parseInt(data.date.substring(8, 10));
        if (dataDate > nextDate) {
            for (var i=nextDate; i<dataDate; i++) {
                times.push(i+'日');
                pRateList.push(null);
            }
        }
        // 计算负荷率
        if (data.max_value_data) {
            if (data.max_value_data > maxLoad) {
                maxLoad = data.max_value_data;
            }
            var rate = parseFloat((data.avg_value_data / data.max_value_data * 100).toFixed(2));
            if (rate > maxRate) {
                maxRate = rate;
            }
            pRateList.push(rate);
        } else {
            pRateList.push(0);
        }
        times.push(dataDate + '日');
        nextDate = dataDate + 1;
    });
    var endDayOfMonth  = month.endOf('month').date();
    if (nextDate <= endDayOfMonth) {
        for (var i=nextDate; i<endDayOfMonth; i++) {
            times.push(i+'日');
            pRateList.push(null);
        }
    }
    var avgRate = 0;
    if (maxRate) {
        avgRate = parseFloat((avgSum / dataList.length / maxRate).toFixed(2));
    }
    return {
        maxLoad: maxLoad,
        avgRate: avgRate,       // 月度平均负荷率
        maxRate: maxRate,       // 月度最大负荷率（按天）
        trend: {
            times: times,
            datas: pRateList
        }
    };
};

// 能源管理基础控制，主要用于获取所有监测点，并显示设备显示页面
app.controller('EnergyBaseCtrl', ['$scope', '$stateParams', '$state', 'ajax', 'platformService', 'routerService', 'varDataService', function ($scope, $stateParams, $state, ajax, platformService, routerService, varDataService) {
    $scope.stationSn = $scope.stationSn || GetQueryString('sn');
    $scope.stationName = $scope.stationName || GetQueryString('name');
    $scope.stationCapacity = $scope.capacity|| GetQueryString("capacity");
    $scope.devices = [];
    $scope.currentDevice = {
        sn: $scope.device_sn || GetQueryString('device_sn'),
        name: $scope.device_name || GetQueryString("device_name"),
        capacity: $scope.capacity
    };
    $scope.screenWidth = window.screen.width;
    $scope.contentHeight = window.screen.height - 60;
    $scope.isLoading = true;
    $scope.selectedDate = moment();
    $scope.showDateName = $scope.selectedDate.format('YYYY.MM');
    $scope.isCurrentMonth = true;       // 所选月份是否当前月份
    var datePicker = null;
    var energyApi = new EnergyFuncApi($scope, varDataService);
    var siteChangeFunc = function (stationSn, stationName) {};
    var deviceChangeFunc = function (device) {};    //
    var dateChangeFunc = function (date) {};
    var stationElectricConfig = null;

    $scope.openAppPage = function (app, $index) {
        if ($index < 6) {
            routerService.openPage($scope, app.templateUrl, {
                sn: $scope.stationSn,
                name: $scope.stationName,
                device_sn: $scope.currentDevice.sn,
                device_name: $scope.currentDevice.name,
                capacity: $scope.currentDevice.capacity
            });
        } else {
            window.location.href = app.templateUrl + '?sn=' + $scope.stationSn + '&name=' + $scope.stationName + '&device_sn=' + $scope.currentDevice.sn + '&device_name=' + $scope.currentDevice.name;
        }
    };

    $scope.$on('onSiteChange', function (event, station) {

        console.log('energy onSiteChange');
        if (station && $scope.stationSn !== station.sn) {
            $scope.stationSn = station.sn;
            $scope.stationName = station.name;
            $scope.stationCapacity = station.capacity;
            $scope.currentDevice = null;
            onSiteChange(station);
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

    function onSiteChange(station) {
        if (!station || !station.sn) {
            return;
        }
        $scope.isLoading = true;
        // 获取站点电费配置
        var oldDevice = $scope.currentDevice;
        varDataService.getStationElectricConfig(station.sn, $scope.selectedDate, function (config) {
            $scope.isLoading = false;
            $scope.devices = [];
            $scope.currentDevice = null;
            if (config) {
                stationElectricConfig = config;
                if (config.device_settings) {
                    $scope.devices = JSON.parse(config.device_settings);
                    if ($scope.devices.length) {
                        var exist = false;
                        $scope.devices.forEach(function (d) {
                            d.sn = d.device_sn;
                            d.capacity = $scope.stationCapacity;
                            if (oldDevice && oldDevice.sn === d.sn) {
                                exist = true;
                            }
                        });
                        $scope.currentDevice = exist ? oldDevice : $scope.devices[0];
                    }
                }
                setStorageItem(station.sn + '-electric_config', JSON.stringify(config));
            }
            if (siteChangeFunc) {
                siteChangeFunc(station.sn, station.name);
            }
            $scope.$apply();
        });
    }

    $scope.onChangeDevice = function (device) {
        if (device && (!$scope.currentDevice || device.sn !== $scope.currentDevice.sn)) {
            $scope.currentDevice = device;
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
            {
                treeData: $scope.devices, onSelect: $scope.onChangeDevice, selectedSn: $scope.currentDevice.sn
            }, {
                hidePrev: false
            });
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
                    var options = {type: 'month'};
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

    $scope.showData = function (v) {
        if (v === undefined || v === null) {
            return '-';
        }
        return v;
    };

    $scope.showRate = function (v) {
        if (v === undefined || v === null) {
            return '-';
        }
        return (v*100).toFixed(2) + '%';
    };

    // $scope.($scope.stationSn);

    $scope.$on('$destroy', function (event) {
        if (datePicker) {
            datePicker.dispose();
            datePicker = null;
        }
    });


    setTimeout(function () {
        onSiteChange({sn: $scope.stationSn, name: $scope.stationName});
        initDatePicker();
    }, 600);

}]);

function paintAvgLoadTrendByDay(chartId, times, datas) {
    if (!times || !times.length) {
        return;
    }
    var option = {
        grid: {
            top: 25,
            left: 40,
            right: 35,
            bottom: 25
        },
        tooltip: {
            trigger: 'axis',
            formatter: function (params, ticket, callback) {
                if (params.length) {
                    var value = params[0].value;
                    if (value === undefined || value === null) {
                        return params[0].name + '：-';
                    }
                    return params[0].name + '：' + value + '%';
                }
                return '';
            }
        },
        xAxis: {
            type: 'category',
            data: times,
            axisLabel: {
                fontSize: 11,
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                fontSize: 11,
                formatter: '{value}%'
            },
            splitNumber: 4,
        },
        series: [{
            data: datas,
            type: 'line',
            symbolSize: 0,
            markPoint: {
                data: [
                    {type: 'max', name: '最大值', offset: [0, -12]},
                    {
                        type: 'min',
                        name: '最大值',
                        symbolRotate: 180,
                        label: {
                            offset: [0, -18],
                        }
                    },
                ],
                symbolSize: 15,
                label: {
                    fontSize: 10,
                    offset: [0, -12],
                    formatter: '{c}%'
                }
            },
            markLine: {
                data: [
                    {type: 'average', name: '平均值'}
                ],
                label: {
                    fontSize: 10,
                    formatter: '{c}%',
                    offset: [-5, 0]
                },
                symbolSize: [0, 8]
            }
        }]
    };
    echarts.init(document.getElementById(chartId), 'custom').setOption(option);
}

// 能源管理
app.controller('EnergyHomeCtrl', ['$scope', 'ajax', 'platformService', 'varDataService', function ($scope, ajax, platformService, varDataService) {

    $scope.selectedApps = DEFAULT_ENERGY_MENUS;
    $scope.degreeVarSn = null;     // 设备的电度变量sn
    $scope.currentMonthData = {};
    var energyApi = new EnergyFuncApi($scope, varDataService);

    $scope.registerStationChangeListener(function (stationSn, stationName) {
        refreshForDeviceChange($scope.currentDevice);
    });

    $scope.registerDeviceChangeListener(function (device) {
        refreshForDeviceChange(device);
    });

    function refreshForDeviceChange(device) {
        $scope.currentMonthData = {};
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
            $scope.$apply();
        });
        $scope.degreeVarSn = null;

        varDataService.getVarsOfDevice(device.sn, ['EPf'], function (varMap) {
            if (varMap.EPf) {
                $scope.degreeVarSn = varMap.EPf.sn;
                // 获取每日电度数据
                varDataService.getDegreeChargeTrend($scope.degreeVarSn, 'DAY', moment().set('date', 1), moment().endOf('month'), function (res) {
                    if (!res || !res.length) {
                        return;
                    }
                    var todayDay = moment().format('DD');
                    var dataList = res[0].datas;
                    for (var i=0; i<dataList.length; i++) {
                        var n = dataList[i];
                        if (n.time.substring(8, 10) === todayDay) { // 设置今日用电量和电费
                            Object.assign($scope.currentMonthData, {
                                todayDegree: n.all_degree,
                                todayCharge: n.all_charge
                            });
                            break;
                        }
                    }
                    energyApi.paintAvgPriceTrend('main_chart', dataList);
                    $scope.$apply();
                });
                getLastMonthDegree($scope.degreeVarSn);
            } else {
                $scope.degreeVarSn = null;
            }
            $scope.setIsLoading(false);
            $scope.$apply();
        });
    }

    function getLastMonthDegree(sn) {       // 获取上月的电费统计信息
        var lastMonth = moment().subtract(1, 'M');
        varDataService.getDegreeSummary(sn, 'MONTH', lastMonth, lastMonth, function (res) {
            if (res && res.length) {
                var degree = res[0].all_degree;
                var charge = res[0].all_charge;
                if (degree) {
                    $scope.lastMonthPrice = parseFloat((charge/degree).toFixed(2));
                }
                calcAvgPriceChange();
                $scope.$apply();
            }
        });
    }

    function calcAvgPriceChange() {
        if ($scope.lastMonthPrice !== null && $scope.currentMonthData.avgDegreePrice) {
            $scope.currentMonthData.priceChangeRatio = parseFloat((($scope.currentMonthData.avgDegreePrice - $scope.lastMonthPrice)/$scope.lastMonthPrice*100).toFixed(1));
        }
    }
}]);

// 用电概况
app.controller('EnergyOverviewCtrl', ['$scope', 'ajax', 'platformService', 'varDataService', function ($scope, ajax, platformService, varDataService) {
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
            var start = moment($scope.selectedDate.format('YYYY-MM-01'));
            var end = $scope.selectedDate.endOf('month');
            varDataService.getDegreeChargeTrend(degreeVar.sn, 'DAY', start, end, function (res) {
                if (res && res.length) {
                    var degreeList = res[0].datas;
                    energyApi.paintAvgPriceTrend('price_chart', degreeList);
                    paintPfvChargeTrend(degreeList);
                }
                // if (degreeList.length) {
                //     var statistics = energyApi.statisticMonthFromChargeTrend(degreeList);
                //     Object.assign($scope.statisticsObj, statistics);
                // }
                $scope.$apply();
            });
            calcCosAndLoad(varMap);
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
                        chargeMap[key].push(dataItem[key+'_charge']);
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
            legend: {
                data: ['峰', '平', '谷'],
                right: 20,
                top: 0,
                textStyle: {
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
                bottom: 25,
            },
            xAxis: {
                type: 'category',
                data: times,
                axisLabel: {
                    fontSize: 11,
                },
            },
            yAxis: {
                type: 'value',
                name: '元',
                nameGap: 0,
                axisLabel: {
                    fontSize: 11,
                },
                splitNumber: 4,
            },
            color: colors,
            series: series,
        };
        echarts.init(document.getElementById('charge_chart'), 'custom').setOption(option);
    }

    function calcCosAndLoad(varMap) {
        // 计算负荷
        if (!varMap.P) {
            return;
        }
        var pSn = varMap.P.sn;
        varDataService.getVarSummarizedDataByDayTrend([pSn], $scope.selectedDate.format('YYYY-MM-01'), $scope.selectedDate.endOf('month').format('YYYY-MM-DD'), ['MAX', 'AVG'], function (dataMap) {
            if (dataMap[pSn]) {
                var dataList = dataMap[pSn];
                // 平均负荷率=平均负荷/最大负荷
                var result = energyApi.calcAvgMaxLoadAndTrend(dataList, $scope.selectedDate);
                Object.assign($scope.statisticsObj, {
                    avgLoad: result.avgRate ? result.avgRate + '%' : '-',
                    maxLoad: result.maxRate ? result.maxRate + '%' : '-'
                });
                paintAvgLoadTrendByDay('load_chart', result.trend.times, result.trend.datas);
            }
            $scope.$apply();
        });
    }

    setTimeout(function () {
        refreshData($scope.currentDevice);
    }, 500);

}]);

// 电费分析
app.controller('EnergyCostAnalysisCtrl', ['$scope', 'ajax', 'platformService', 'varDataService', function ($scope, ajax, platformService, varDataService) {
    $scope.degreeTexts = [];
    $scope.chargeTexts = [];
    $scope.degreeVarSn = null;
    var electricConfig = $scope.getThisMonthElectricConfig();
    $scope.statisticsObj = $scope.getDefaultDeviceDegreeData($scope.currentDevice.sn);
    var energyApi = new EnergyFuncApi($scope, varDataService);

    $scope.registerDateChangeListener(function (date) {
        refreshData($scope.currentDevice);
        varDataService.getStationElectricConfig($scope.stationSn, date, function (config) {
            electricConfig = config;
        });
    });

    $scope.registerDeviceChangeListener(function (device) {
        refreshData(device);
    });

    function refreshData(device) {
        energyApi.fetchAndCalcCharges($scope.stationSn, electricConfig, device, $scope.selectedDate, function (result) {
            $scope.statisticsObj = result;
            $scope.$apply();
        });
        echarts.dispose(document.getElementById('chart1'));
        echarts.dispose(document.getElementById('chart2'));
        varDataService.getVarsOfDevice(device.sn, ['EPf'], function (varMap) {
            var degreeVar = varMap.EPf;
            if (degreeVar) {
                $scope.degreeVarSn = degreeVar.sn;
                $scope.chargeTexts = [];
                $scope.degreeTexts = [];
                varDataService.getDegreeSummary(degreeVar.sn, 'MONTH', $scope.selectedDate, $scope.selectedDate, function (res) {
                    if (!res || !res.length) {
                        return;
                    }
                    var data = res[0];
                    if (data) {
                        var keys = ['s', 'p', 'v', 'f'];
                        var degreeMap = {};
                        var chargeMap = {};
                        var degreeTexts = [];
                        var chargeTexts = [];
                        if (data.all_charge) {
                            keys.forEach(function (key) {
                                var degree = data[key+'_degree'];
                                var charge = data[key+'_charge'];
                                degreeMap[key] = degree;
                                chargeMap[key] = charge;
                                if (degree) {
                                    degreeTexts.push({
                                        label: g_pvf_label[key],
                                        value: degree,
                                        ratio: (degree/data.all_degree*100).toFixed(2),
                                        color: g_pvf_colors[key]
                                    });
                                }
                                if (charge) {
                                    chargeTexts.push({
                                        label: g_pvf_label[key],
                                        value: charge,
                                        ratio: (charge/data.all_charge*100).toFixed(2),
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
                    align: 'center',
                    lineHeight: 14,
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
        echarts.init(document.getElementById(chartId), 'custom').setOption(option);
    }

    setTimeout(function () {
        refreshData($scope.currentDevice);
    }, 500);

}]);

app.controller('EnergyLoadAnalysisCtrl', ['$scope', 'varDataService', function ($scope, varDataService) {
    $scope.charges = $scope.getDefaultDeviceDegreeData($scope.currentDevice.sn);
    var electricConfig = $scope.getThisMonthElectricConfig();
    $scope.maxLoad = '-';
    $scope.maxLoadRatio = '-';

    var energyApi = new EnergyFuncApi($scope, varDataService);

    $scope.registerDateChangeListener(function (date) {
        $scope.charges = {};
        // 重新计算电费
        varDataService.getStationElectricConfig($scope.stationSn, $scope.selectedDate, function (config) {
            electricConfig = config;
            energyApi.fetchAndCalcCharges($scope.stationSn, config, $scope.currentDevice, $scope.selectedDate, function (result) {
                $scope.charges = result;
                $scope.$apply();
            });
        });

        refreshData($scope.currentDevice);
    });

    $scope.registerDeviceChangeListener(function (device) {
        energyApi.fetchAndCalcCharges($scope.stationSn, electricConfig, device, $scope.selectedDate, function (result) {
            $scope.charges = result;
            $scope.$apply();
        });
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

            // 日平均负荷率曲线
            varDataService.getVarSummarizedDataByDayTrend([pSn], startTime.substring(0, 10), endTime.substring(0, 10), ['MAX', 'AVG'], function (dataMap) {
                if (dataMap[pSn]) {
                    var dataList = dataMap[pSn];
                    var result = energyApi.calcAvgMaxLoadAndTrend(dataList, $scope.selectedDate);
                    $scope.maxLoad = result.maxLoad === null ? '-' : result.maxLoad;
                    $scope.maxLoadRatio = result.maxRate === null ? '-' : result.maxRate + '%';
                    paintAvgLoadTrendByDay('chart2', result.trend.times, result.trend.datas);
                }
                $scope.$apply();
            });
            var avgByHour = null, maxByHour = null;
            // 获取按小时统计的平均负荷数据
            varDataService.getHistoryTrend([pSn], startTime, endTime, 'HOUR', 'AVG', function (dataList) {
                avgByHour = dataList[0];
                // 按小时统计
                calcAvgLoadByHour(avgByHour, maxByHour);
            });
            // 获取按小时统计的最大负荷数据
            varDataService.getHistoryTrend([pSn], startTime, endTime, 'HOUR', 'MAX', function (dataList) {
                maxByHour = dataList[0];
                // 按小时统计
                calcAvgLoadByHour(avgByHour, maxByHour);
            });
        });
    }

    function calcAvgLoadByHour(avgByHour, maxByHour) {
        if (!avgByHour || !maxByHour) {
            return;
        }
        // 将所有负荷按小时统计负荷率，并画曲线
        var loadTotalList = [];
        var maxLoad = [];       // 每个小时的最大负荷
        var times = [];
        for (var i=0; i<=23; i++) {
            loadTotalList.push([]);
            maxLoad.push(null);
            times.push(i + '时');
        }
        // 先求和
        var avgDatas = avgByHour.datas;
        var maxDatas = maxByHour.datas;
        avgByHour.time_keys.forEach(function (t, i) {
            if (avgDatas[i]) {
                var hour = parseInt(t.substring(11, 13));
                loadTotalList[hour].push(avgDatas[i]);
                // 比较最大负荷
                if (maxDatas[i] && (!maxLoad[hour] || maxDatas[i] > maxLoad[hour])) {
                    maxLoad[hour] = maxDatas[i];
                }
            }
        });
        // 再取平均
        var avgList = [];
        for (var i=0; i<=23; i++) {
            var total = 0;
            if (loadTotalList[i].length) {
                loadTotalList[i].forEach(function (d) {
                    total += d;
                });
                var avg = total / loadTotalList[i].length;
                var max = maxLoad[i];
                if (max === 0) {
                    avgList.push(0);
                } else if (max) {
                    avgList.push(parseFloat((avg/max*100).toFixed(2)));
                } else {
                    avgList.push(null);
                }
            } else {
                avgList.push(null);
            }
        }
        paintAvgLoadByHour(times, avgList);
    }

    function paintAvgLoadByHour(times, avgList) {
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
                },
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    fontSize: 11,
                    formatter: '{value}%'
                },
                splitNumber: 4,
            },
            series: [{
                data: avgList,
                type: 'line',
                symbolSize: 0,
            }]
        };
        echarts.init(document.getElementById('chart1'), 'custom').setOption(option);
    }

    setTimeout(function () {
        refreshData($scope.currentDevice);
    }, 500);
}]);

app.controller('EnergyMaxDemandCtrl', ['$scope', 'varDataService', function ($scope, varDataService) {
    var electricConfig = $scope.getThisMonthElectricConfig();
    var capacityConfig = null;
    if (electricConfig) {
        capacityConfig = JSON.parse(electricConfig.capacity_charge);
    }
    $scope.maxDemand = '-';
    $scope.maxDemandTime = '';
    $scope.requiredMaxDemand = null;       // 核定最大需量
    $scope.showTip = false;     // 是否显示优化建议，只有显示当月电费时才需要计算
    $scope.optMaxDemand = null;     // 优化的核定需量
    $scope.saveMoney = null;        // 可节省的电费
    $scope.startDate = moment().format('YYYY-MM-DD');
    $scope.endDate = moment().format('YYYY-MM-DD');

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

    var startDatePicker = null, endDatePicker = null;
    function initDatePicker() {
        document.getElementById('datePicker1').addEventListener('tap', function() {
            // 去掉月的样式限制
            if(startDatePicker) {
                startDatePicker.show(function (rs) {
                    $scope.startDate = rs.text;
                    onDateChange();
                    $scope.$apply();
                });
            } else {
                var options = {type: 'date'};
                startDatePicker = new mui.DtPicker(options);
                startDatePicker.show(function(rs) {
                    $scope.startDate = rs.text;
                    onDateChange();
                    $scope.$apply();
                });
            }
        }, false);
        document.getElementById('datePicker2').addEventListener('tap', function() {
            if(endDatePicker) {
                endDatePicker.show(function (rs) {
                    $scope.endDate = rs.text;
                    onDateChange();
                    $scope.$apply();
                });
            } else {
                var options = {type: 'date'};
                endDatePicker = new mui.DtPicker(options);
                endDatePicker.show(function(rs) {
                    $scope.endDate = rs.text;
                    onDateChange();
                    $scope.$apply();
                });
            }
        }, false);
    }

    function onDateChange() {
        paintDemandTrend();
    }

    function refreshDeviceVar(device) {
        varDataService.getVarsOfDevice(device.sn, ['P', 'MD'], function (varMap) {
            if (varMap.MD || varMap.P) {
                pSn = varMap.MD ? varMap.MD.sn : varMap.P.sn;       // 如果不存在最大需量的话，就用负荷代替
                refreshData();
                paintDemandTrend();
            } else {
                pSn = null;
                echarts.dispose(document.getElementById('chart1'));
            }
        });
    }

    function calcOptNeed() {        // 计算是否需要显示优化建议
        if (!$scope.isCurrentMonth) {
            return;
        }
        var time = $scope.selectedDate.format('YYYY-MM-DD 00:00:00');
        var lastMonth = moment(time).subtract(1, 'months').endOf('month');
        varDataService.getVarSummarizedData([pSn], lastMonth.format('YYYY-MM-01 00:00:00.000'), lastMonth.format('YYYY-MM-DD 23:59:59.000'), ['MAX'], function (dataList) {
            if (dataList && dataList.length && dataList[0].max_value_data) {
                var lastMax = dataList[0].max_value_data;
                if ($scope.maxDemand <= lastMax) {       // 这个月的需量小雨上个月的最大需量时，才需要计算
                    // 优化建议的最大需量为：lastMax * 1.05后取整（100的倍数）
                    var tmpMax = parseInt(lastMax * 1.05 / 100) * 100;
                    if (tmpMax < $scope.requiredMaxDemand) {
                        $scope.optMaxDemand = tmpMax;
                        var oldChargeData = energyApi.calcCapacityCharge(capacityConfig, null, $scope.maxDemand);
                        // 计算可节约的电费
                        if (capacityConfig.capacity_price) {
                            var newCharge = tmpMax * capacityConfig.capacity_price;
                            $scope.showTip = true;
                            $scope.saveMoney = parseInt(oldChargeData.capacityDemandCharge - newCharge);
                        }
                        $scope.$apply();
                    }
                }
            }
        });
    }

    function getRequiredMaxDemand(config) {
        if (config) {
            $scope.requiredMaxDemand = parseFloat(config.normal_capacity);
        }  else {
            $scope.requiredMaxDemand = null;
        }
    }

    function refreshData() {
        if (!pSn) {
            $scope.maxDemand = '-';
            $scope.maxDemandTime = '';
            return;
        }
        var startTime = $scope.selectedDate.format('YYYY-MM-01 00:00:00.000');
        var endTime = $scope.selectedDate.endOf('month').format('YYYY-MM-DD 23:59:59.000');
        $scope.showTip = false;
        varDataService.getVarSummarizedData([pSn], startTime, endTime, ['MAX'], function (dataList) {
            $scope.maxDemand = '-';
            $scope.maxDemandTime = '';
           if (dataList && dataList.length) {
               var data = dataList[0];
               if (data.max_value_data !== null) {
                   $scope.maxDemand = data.max_value_data;
                   $scope.maxDemandTime = data.max_value_time ? data.max_value_time.substring(0, 19) : '';

                   if ($scope.maxDemand < $scope.requiredMaxDemand && $scope.isCurrentMonth) {
                       // 如果当前最大需量 < 核定需量，则计算优化核定需量
                       calcOptNeed();
                   }
               }
           }
           $scope.$apply();
        });
    }

    function paintDemandTrend() {
        if ($scope.endDate < $scope.startDate) {
            return;
        }
        var startTime = $scope.startDate + ' 00:00:00.000';
        var endTime = $scope.endDate + ' 23:59:59.000';
        varDataService.getHistoryTrend([pSn], startTime, endTime, 'NORMAL', 'MAX', function (dataList) {
           var data = dataList[0];
            var times = [], yAxis = [];
            data.time_keys.forEach(function (t, i) {
                times.push(t.substring(5, 16));
            });
            var option = {
                grid: {
                    top: 25,
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
                    },
                },
                yAxis: {
                    name: 'kW',
                    type: 'value',
                    nameGap: 8,
                    axisLabel: {
                        fontSize: 11,
                        formatter: '{value}'
                    },
                    splitNumber: 4,
                },
                series: [{
                    data: data.datas,
                    type: 'line',
                    symbolSize: 0,
                    markPoint: {
                        data: [
                            {type: 'max', name: '最大值'},
                        ],
                        symbolSize: 15,
                        label: {
                            fontSize: 10,
                            offset: [0, -12],
                            formatter: '{c}kW'
                        }
                    },
                }]
            };
            echarts.init(document.getElementById('chart1'), 'custom').setOption(option);
        });
    }

    $scope.$on('$destroy', function (event) {
        if (startDatePicker) {
            startDatePicker.dispose();
            startDatePicker = null;
        }
        if (endDatePicker) {
            endDatePicker.dispose();
            endDatePicker = null;
        }
    });

    setTimeout(function () {
        refreshDeviceVar($scope.currentDevice);
        getRequiredMaxDemand(capacityConfig);
        initDatePicker();
    }, 500);
}]);

app.controller('EnergyQualityMonitorCtrl', ['$scope', 'varDataService', 'collectorService', function ($scope, varDataService, collectorService) {
    var codes = [];
    var varSnsMap = {};
    var electricConfig = $scope.getThisMonthElectricConfig();
    $scope.current = {};
    $scope.warning = {};        // 告警数据
    var realtimeInterval = null;

    $scope.registerDeviceChangeListener(function (device) {
        getVarsOfDevice();
    });

    function initCodes() {
        var phases = ['a', 'b', 'c'];
        var keys = ['U', 'I', 'thdi', 'thdu', 'fdu', 'fdi'];        // thdu/thdi：总谐波畸变率，fdu/fdi：电压电流基波有效值
        phases.forEach(function (phase) {
            keys.forEach(function (k) {
                codes.push(k+phase);
            });
            // 谐波
            for (var i=3; i<=13; i+=2) {
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
        collectorService.getMonitorDevice($scope.currentDevice.sn, function (data) {
           $scope.currentDevice.vc = data.vc ? parseFloat(data.vc) : null;
           $scope.$apply();
        });
        $scope.current = {};
        varDataService.getVarsOfDevice($scope.currentDevice.sn, codes, function (varMap) {
            varSnsMap = {};
            Object.keys(varMap).forEach(function (code) { 
                varSnsMap[code] = varMap[code].sn;
            });
            refresh();
        });
    }

    function _isNumber(v) {
        if (v === undefined || v === null) {
            return false;
        }
        return true;
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
            // 如果功率因数不存在，则通过有功功率、无功功率计算功率因数
            if ((valueMap.PF === null || valueMap.PF === undefined) &&_isNumber(valueMap.P) && _isNumber(valueMap.Q) && valueMap.P>0) {
                valueMap.PF = parseFloat(((valueMap.P) / Math.sqrt(Math.pow(valueMap.P, 2) + Math.pow(Math.abs(valueMap.Q), 2))).toFixed(2));
            }
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
        // 计算告警的数据
        var warning = {};
        if (_isNumber(valueMap.f)) {
            if (valueMap.f > 50.2 || valueMap.f < 49.8) {
                warning.f = true;
            }
        }
        // 计算功率因素是否告警
        var baseCos = getBaseCosFromConfig();
        var cos = null;
        if (_isNumber(valueMap.PF)) {
            if (valueMap.PF < baseCos) {
                warning.PF = true;
                warning.Q = true;
            }
        }

        // var coefficient = Math.sqrt(3);
        var vc = $scope.currentDevice.vc;
        // 电压是否告警
        if (vc) {
            ['a', 'b', 'c'].forEach(function (phase) {
                var voltage = valueMap['U'+phase];
                if (_isNumber(voltage)) {
                    if (voltage > vc*1.07 || voltage < vc*0.93) {
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
        }
        // 不平衡度，<2%
        if (_isNumber(valueMap['ublup'])) {
            if (valueMap['ublup'] > 2) {
                warning['ublup'] = true;
            }
        }
        $scope.warning = warning;
    }
    
    function calcUblu(valueMap) {     // 计算电压/电流不平衡度：(最大-最小)/最大

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
                    if (min === null || min > value) {
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
            if (valueMap['thd' + phase] !== undefined) {
                thdMap[phase] = valueMap['thd' + phase];
                return;
            }
            var dataList = [];
            dataList.push(valueMap['fd' + phase]);  // 基波
            for (var i=3; i<=13; i+=2) {
                dataList.push(valueMap['harm' + i + phase]);
            }
            if (!dataList || !dataList.length) {
                thdMap[phase] = '-';
                return;
            }
            // 如果一次谐波不存在，则使用ua/ia代替
            if (dataList[0] === undefined) {
                dataList[0] = valueMap[phase[0].toUpperCase() + phase[1]];
            }
            if (!dataList[0]) {
                thdMap[phase] = '-';
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
                var value = varDatas[key.code + phase.code];
                if (value === null || value === undefined) {
                    aseries.push({
                        type: 'graph',
                        data: [0, 0],
                        edgeSymbol: ['', ''],
                    });
                    return;
                }
                var angle = (tmpAng === null || tmpAng === undefined) ? phase.startAngle : (tmpAng);
                var tempSeries = {
                    type: 'graph',
                    coordinateSystem: 'polar',
                    name: '',
                    symbolSize: 1,
                    edgeSymbol: ['', 'arrow'],
                    data: [[0, 0], {name: (phase.name), value: [value, angle]}],
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
                                    fontSize: 11,
                                    color: phase.color,
                                },
                            },
                        }
                    },
                    lineStyle: {
                        normal: {
                            width: 2,
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
            },
            polar: {
                radius: 70,
            },
            tooltip: {
                trigger: 'item',
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
                axisLabel: {
                    show: false
                },
                axisLine: {
                    show: false,
                },
                axisTick: {
                    show: false,
                },
                splitLine: {
                    show: false,
                }
            },
            radiusAxis: {
                splitNumber: 2,
                axisLabel: {
                    fontSize: 10,
                    margin: 4
                },
            },
            series: aseries,
        };
        echarts.init(document.getElementById(chartId), 'custom').setOption(option);
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
        var xAxis = ['基波'];
        for (var i=3; i<=13; i+=2) {
            xAxis.push(i + '次');
        }
        var series = [];
        phases.forEach(function (phase) {
            var datas = [];
            // 基波数据，先取fdua/fdia
            datas.push(varDatas['fd' + keys.code + phase.code]);
            for (var i=3; i<=13; i+=2) {
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
                type: 'bar',
                name: phase.name,
                data: datas,
                symbolSize: 2,
                itemStyle: {
                    color: [phase.color]
                },
                color: [phase.color]
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
            },
            yAxis: {
                name: keys.unit,
                type: 'value',
                splitNumber: 4,
                nameGap: 5,
                axisLabel: {
                    fontSize: 11,
                    formatter: '{value}'
                },
                axisTick: {
                    show: false
                }
            },
            series: series
        };
        echarts.init(document.getElementById(chartId), 'custom').setOption(option);
    }

    $scope.getPercent = function (v) {      // 用于界面显示百分比数据
        if (v === undefined || v === null) {
            return '-';
        }
        return v + '%';
    };

    initCodes();
    setTimeout(getVarsOfDevice, 500);
    // getVarsOfDevice();

    if (!realtimeInterval) {
        realtimeInterval = setInterval(refresh, 6000);
    }

    $scope.$on('$destroy', function (event) {
        if (realtimeInterval) {
            clearInterval(realtimeInterval);
            realtimeInterval = null;
        }
    })
}]);

app.controller('EnergyQualityReportCtrl', ['$scope', 'ajax', 'collectorService', function ($scope, ajax, collectorService) {
    $scope.volt = {ua: {}, ub: {}, uc: {}};
    $scope.harm = {ua: {}, ub: {}, uc: {}};
    $scope.freq = {};
    $scope.cos = {};
    $scope.isLoading = true;

    $scope.registerDeviceChangeListener(function (device) {

        collectorService.getMonitorDevice($scope.currentDevice.sn, function (data) {
            $scope.currentDevice.vc = data.vc ? parseFloat(data.vc) : null;
            $scope.$apply();
        });

        getReport();
    });

    $scope.registerDateChangeListener(function (date) {
        getReport();
    });

    $scope.showConclution = function (isPass) {
        if (isPass === true) {
            return '合格';
        }
        if (isPass === false) {
            return '不合格';
        }
        return '';
    };

    function getReport() {
        $scope.isLoading = true;
        $.notify.progressStart();
        ajax.get({
            url: '/evaluation_report',
            data: {
                stationSn: $scope.stationSn,
                deviceSn: $scope.currentDevice.sn,
                startTime: $scope.selectedDate.format('YYYY-MM-01THH:mm:ss.000') + 'Z',
                endTime: $scope.selectedDate.endOf('month').format('YYYY-MM-DDTHH:mm:ss.000') + 'Z'
            },
            success: function (data) {
                $.notify.progressStop();
                $scope.isLoading = false;
                if (data ) {
                    $scope.volt = data.volt;
                    $scope.harm = data.harm;
                    $scope.freq = data.freq;
                    $scope.cos = data.cos
                } else {
                    $scope.volt = {ua: {}, ub: {}, uc: {}};
                    $scope.harm = {ua: {}, ub: {}, uc: {}};
                    $scope.freq = {};
                    $scope.cos = {};
                }
                $scope.$apply();
            },
            error: function () {
                $.notify.progressStop();
                $.notify.error('获取报告失败');
                $scope.isLoading = true;
                $scope.$apply();
            }
        })
    }

    collectorService.getMonitorDevice($scope.currentDevice.sn, function (data) {
        $scope.currentDevice.vc = data.vc ? parseFloat(data.vc) : null;
        $scope.$apply();
    });
    setTimeout(getReport, 500);
}]);