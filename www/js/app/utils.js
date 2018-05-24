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