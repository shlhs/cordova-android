"use strict";


app.controller('MonitorListCtrl', function ($scope, $state, routerService, scrollerService, ajax, platformService) {
    $scope.scope = $scope;
    // $scope.sn = $stateParams.sn;
    $scope.monitorScreens = [];
    $scope.monitorLoading = true;
    $scope.loadingFailed = false;

    // var sn = GetQueryString('sn');
    $scope.getDataList = function() {

        $scope.loadingFailed = false;
        $scope.monitorLoading = true;
        var graphHost = platformService.getGraphHost();
        ajax.get({
            url: graphHost + '/graphs/findByParentIndex?index='+$scope.sn,     // 新的监控画面接口
            success: function (data) {
                $scope.monitorLoading = false;
                $scope.monitorScreens = [];
                data.forEach(function (item, i) {
                    if (item.userVisible === 1) {
                        if (item.type = 'KK') {
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

    $scope.openMonitor = function (item) {
        var url = item.mobile_screen_link;
        var backgroundColor = item.background;
        routerService.openPage($scope, 'templates/site/monitor-detail.html', {
            url: url,
            background: backgroundColor
        });
        // $state.go('.detail', {url: url});
    };

    $scope.getDataList();
});


app.controller('MonitorDetailCtrl', function ($scope, cordovaService) {
    var url = $scope.url;
    var iframe = document.getElementById('iframe');

    var originHistoryLen = history.length;      // 记录location history初始的个数
    setTimeout(function () {
        setLandscape();
        // iframe.src = url;
        iframe.contentWindow.location.replace(url);
        $.notify.progressStart();
        if (!/*@cc_on!@*/0) { //if not IE
            iframe.onload = function(){
                iframe.onload = null;
                $.notify.progressStop();
                // setLandscape();
                // enableZoom();
            };
        } else {
            iframe.onreadystatechange = function(){
                if (iframe.readyState === "complete"){
                    $.notify.progressStop();

                    // enableZoom();
                }
            };
        }
    }, 500);

    $scope.back = function () {
        var currentHistoryLen = history.length;
        window.history.go(-(currentHistoryLen - originHistoryLen));
    };

    function setLandscape() {
        // 设置横屏
        // var width = window.screen.width, height=window.screen.height;
        // if (width > height) {   // 本来就是横屏，不处理
        //     return;
        // }
        // var offset = (height-width)/2;
        // $("#monitorDetailContainer").css({width: height+'px', height: width+'px', top: offset+'px', left: -offset +'px'});
        if (cordovaService.deviceReady) {
            screen.orientation.lock('landscape');
        }
    }

    function enableZoom() {
        new window.PinchZoom.default(document.querySelector('#iframeTargetObj'), {});
    }

    $scope.$on("$destroy", function (event) {
        // 页面离开时，恢复竖屏
        if (cordovaService.deviceReady) {
            screen.orientation.lock('portrait');
        } else if (window.android && window.android.setPortrait) {
            window.android.setPortrait();
        }
    });

    // 先删掉iframe，再后退，防止出现页面卡顿
    function deleteIframe() {
        $("#iframe").remove();
        window.removeEventListener('popstate', deleteIframe);
    }

    window.addEventListener('popstate', deleteIframe);
});