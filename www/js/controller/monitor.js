"use strict";


app.controller('MonitorListCtrl', function ($scope, $stateParams, platformService, scrollerService, ajax, routerService) {
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

    $scope.openMonitorDetail = function () {
        routerService.openPage($scope, '/templates/site/monitor-detail.html?url={{screen.mobile_screen_link}}&screen=h');
    };

    $scope.openMonitorDetail = function (url) {
        if (window.android && window.android.setScreenOrient) {
            routerService.openPage($scope, "/templates/site/monitor-detail-template.html", {
                url: url
            });
        } else {
            location.href = "/templates/site/monitor-detail.html?url=" + url + "&screen=h";
        }
    };

    $scope.getDataList();
});


app.controller('MonitorDetailCtrl', function ($scope) {

    var url = $scope.url;
    var iframe = document.getElementById('iframe');
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

    function pageBackCallback() {
        window.android && window.android.setScreenOrient("PORTRAIT");
        $("#iframe").remove();
        window.removeEventListener('popstate', pageBackCallback);
    }

    window.addEventListener('popstate', pageBackCallback);
});