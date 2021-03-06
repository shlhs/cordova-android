app.service('varDataService', ['ajax', 'platformService', function (ajax, platformService) {

    // 获取变量实时值
    this.getRealtimeValue = function (sns, callback) {
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/realtime?sns=' + sns.join(','),
            success: function (dataList) {
                callback(dataList);
            },
            error: function (dataList) {
                callback([]);
            }
        })
    };

    // 获取变量历史趋势
    this.getHistoryTrend = function (sns, startTime, endTime, queryPeriod, calcMethod, callback, error) {
        /**
         * startTime, endTime: 'YYYY-MM-01 00:00:00.000'格式时间
         */
        // calcMethod: DIFF, MAX, MIN, AVG
        // period: HOUR, DAY, MONTH, QUARTER, HALF_HOUR,NORMAL
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/historytrend',
            data: {
                sns: sns.join(','),
                calcmethod: calcMethod,
                startTime: startTime,
                endTime: endTime,
                queryPeriod: queryPeriod
            },
            success: function (data) {
                if (queryPeriod !== 'NORMAL') {
                    data.forEach(function (item) {
                        var result = fillTrendDataVacancy(startTime, endTime, queryPeriod, item.time_keys, item.datas, 'YYYY-MM-DD HH:mm:ss.000');
                        item.time_keys = result.time_keys;
                        item.datas = result.datas;
                    });
                }
                callback(data);
            },
            error: function () {
                if (error) {
                    error();
                }
            }
        })
    };

    // 获取变量的统计数据
    this.getVarSummarizedData = function (sns, startTime, endTime, calcMethod, callback) {
        /**
         * startTime/endTime: 'YYYY-MM-DD HH:mm:ss.000'格式时间
         * calcMethod: 列表，取值范围为：MIN,MAX,AVG
         * callback:  ([
         *     {
         *          sn: '',
         *          max_value_data: '',
         *          max_value_time: '',
         *          min_value_data: '',
         *          min_value_time: '',
         *          avg_value_data: '',
         *          avg_value_time: ''
         *     }
         * ])
         */
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/summarized',
            data: {
                sns: sns.join(','),
                startTime: startTime,
                endTime: endTime,
                calcmethod: calcMethod.length ? calcMethod.join(',') : 'MIN,MAX,AVG'
            },
            success: function (data) {
                callback(data);
            },
            error: function () {
                callback([]);
            }
        });
    };

    // 获取变量的天统计数据的日趋势
    this.getVarSummarizedDataByDayTrend = function (sns, startDate, endDate, calcMethod, callback) {
        /**
         * startDate/endDate: 'YYYY-MM-DD'格式时间
         * calcMethod: 列表，取值范围为：MIN,MAX,AVG
         * callback:  ([
         *     {
         *          sn: '',
         *          max_value_data: '',
         *          max_value_time: '',
         *          min_value_data: '',
         *          min_value_time: '',
         *          avg_value_data: '',
         *          avg_value_time: ''
         *     }
         * ])
         */
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/summarized/daytrend',
            data: {
                sns: sns.join(','),
                startDate: startDate,
                endDate: endDate,
                calcmethod: calcMethod.length ? calcMethod.join(',') : 'MIN,MAX,AVG'
            },
            success: function (data) {
                callback(data);
            },
            error: function () {
                callback([]);
            }
        });
    };

    // 按变量属性查询设备的变量
    this.getVarsOfDevice= function (deviceSn, varCodes, callback) {
        // callback({sn1: var1, sn2: var2}) 如果一个code对应了多个变量，那么取返回的第一个变量
        if (!deviceSn) {
            return;
        }
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/variables',
            data: {
                device_sns: deviceSn,
                var_codes: varCodes.join(',')
            },
            success: function (response) {
                var data = response.data;
                var varMap = {};
                if (data && data.length) {
                    data.forEach(function (item) {
                        if (!varMap[item.var_code]) {
                            varMap[item.var_code] = item;
                        }
                    });
                }
                callback(varMap);
            },
            error: function () {
                callback({});
            }
        });
    };

    // 获取月度电度电费统计值
    /**
     * @param sns
     * @param type：DAY/MONTH/YEAR，计算日、月、年的用电总和
     * @param startTime：moment对象
     * @param endTime：moment对象
     * @param startTime
     * @param endTime
     * @param callback
     */
    this.getDegreeSummary = function (sns, type, startTime, endTime, callback) {
        var self = this;
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/electricaldegreeandcharge',
            data: {
                sns: sns,
                type: type,
                startTime: startTime.format('YYYY-MM-DD 00:00:00.000'),
                endTime: endTime.endOf('month').format('YYYY-MM-DD 00:00:00.000')
            },
            success: function (res) {
                callback(res);
            },
            error: function () {
                callback(null);
            }
        })
    };

    // 获取变量的月电度趋势数据
    /**
     * @param sns
     * @param type：DAY/MONTH/YEAR，计算日趋势、月趋势、年趋势
     * @param startTime：moment对象
     * @param endTime：moment对象
     * @param callback
     * @param error
     */
    this.getDegreeChargeTrend = function (sns, type, startTime, endTime, callback, error) {
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/electricaldegreeandchargetrend',
            data: {
                sns: sns,
                type: type,
                startTime: startTime.format('YYYY-MM-DD 00:00:00.000'),
                endTime: endTime.endOf('month').format('YYYY-MM-DD 00:00:00.000')
            },
            success: function (data) {
                callback(data);
            },
            error: function () {
                callback([]);
            }
        })
    };

    // 获取站点电费配置
    this.getStationElectricConfig = function (stationSn, time, callback) {
        ajax.get({
            url: '/stations/' + stationSn + '/charge_config',
            data: {
                chargeType: 'electricity',
                queryTime: time.format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z'
            },
            success: function (data) {
                callback(data);
            },
            error: function () {
                callback(null);
            }
        })
    };
}]);

app.service('collectorService', ['ajax', 'platformService', function (ajax, platformService) {

   this.getMonitorDevice = function (sn, callback) {
       ajax.get({
           url: platformService.getDeviceMgmtHost() + '/management/devices/' + sn,
           success: function (response) {
                if (response && response.data) {
                    callback(response.data);
                } else {
                    callback(null);
                }
           },
           error: function () {
               callback(null);
           }
       })
   }
}]);