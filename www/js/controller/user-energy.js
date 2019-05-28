function paintAvgPriceOfMonth(varSn, startDate, endDate, chartId) {       // 平均电度电价
    
}

// 能源管理
app.controller('EnergyHomeCtrl', function ($scope, ajax, platformService, routerService) {

    $scope.devices = [];
    $scope.stationSn = null;
    $scope.stationName = null;
    $scope.currentDevice = null;
    $scope.selectedApps = defaultEnergyMenus;
    $scope.degreeVarSn = null;     // 设备的电度变量sn
    $scope.currentMonthData = {};
    $scope.isLoading = true;

    $scope.$on('onSiteChange', function (event, stationSn, stationName) {
        $scope.stationSn = stationSn;
        $scope.stationName = stationName;
        getMonitorDevices(stationSn);
    });

    $scope.onChangeDevice = function (device) {
        $scope.currentDevice = device;
        getVarsOfDevice(device.sn);
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

    function getMonitorDevices(stationSn) {
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
                if ($scope.currentDevice) {
                    getVarsOfDevice($scope.currentDevice.sn);
                } else {
                    $scope.isLoading = false;
                }
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $scope.$apply();
            }
        })
    }

    function getVarsOfDevice(deviceSn) {
        $scope.currentMonthData = {};
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/variables',
            data: {
                device_sns: deviceSn,
                var_codes: 'EPf'
            },
            success: function (response) {
                var data = response.data;
                if (data && data.length) {
                    $scope.degreeVarSn = data[0].sn;
                    getDegreeChargeTrend($scope.degreeVarSn);
                    getLastMonthDegree($scope.degreeVarSn);
                } else {
                    $scope.degreeVarSn = null;
                }
                $scope.isLoading = false;
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $scope.$apply();
            }
        })
    }

    function getDegreeChargeTrend(sn) {
        ajax.get({
            url: '/devicevars/getelectricaldegreeandcharge/trend',
            data: {
                sns: sn,
                start_date: moment().format('YYYY-MM-01'),
                end_date: moment().format('YYYY-MM-DD')
            },
            success: function (data) {
                var degreeList = data[sn];
                if (degreeList) {
                    paintPriceTrend(degreeList);
                    thisMonthStatistics(degreeList);

                } else {
                    // 销毁电费趋势图
                    echarts.dispose(document.getElementById('main_chart'));
                }
                $scope.$apply();
            }
        })
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
                if (data && data.allCharge) {
                    $scope.lastMonthPrice = parseFloat(data.allCharge)
                }
            }
        })
    }

    function calcPriceTrend() { // 计算电费同比变化趋势

    }

    function thisMonthStatistics(data) {
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
        $scope.currentMonthData = pageData;
    }

    function paintPriceTrend(data) {
        // 本月平均电度电价曲线
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
                    var avgPrice = dataItem.allDegree ? parseFloat((dataItem.allCharge/dataItem.allDegree).toFixed(2)) : null;
                    yAxis.push(avgPrice);
                    continue;
                }
            }
            yAxis.push(null);
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
        echarts.init(document.getElementById('main_chart')).setOption(option);
    }
});