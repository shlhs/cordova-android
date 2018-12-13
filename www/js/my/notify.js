
/**
 * Created by liucaiyun on 2017/8/25.
 */

$.notify = {
    _notifyObj: null,
    _createMsg: function (type, msg, interval, inCenter) { // type: info, error
        var iconClass = 'mui-icon mui-icon-checkmarkempty';
        if (type == 'error')  iconClass = 'mui-icon mui-icon-info';
        else if (type == 'progress') iconClass = 'mui-icon mui-icon-reload spinner';
        var hasTextClass = msg ? 'mui-popup-inner has-text' : 'mui-popup-inner';
        var otherClass = inCenter ? "in-center" : "";
        var lines =
            '<div class="mui-popup-backdrop mui-active notify ' + otherClass + '">\
            <div class="mui-popup mui-popup-in">\
            <div class="' + hasTextClass + '">\
            <div class="mui-popup-icon"><span class="' + iconClass + '"></span></div>\
            <div class="mui-popup-text">' + msg + '</div>\
            </div>\
            </div>\
            </div>';
        if (this._notifyObj){
            this._notifyObj.remove();
            this._notifyObj = null;
        }
        this._notifyObj = $(lines).appendTo($('body'));
        var self = this;
        if (type != 'progress'){
            interval = interval ? interval : 1500;
            setTimeout(function () {
                self._notifyObj && self._notifyObj.remove();
                self._notifyObj = null;
            }, interval);
        }
    },
    info: function (msg, interval) {
        this._createMsg('info', msg, interval);
    },
    error: function (msg, interval) {
        this._createMsg('error', msg, interval);
    },
    progressStart: function (msg, inCenter) {
        this._createMsg('progress', msg, null, inCenter);
    },
    progressStop: function(){
        this._notifyObj && this._notifyObj.remove();
        self._notifyObj = null;
    },
    toast: function(message, interval) {
        var div = $('<div class="toast"><div class="msg">' + message + '</div></div>').appendTo($('body'));
        if (interval === undefined) {
            interval = 2000;
        }
        setTimeout(function () {
            div.remove();
        }, interval);
    }
};