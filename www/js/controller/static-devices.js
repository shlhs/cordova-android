app.controller('StaticDevicesHomeCtrl', function ($scope, $http, routerService) {

    $scope.allRooms = [];

    $scope.openPage = function(template, params, config){
        routerService.openPage($scope, template, params, config);
    };


    $http.get('/templates/site/static-devices/data.json').then(function (result) {
        $scope.allRooms = result.data;
    });
});

app.controller('StaticDeviceSubListCtrl', function ($scope) {
    $scope.openPage = function (deviceData) {
        if (deviceData.types) {
            $scope.$parent.openPage('/templates/site/static-devices/sub-device-list.html', {deviceData: deviceData});
        } else {
            $scope.$parent.openPage('/templates/site/static-devices/device-detail.html', {deviceData: deviceData});
        }
    }
});

app.controller('StaticDeviceDetailCtrl', function ($scope) {

});