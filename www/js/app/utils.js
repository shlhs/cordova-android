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
    if (window.android){
        location.href = '/app/home';
    }else{
        history.back();
        return false;
    }
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


function GetQueryString(name)
{
    var search = window.location.search.substring(1), params = search.split('&');
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
    }else{
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