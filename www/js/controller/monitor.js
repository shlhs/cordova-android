"use strict";


app.controller('MonitorListCtrl', ['$scope', '$stateParams', 'platformService', 'scrollerService', 'ajax', 'routerService', function ($scope, $stateParams, platformService, scrollerService, ajax, routerService) {
    $scope.monitorScreens = [];
    $scope.monitorLoading = true;
    $scope.loadingFailed = false;

    var sn = $stateParams.sn;
    $scope.getDataList = function() {

        $scope.loadingFailed = false;
        $scope.monitorLoading = true;
        var graphHost = platformService.getGraphHost();
        ajax.get({
            // url: '/monitoringscreens/findByStationSn?sn=' + sn,
            url: graphHost + '/graphs/findByParentIndex?index='+sn,     // 新的监控画面接口
            success: function (data) {
                $scope.monitorLoading = false;
                $scope.monitorScreens = [];
                data.forEach(function (item, i) {
                    if (item.userVisible === 1) {
                        if (item.type === 'KK') {
                            item.mobile_screen_link = platformService.getGraphScreenUrl(item.sn, item.mode);
                        } else {
                            item.mobile_screen_link = platformService.getOldMonitorScreenUrl(item.sn);
                        }
                        $scope.monitorScreens.push(item);
                    }
                });
                scrollerService.initScroll('#monitors', $scope.getDataList);
                $scope.$apply();
            },
            error: function (xhr, status, error) {
                $scope.monitorLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    $scope.openMonitorDetail = function (item) {
        var url = item.mobile_screen_link;
        var backgroundColor = item.background;
        routerService.openPage($scope, "/templates/site/monitor-detail-template.html", {
            url: url,
            mode: item.mode,
            background: backgroundColor
        });
    };

    $scope.getDataList();
}]);


app.controller('MonitorDetailCtrl', ['$scope', function ($scope) {

    var url = $scope.url;
    var mode = $scope.mode;
    var iframe = document.getElementById('iframe');
    $scope.clickedBack = false;     // 是否点击过返回按钮，防止重复点击
    setTimeout(function () {
        window.android && window.android.setScreenOrient("LANDSCAPE");
        if (!/*@cc_on!@*/0) { //if not IE
            iframe.onload = function(){
                $.notify.progressStop();
                // window.android && window.android.setScreenOrient("LANDSCAPE");
            };
        } else {
            iframe.onreadystatechange = function(){
                if (iframe.readyState === "complete"){
                    $.notify.progressStop();
                    // window.android && window.android.setScreenOrient("LANDSCAPE");
                }
            };
        }
        if (mode === '3d') {
            setTimeout(function () {
                $.notify.progressStart();
                iframe.src = url;
            }, 300);
        } else {
            $.notify.progressStart();
            iframe.src = url;
        }
    }, 500);

    $scope.back = function () {
        if (!$scope.clickedBack) { // 避免多次点击后多次后退
            $scope.clickedBack = true;
            history.back();
        }
    };

    function pageBackCallback() {
        window.android && window.android.setScreenOrient("PORTRAIT");
        $("#iframe").remove();
        window.removeEventListener('popstate', pageBackCallback);
        window.removeEventListener('message', postMessageToIframe);
    }

    function postMessageToIframe (e) {
        var frames = window.frames;
        for(var i=0; i<frames.length; i++) {
            frames[i].postMessage('Bearer' + (getStorageItem('accountToken') || ''), '*');
        }
    }

    window.addEventListener('popstate', pageBackCallback);
    window.addEventListener('message', postMessageToIframe, false);

    $scope.$on('$destroy', function () {
        $.notify.progressStop();
    });
}]);