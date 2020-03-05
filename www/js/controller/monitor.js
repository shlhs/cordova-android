"use strict";


app.controller('MonitorListCtrl', ['$scope', '$stateParams', 'platformService', 'scrollerService', 'ajax', 'routerService', function ($scope, $stateParams, platformService, scrollerService, ajax, routerService) {
    $scope.monitorScreens = [];
    $scope.monitorLoading = true;
    $scope.loadingFailed = false;

    var sn = GetQueryString('sn');
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
                            item.mobile_screen_link = platformService.getGraphScreenUrl(item.sn);
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
        if (window.android && window.android.setScreenOrient) {
            routerService.openPage($scope, "/templates/site/monitor-detail-template.html", {
                url: url,
                background: backgroundColor
            });
        } else {
            if (backgroundColor && backgroundColor.indexOf('#') === 0) {
                backgroundColor = backgroundColor.substring(1);     // #号在url里会导致参数被截断
            }
            location.href = "/templates/site/monitor-detail.html?url=" + url + "&background=" + backgroundColor + "&screen=h";
        }
    };

    $scope.getDataList();
}]);


app.controller('MonitorDetailCtrl', ['$scope', function ($scope) {

    var url = $scope.url;
    var iframe = document.getElementById('iframe');
    $scope.clickedBack = false;     // 是否点击过返回按钮，防止重复点击

    setTimeout(function () {
        iframe.src = url;
        $.notify.progressStart();
        if (!/*@cc_on!@*/0) { //if not IE
            iframe.onload = function(){
                $.notify.progressStop();
                window.android && window.android.setScreenOrient("LANDSCAPE");
            };
        } else {
            iframe.onreadystatechange = function(){
                if (iframe.readyState === "complete"){
                    $.notify.progressStop();
                    window.android && window.android.setScreenOrient("LANDSCAPE");
                }
            };
        }
    }, 500);

    $scope.back = function () {
        $scope.clickedBack = true;
        window.history.go(-(history.length-1));     // 站点列表页认为是history的第一个记录
    };

    function pageBackCallback() {
        window.android && window.android.setScreenOrient("PORTRAIT");
        $("#iframe").remove();
        window.removeEventListener('popstate', pageBackCallback);
    }


    window.addEventListener('popstate', pageBackCallback);
}]);