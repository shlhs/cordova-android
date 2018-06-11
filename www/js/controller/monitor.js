"use strict";


app.controller('MonitorListCtrl', function ($scope, $stateParams, scrollerService, ajax) {
    $scope.monitorScreens = [];
    $scope.monitorLoading = true;
    $scope.loadingFailed = false;

    var sn = GetQueryString('sn');
    $scope.getDataList = function() {

        $scope.loadingFailed = false;
        $scope.monitorLoading = true;
        ajax.get({
            url: '/monitoringscreens/findByStationSn?sn=' + sn,
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

    $scope.getDataList();
});


app.controller('MonitorDetailCtrl', function ($stateParams) {

    var url = GetQueryString('url');
    var iframe = document.getElementById('iframe');
    iframe.src = url;
    $.notify.progressStart();
    if (!/*@cc_on!@*/0) { //if not IE
        iframe.onload = function(){
            $.notify.progressStop();
        };
    } else {
        iframe.onreadystatechange = function(){
            if (iframe.readyState === "complete"){
                $.notify.progressStop();
            }
        };
    }
});