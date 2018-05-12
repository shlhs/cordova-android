app.controller('StaticDevicesHomeCtrl', function ($scope, ajax, routerService) {
    var stationSn = GetQueryString("sn");
    var devices = [];       // 设备
    $scope.treeData = [];
    $scope.isLoading = false;
    $scope.loadingFailed = false;
    $scope.ellapseId = null;
    $scope.selectOptions = [null, null, null, null, null];       // select内容按5级显示
    $scope.deviceSelected = [null, null, null, null, null];
    $scope.collapse = [false, false, 0];        // 表示选择器是否展开，一级、二级用true/false表示是否展开，三级用数据id表示
    $scope.maxDepth = -1;

    $scope.openPage = function(deviceData){
        if (deviceData.is_group) {
            routerService.openPage($scope, '/templates/site/static-devices/sub-device-list.html', {groupData: deviceData});
        } else {
            routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {id: deviceData.id});
        }
    };


    function formatToTreeData(data) {

        function addToGroup(newItem, items, depth) {
            if (!items || !items.length) {
                return;
            }
            if (depth > maxDepth) {
                maxDepth = depth;
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
                    if (maxDepth < depth + 1) {
                        maxDepth = depth + 1;
                    }
                    return true;
                }
                if (item.children) {
                    if (addToGroup(newItem, item.children, depth+1)) {
                        return true;
                    }
                }
            }

        }

        function _indexs_sort(item) {

            if (!item.is_group) {
                return;
            }
            if (item.indexs) {
                const newChildren = [];
                const childrenMap = {};
                item.children.forEach(function (n, i) {
                    childrenMap[n.id] = n;
                });
                item.indexs.split(',').forEach(function (i) {

                    if (childrenMap[i]) {
                        newChildren.push(childrenMap[i]);
                    }
                });
                item.children = newChildren;
            }
            item.children.forEach(function (child, i) {
                _indexs_sort(child);
            });
        }


        var formatted = [];
        var maxDepth = -1;

        // 先按照depth进行排序
        data = data.sort(function (a, b) {
            if (a.depth !== b.depth) {
                return a.depth - b.depth;
            }
            if (a.is_group !== b.is_group) {  // 分组排在前
                return b.is_group - a.is_group;
            }
            return a.name.localeCompare(b.name, 'zh-CN');
        });

        data.forEach(function (item) {
            if (item.parent_id) {
                addToGroup(item, formatted, 1);
            } else if (item.depth < 0) {
                // 根节点
                item.text = item.name;
                item.is_group = true;
                item.children = [];
                formatted.push(item);
            } else {
                item.text = item.name;
                item.children = [];
                formatted.push(item);
            }
        });

        // 根据父节点的indexs对树再次进行排序
        _indexs_sort(formatted[0]);
        $scope.maxDepth = maxDepth - 1;
        return formatted;
    }

    function setDefaultData(startDepth) {       //
        if (!startDepth) {
            var range = $scope.treeData[0].children, start=5-$scope.maxDepth;
        } else {
            var range = $scope.deviceSelected[startDepth-1].children, start=startDepth;
        }
        for (var i=0; i<$scope.maxDepth; i++) {
            if (range && range.length) {
                $scope.selectOptions[start+i] = range;
                if (range[0].group) {
                    $scope.deviceSelected[start+i] = range[0];
                }
                if (start+i===2 && range[0].group) {
                    // 默认展开被选中的group
                    $scope.collapse[2] = range[0].id;
                }
                range = range[0].children;
            } else {
                $scope.selectOptions[start+i] = null;
                $scope.deviceSelected[start+i] = null;
            }
        }
    }

    $scope.toggle = function ($event) {
        $scope.ellapseId = '1';
    };

    $scope.toggleCollapse = function (index) {
        // 点击下拉选择，显示或隐藏下拉选择框
        if (index < 0) {
            for (var i=0; i<2; i++) {
                $scope.collapse[i] = false;
            }
        } else {
            if (index === 1) {
                // 如果第二个选择框没有数据，则无法弹出
                if (!$scope.deviceSelected[1]) {
                    return;
                }
            }
            if ($scope.collapse[index]) {
                $scope.collapse[index] = false;
            } else {
                $scope.collapse[index] = true;
                $scope.collapse[1-index] = false;
            }
        }
    };

    var thirdSelectorCurrentCollapse = null;
    // 点击选中某一个设备或分组
    $scope.chooseDeviceOrGraph = function (selectorIndex, itemData) {   // selectorIndex: 是第几个选择器

        if (!itemData.group) {
            // 跳转到设备监测详情
            $scope.openPage(itemData);
            return;
        }
        if (selectorIndex === 0 || selectorIndex === 1)
        {
            $scope.deviceSelected[selectorIndex] = itemData;
            setDefaultData(selectorIndex+1);
            $scope.toggleCollapse(selectorIndex);
        }
        else if (selectorIndex === 2) {
            if (itemData.group) {
                if ($scope.collapse[2] === itemData.id) {
                    $scope.collapse[2] = -1;
                } else {
                    $scope.collapse[2] = itemData.id;
                }
                thirdSelectorCurrentCollapse = itemData;
            }
        } else if (selectorIndex === 3) {
            $scope.deviceSelected[selectorIndex] = itemData;
            // 设置上一级为父节点
            $scope.deviceSelected[selectorIndex-1] = thirdSelectorCurrentCollapse;
            setDefaultData(selectorIndex+1);
        }
        return false;
    };

    $scope.getDataList = function() {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: '/stations/' + stationSn + '/staticdevices',
            success: function (data) {
                $scope.isLoading = false;
                $scope.treeData = formatToTreeData(data);
                setDefaultData();
                $scope.$apply();
            }, error: function () {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        })
    };

    $scope.getDataList();
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

app.controller('StaticDeviceDetailCtrl', function ($scope, ajax) {
    $scope.device = {};

    $scope.getDataList = function () {
        ajax.get({
            url: '/staticdevices/' + $scope.id,
            success: function (data) {
                if (data.properties) {
                    data.properties = JSON.parse(data.properties);
                    if (data.items) {
                        data.items.forEach(function (n, i) {
                            if (n.properties) {
                                n.properties = JSON.parse(n.properties);
                            }

                        })
                    }
                }
                $scope.device = data;
                $scope.$apply();
            }
        })
    };

    $scope.getDataList();
});