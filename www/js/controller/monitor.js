"use strict";


app.controller('MonitorListCtrl', function ($scope, $state, $stateParams, scrollerService, ajax, routerService) {
    $scope.scope = $scope;
    $scope.sn = $stateParams.sn;
    $scope.monitorScreens = [];
    $scope.monitorLoading = true;
    $scope.loadingFailed = false;

    // var sn = GetQueryString('sn');
    $scope.getDataList = function() {

        $scope.loadingFailed = false;
        $scope.monitorLoading = true;
        ajax.get({
            url: '/monitoringscreens/findByStationSn?sn=' + $scope.sn,
            success: function (data) {
                $scope.monitorLoading = false;
                $scope.monitorScreens = data;
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

    $scope.openMonitor = function (url) {
        // openPage(scope, 'templates/site/monitor-detail.html', {url: url});
        $state.go('.detail', {url: url});
    };

    $scope.getDataList();
});


app.controller('MonitorDetailCtrl', function ($scope, $stateParams) {

    var url = $stateParams.url;
    var iframe = document.getElementById('iframe');

    iframe.src = url;
    $.notify.progressStart();
    if (!/*@cc_on!@*/0) { //if not IE
        iframe.onload = function(){
            iframe.onload = null;
            $.notify.progressStop();
            // $timeout(enableZoom, 1000);
            setLandscape();
            enableZoom();
        };
    } else {
        iframe.onreadystatechange = function(){
            if (iframe.readyState === "complete"){
                $.notify.progressStop();

                enableZoom();
            }
        };
    }

    function setLandscape() {
        var width = window.screen.width, height=window.screen.height;
        if (width > height) {   // 本来就是横屏，不处理
            return;
        }
        var offset = (height-width)/2;
        $("#monitorDetailContainer").css({width: height+'px', height: width+'px', top: offset+'px', left: -offset +'px'});
    }

    function enableZoom() {
        // var el = document.querySelector('#targetObj');
        var pz = new RTP.PinchZoom($("#iframeTargetObj"), {});


    }
});