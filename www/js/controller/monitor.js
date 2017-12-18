"use strict";


app.controller('MonitorListCtrl', function ($scope, $stateParams, scrollerService, ajax) {
    $scope.monitorScreens = [];
    $scope.monitorLoading = true;
    var sn = GetQueryString('sn');
    function getDataList () {

        ajax.get({
            url: '/monitoringscreens/findByStationSn?sn=' + sn,
            success: function (data) {
                $scope.monitorLoading = false;
                $scope.monitorScreens = data;
                scrollerService.initScroll('#monitors', getDataList);
                $scope.$apply();
            },
            error: function (xhr, status, error) {
                $scope.monitorLoading = false;
                $.notify.error('获取监控画面失败');
                $scope.$apply();
            }
        });
    }

    getDataList();
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