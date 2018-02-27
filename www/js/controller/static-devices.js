app.controller('StaticDevicesHomeCtrl', function ($scope, ajax, routerService) {
    var stationSn = GetQueryString("sn");
    var devices = [];       // 设备
    $scope.allDevices = [];

    $scope.openPage = function(deviceData){
        if (deviceData.is_group) {
            routerService.openPage($scope, '/templates/site/static-devices/sub-device-list.html', {groupData: deviceData});
        } else {
            routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {device: deviceData});
        }
    };

    function formatToTreeData(data) {

        function addToGroup(newItem, items) {
            if (!items || !items.length) {
                return;
            }
            for (var i=0; i<items.length; i++) {

                var item = items[i];
                if (!item.is_group){
                    continue;
                }
                if (item.id === newItem.parent_id) {
                    if (newItem.is_group) {
                        newItem.children = [];
                    }
                    newItem.text = newItem.name;
                    item.children.push(newItem);
                    return true;
                }
                if (item.children) {
                    if (addToGroup(newItem, item.children)) {
                        return true;
                    }
                }
            }

        }

        data.sort(function (a, b) {
            return a.depth > b.depth;
        });

        var formatted = [];

        // 先按照depth进行排序
        data.forEach(function (item) {
            if (!item.is_group) {
                devices.push(item);
            }
            if (item.parent_id) {
                addToGroup(item, formatted);
            } else {
                item.text = item.name;
                item.children = [];
                formatted.push(item);
            }
        });
        return formatted;
    }

    function getDevices() {
        ajax.get({
            url: '/stations/' + stationSn + '/staticdevices',
            success: function (data) {
                $scope.allDevices = formatToTreeData(data);
                $scope.$apply();
            }
        })
    }

    getDevices();
});

app.controller('StaticDeviceSubListCtrl', function ($scope, ajax) {
    $scope.noDevice = false;
    $scope.groups = [];
    $scope.devices = [];

    function init() {
        var children = $scope.groupData.children;
        if (!children || !children.length) {
            $scope.noDevice = true;
            return;
        }
        children.forEach(function (n) {
            if (n.is_group){
                $scope.groups.push(n);
            } else {
                $scope.devices.push(n);
            }
        });
        if (!$scope.groupData.isDetailed)
        {
            getDevicesDetail();
        }
    }

    // 获取设备的详情
    function getDevicesDetail() {
        if (!$scope.devices.length) {
            return;
        }
        var idList = [];
        $scope.devices.forEach(function (t) {
            idList.push(t.id);
        });

        ajax.get({
            url: '/staticdevices/details?ids=' + idList.join(','),
            success: function (data) {
                data.forEach(function (device) {
                    // 设备无任何属性或部件，提示无信息
                    if (!device.product && (!device.properties || !device.properties.length) && (!device.items || !device.items.length)) {
                        device.isEmpty = true;
                        return;
                    }
                    // 如果设备配置了产品信息，从产品信息中读取厂家、类型、型号三个属性
                    device.properties = device.properties ? JSON.parse(device.properties) : [];
                    if (device.product) {
                        device.properties.unshift({name: "设备型号", value: device.product.model_number});
                        device.properties.unshift({name: "设备类型", value: device.product.type});
                        device.properties.unshift({name: "生产厂家", value: device.product.provider.name});
                    }
                    if (device.items) {
                        device.items.forEach(function (d) {
                            d.properties = d.properties ? JSON.parse(d.properties) : [];
                        });
                    }
                });
                // 如果只有一个设备，默认展开显示
                if (data.length === 1) {
                    data[0].visible = true;
                }
                $scope.devices = data;
                $scope.groupData.children = [].concat($scope.groups).concat($scope.devices);
                $scope.groupData.isDetailed = true; // 是否已获取过详细信息
                $scope.$apply();
            }, error: function (xhr, status, error) {

            }
        })
    }

    $scope.toggleContent = function (device) {      // 显示或隐藏设备详情
        device.visible = !device.visible;
    };

    init();
});

app.controller('StaticDeviceDetailCtrl', function ($scope) {

});