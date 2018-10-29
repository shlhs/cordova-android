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


app.controller('MonitorDetailCtrl', function ($scope, $stateParams, cordovaService) {

    var url = $stateParams.url + "&zoom=true";
    var iframe = document.getElementById('iframe');

    iframe.src = url;
    $.notify.progressStart();
    if (!/*@cc_on!@*/0) { //if not IE
        iframe.onload = function(){
            iframe.onload = null;
            $.notify.progressStop();
            setLandscape();
        };
    } else {
        iframe.onreadystatechange = function(){
            if (iframe.readyState === "complete"){
                $.notify.progressStop();
                setLandscape();
            }
        };
    }

    function setLandscape() {
        if (cordovaService.deviceReady) {
            screen.orientation.lock('landscape');
        }

    }

    $scope.$on('$destroy', function (event) {
        if (cordovaService.deviceReady) {
            screen.orientation.unlock();
        }
    });
});


function gotoNextMonitor() {
    console.log('gotoNextMonitor');
}