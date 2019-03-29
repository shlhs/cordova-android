"use strict";

String.prototype.trim=function(){
    return this.replace(/(^\s*)|(\s*$)/g, "");
};

Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "H+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o){
        if (new RegExp("(" + k + ")").test(fmt)){
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
};

function pageBack() {
    history.back();
    return false;
}

function IsPC()
{
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) >= 0) {
            return false;
        }
    }
    return true;
}


function GetQueryString(name, url)
{
    var search = window.location.search;
    if (url) {
        search = url.substring(url.indexOf('?'));
    }
    var search = search.substring(1), params = search.split('&');
    var index, param;
    for (var i=0; i<params.length; i++){
        param = params[i];
        index = param.indexOf('=');
        if (index > 0 && param.substring(0, index) == name){
            return decodeURIComponent(param.substring(index+1));
        }
    }
    return null;
}

function setStorageItem(key, value) {
    if (window.android){
        window.android.saveSetting(key, value);
    } else{
        window.localStorage.setItem(key, value);
    }
    // window.localStorage.setItem(key, value);
}

function getStorageItem(key) {
    if (window.android){
        return window.android.getSetting(key);
    }
    return window.localStorage.getItem(key);
}

var apiLocation = {
    callback: null,
    start: function (cb) {
        this.callback = cb;
        window.android && window.android.startLocation();
    },
    setLocation: function (longtitude, latitude) {
        if (this.callback){
            this.callback(longtitude, latitude);
            this.callback = null;
        }
    }
};



function formatToTreeData(data) {

    function addToGroup(newItem, items, depth) {
        if (!items || !items.length) {
            return false;
        }
        if (depth > maxDepth) {
            maxDepth = depth;
        }
        for (var i=0; i<items.length; i++) {

            var item = items[i];
            if (!item.is_group){
                continue;
            }
            if (item.id === newItem.parent_id) {
                if (newItem.is_group) {
                    newItem.children = [];
                }
                newItem.path = item.path ? (item.path + '/' + item.name) : item.name;
                newItem.text = newItem.name;
                item.children.push(newItem);
                if (maxDepth < depth + 1) {
                    maxDepth = depth + 1;
                }
                return true;
            }
            if (item.children) {
                if (addToGroup(newItem, item.children, depth+1)) {
                    return true;
                }
            }
        }
        return false;
    }

    function _indexs_sort(item) {

        if (!item.is_group) {
            return;
        }
        if (item.indexs) {
            var newChildren = [];
            var childrenMap = {};
            item.children.forEach(function (n, i) {
                childrenMap[n.id] = n;
            });
            item.indexs.split(',').forEach(function (i) {
                if (childrenMap[i]) {
                    newChildren.push(childrenMap[i]);
                    delete childrenMap[i];
                }
            });
            // 如果children的id不在indexs里，那么顺序加到后面
            for (var id in childrenMap) {
                if (!id) {
                    continue;
                }
                newChildren.push(childrenMap[id]);
            }
            item.children = newChildren;
        }
        item.children.forEach(function (child, i) {
            _indexs_sort(child);
        });
    }


    var formatted = [];
    var maxDepth = -1;

    // 先按照depth进行排序
    data = data.sort(function (a, b) {
        if (a.depth !== b.depth) {
            return a.depth - b.depth;
        }
        if (a.is_group !== b.is_group) {  // 分组排在前
            return b.is_group - a.is_group;
        }
        if (!a.name) {
            return 0;
        }
        return a.name.localeCompare(b.name, 'zh-CN');
    });

    var notInsertedNodes = []; // 上一次遍历没有找到对应位置的节点
    var insertNodeCount = 1; // 本次循环加入的节点数
    while (insertNodeCount > 0) {
        notInsertedNodes = [];
        insertNodeCount = 0;
        data.forEach(function (item) {
            var found = true;
            if (item.parent_id) {
                if (!addToGroup(item, formatted, 1)) {
                    notInsertedNodes.push(item);
                    found = false;
                }
            } else if (item.depth < 0) {
                // 根节点
                item.is_group = true;
                item.children = [];
                formatted.push(item);
            } else if (item.depth === 0 && item.parent_id === 0) {
                if (item.is_group) {
                    item.children = [];
                }
                formatted[0].children.push(item);
                if (maxDepth < 2) {
                    maxDepth = 2;
                }
            } else {
                item.children = [];
                formatted.push(item);
            }
            if (found) {
                insertNodeCount += 1;
            }
        });
        data = notInsertedNodes;
    }

    // 根据父节点的indexs对树再次进行排序
    _indexs_sort(formatted[0]);
    return formatted;
}



var dtFormat = 'YYYY-MM-DD HH:mm:ss.000';

/**
 * 根据calcMethod表示的时间间隔，生成[startTime,entTime]直接的时间列表
 * @param startTime
 * @param endTime
 * @param queryPeriod
 */
function createTimeList(startTime, endTime, queryPeriod, timeFormat) {
    var startMoment = moment(startTime, dtFormat);
    var endMoment = moment(endTime, dtFormat);
    var timeList = [];
    var resultFormat = timeFormat || 'YYYY-MM-DDTHH:mm:00.000';
    if (queryPeriod === 'QUARTER' || queryPeriod === 'HALF_HOUR') {
        var periodMinutes = queryPeriod === 'QUARTER' ? 15 : 30;
        var minuteDiff = 0;
        if (startMoment.minute() % periodMinutes !== 0) {
            minuteDiff = periodMinutes - (startMoment.minute() % periodMinutes);
        }
        startMoment.add(minuteDiff, 'm');
        var secondsDiff = endMoment.diff(startMoment, 'minutes');
        startMoment.second(0).millisecond(0);
        for (var i=0; i<=secondsDiff; i+=periodMinutes) {
            timeList.push(startMoment.format(resultFormat));
            startMoment.add(periodMinutes, 'm');
        }
    }
    else if (queryPeriod === 'HOUR') {
        startMoment.minute(0).second(0).millisecond(0);
        var hoursDiff = endMoment.diff(startMoment, 'hours');
        for (var i=0; i<=hoursDiff; i++) {
            timeList.push(startMoment.format(resultFormat));
            startMoment.add(1, 'h');
        }
    } else if (queryPeriod === 'DAY') {
        var daysDiff = endMoment.diff(startMoment, 'days');
        startMoment.hour(0).minute(0).second(0).millisecond(0);
        for (var i=0; i<=daysDiff; i++) {
            timeList.push(startMoment.format(resultFormat));
            startMoment.add(1, 'd');
        }
    } else if (queryPeriod === 'MONTH') {
        var monthsDiff = endMoment.diff(startMoment, 'months');
        startMoment.date(1).hour(0).minute(0).second(0).millisecond(0);
        for (var i=0; i<=monthsDiff; i++) {
            timeList.push(startMoment.format(resultFormat));
            startMoment.add(1, 'M');
        }
    }
    if (!timeFormat) {
        timeList.forEach(function (t, i) {
            timeList[i] = t + 'Z';
        });
    }
    return timeList;
}


/**
 * 将历史趋势数据进行补空
 * 在查询历史趋势时，如果某个时间点设备没有上报，那么返回的结果中会缺少该时间点的数据，导致time_keys不连续。因此需要将缺少的时间点补全，并将缺少的数据设置为null
 * @param startTime：数据的起始时间，与历史趋势接口中一致，格式：YYYY-MM-DD HH:mm:ss.SSS
 * @param endTime：数据的终止时间，与历史趋势接口中一致，格式：YYYY-MM-DD HH:mm:ss.SSS
 * @param queryPeriod：数据的查询时间间隔：DAY、HOUR、HALF_HOUR、QUARTER，与历史趋势接口中一致
 * @param dataTimes：历史趋势接口返回的数据中的time_keys
 * @param datas：历史趋势接口返回的数据的datas
 * @return 返回补全后的时间与数据 {time_keys: [], datas: []}
 */
function fillTrendDataVacancy(startTime, endTime, queryPeriod, dataTimes, datas, timeFormat) {
    var fullTimeKeys = createTimeList(startTime, endTime, queryPeriod, timeFormat);
// 对子设备进行求和，作为全厂区的数据
    var fullDatas = [];
    fullTimeKeys.forEach(function(time, i) {    // 全厂区的数据列表
        var index = dataTimes.indexOf(time);
        if (index >= 0) {
            fullDatas.push(datas[index]);
        } else {
            fullDatas.push(null);
        }
    });
    return {
        time_keys: fullTimeKeys,
        datas: fullDatas,
    };
}

function fillVacancyAndSumTrendData(startTime, endTime, queryPeriod, multiDatas, timeFormat) {
    var fullTimeKeys = createTimeList(startTime, endTime, queryPeriod, timeFormat);
// 对子设备进行求和，作为全厂区的数据
    var multiFullDatas = [];
    multiDatas.forEach(function (data) {
        var fullDatas = [];
        var dataTimes = data.time_keys, datas=data.datas;
        fullTimeKeys.forEach(function(time, i) {    // 全厂区的数据列表
            var index = dataTimes.indexOf(time);
            if (index >= 0) {
                fullDatas.push(datas[index]);
            } else {
                fullDatas.push(null);
            }
        });
        multiFullDatas.push(fullDatas);
    });
    var sumDatas = [];
    fullTimeKeys.forEach(function (t) {
        sumDatas.push(null);
    });
    // 求和
    multiFullDatas.forEach(function (datas) {
        datas.forEach(function (d, i) {
            if (sumDatas[i] === null) {
                sumDatas[i] = d;
            } else {
                sumDatas[i] += d;
            }
        })
    });
    // 保留数据小数点后两位
    sumDatas.forEach(function (d, i) {
        if (d) {
            sumDatas[i] = parseFloat(d.toFixed(2));
        }
    });
    return {
        time_keys: fullTimeKeys,
        datas: sumDatas,
    };
}
