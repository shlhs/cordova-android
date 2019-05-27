// 能源管理
app.controller('EnergyHomeCtrl', function ($scope, ajax, platformService) {

    $scope.devices = [];
    $scope.stationSn = null;
    $scope.currentDevice = null;

    $scope.$on('onSiteChange', function (event, stationSn, stationName) {
        $scope.stationSn = stationSn;
        getMonitorDevices(stationSn);
    });

    function findFirstDevice(data) {
        if (!data || !data.length) {
            return null;
        }
        for (var i=0; i<data.length; i++) {
            if (!data[i].is_group) {
                return data[i];
            }
            if (data[i].children) {
                var foundDevice = findFirstDevice(data[i].children);
                if (foundDevice) {
                    return foundDevice;
                }
            }
        }
        return null;
    }

    function getMonitorDevices(stationSn) {
        if (!stationSn) {
            return;
        }
        ajax.get({
            url: '/stations/' + stationSn + '/devicetree',
            success: function (data) {
                $scope.devices = formatToTreeData(data);
                // 找到第一个设备
                $scope.currentDevice = findFirstDevice($scope.devices);
                $scope.$apply();
            }
        })
    }
});