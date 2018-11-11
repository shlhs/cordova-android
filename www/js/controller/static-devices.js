app.controller('StaticDevicesHomeCtrl', function ($scope, ajax, routerService) {
    var stationSn = GetQueryString("sn");
    var devices = [];       // 设备
    $scope.deviceDatas = [];
    $scope.isLoading = false;
    $scope.loadingFailed = false;

    $scope.gotoDevice = function(deviceData){
        routerService.openPage($scope, '/templates/site/static-devices/device-detail.html', {device_id: deviceData.id, device_sn: deviceData.sn});
    };

    $scope.getDataList = function() {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: '/stations/' + stationSn + '/staticdevices',
            success: function (data) {
                $scope.isLoading = false;
                // $scope.treeData = formatToTreeData(data);
                // setDefaultData();
                $scope.deviceDatas = data;
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

var OpsTaskType = [1, 2, 3, 4, 5, 6, 7, 11];


app.controller('StaticDeviceDetailCtrl', function ($scope, ajax, routerService, platformService) {
    $scope.device = {};
    $scope.showTab = 'info';
    $scope.isPC = IsPC();
    $scope.opsTaskCount = 0;        // 运维个数
    $scope.unhandledDtsCount = 0;   // 未解决缺陷个数
    $scope.closedDtsCount = 0;      // 已关闭缺陷个数
    var TaskStatus = {ToAccept: 1, ToAssign: 2, Accepted: 3, ToClose: 4, Closed: 5, Competition: 6, Coming: 7, Arrived: 8};

    function init() {
        getDeviceInfo();
        // 获取运维个数
        getOpsTaskCount();
        // 获取缺陷个数
        getDtsCount();
    }

    $scope.changeTabType = function ($event, tab) {
      $scope.showTab = tab;
    };

    function getDeviceInfo () {
        ajax.get({
            url: '/staticdevices/' + $scope.device_id,
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
                if (data.device_photo_src_link) {
                    var width = window.screen.width*2, height=Math.round(width/2);
                    data.device_photo_src_link = platformService.host + data.device_photo_src_link;
                }
                if (data.qr_photo_src_link) {
                    data.qr_photo_src_link = platformService.host + data.qr_photo_src_link;
                }
                $scope.device = data;
                $scope.$apply();
            }
        })
    }

    function getOpsTaskCount() {
        ajax.get({
            url: '/staticdevices/opstasks/count',
            data: {
                device_sn: $scope.device_sn,
                types: OpsTaskType.join(',')
            },
            success: function (response) {
                var count = 0;
                for (var stageId in response) {
                    count += response[stageId];
                }
                $scope.opsTaskCount = count;
                $scope.$apply();
            }
        });
    }

    function getDtsCount() {
        var taskTypes = [8, 9, 10];
        ajax.get({
            url: '/staticdevices/opstasks/count',
            data: {
                device_sn: $scope.device_sn,
                types: taskTypes.join(',')
            },
            success: function (response) {
                var closed = 0;
                var unhandled = 0;
                for (var stageId in response) {
                    if (parseInt(stageId) === TaskStatus.Closed) {
                        closed += response[stageId];
                    } else {
                        unhandled += response[stageId];
                    }
                }
                $scope.unhandledDtsCount = unhandled;
                $scope.closedDtsCount = closed;
                $scope.$apply();
            }
        });

    }

    $scope.startDeviceEditor = function () {
        routerService.openPage($scope, '/templates/site/static-devices/device-edit.html',
            {
                id: $scope.device.id,
                onSave: function (data, photoLink) {
                    $.extend($scope.device, data);
                    $scope.device.device_photo_src_link = platformService.host + photoLink;
                }
            }
        );
    };

    $scope.gotoDtsList = function () {
        window.location.href = '/templates/site/static-devices/device-dts-history.html?device_sn=' + $scope.device.sn + '&station_sn=' + $scope.device.station_sn;
    };

    $scope.gotoOpsList = function () {
        window.location.href = '/templates/task/task-list.html?device_sn=' + $scope.device.sn;
    };

    init();
});

function onAndroid_deviceImageImport(imageData, filename) {    // 从Android读取的图片
    var scope = angular.element('#staticDeviceEditPage').scope();
    // var scope = angular.element('#handlePage').scope();
    if (scope) {
        scope.addImagesWithBase64(imageData, filename);
    }
}

app.controller('StaticDeviceEditCtrl', function ($scope, ajax, routerService, platformService) {
    $scope.device = {};
    $scope.showTab = 'info';
    $scope.editObj = {};
    $scope.deviceImage = null;
    $scope.useMobileGallery = window.android && window.android.openGallery;

    // 先清除上一次选择的图片
    window.android && window.android.clearSelectedPhotos();

    $scope.changeTabType = function ($event, tab) {
        $scope.showTab = tab;
    };

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
                        });
                    }
                }

                if (data.device_photo_src_link) {
                    data.device_photo_src_link = platformService.host + data.device_photo_src_link;
                }
                if (data.qr_photo_src_link) {
                    data.qr_photo_src_link = platformService.host + data.qr_photo_src_link;
                }

                $scope.deviceImage = data.device_photo_src_link;
                data.device_photo_src_link = null;
                $scope.device = parseDeviceData(data);
                $scope.$apply();
            }
        })
    };

    function parseDeviceData(data) {
        // 将设备数据中的属性由字符串转成列表
        if (!data.properties) {
            data.properties = [];
        } else if (typeof data.properties === 'string') {
            data.properties = JSON.parse(data.properties);
        }
        if (data.items) {
            data.items.forEach(function (item) {
                if (!item.properties) {
                    item.properties = [];
                } else if (typeof item.properties === 'string') {
                    item.properties = JSON.parse(item.properties);
                }
            });
        }
        return data;
    }

    function stringifyDeviceData(data) {
        // 将设备和子部件的属性由列表转成字符串
        var tmpData = JSON.parse(JSON.stringify(data));
        tmpData.properties = JSON.stringify(data.properties);
        if (tmpData.items) {
            tmpData.items.forEach(function (item) {
               if (item.properties) {
                   item.properties = JSON.stringify(item.properties);
               }
            });
        }
        return tmpData;
    }

    $scope.onClickEditItem = function (items, index) {
        // 点击编辑子部件名
        routerService.openPage($scope, '/templates/site/static-devices/item-name-edit-modal.html',
            {
                name: items[index].name,
                confirm: function (name) {
                    items[index].name = name;
                    history.back();
                }
            }, {
                hidePrev: false
            });
    };

    $scope.onClickDeleteItem = function ($event, items ,index) {
        // 点击删除子部件
        $event.stopPropagation();
        items.splice(index, 1);
    };

    $scope.onClickAddItem = function (items) {
        // 点击增加子部件
        routerService.openPage($scope, '/templates/site/static-devices/item-name-edit-modal.html',
            {
                name: '',
                confirm: function (name) {
                    if (name) {
                        items.push({
                            name: name,
                            properties: []
                        });
                    }
                    history.back();
                }
            }, {
                hidePrev: false
            });
    };

    $scope.onClickEditProperty = function (properties, index) {
        // 点击编辑属性
        routerService.openPage($scope, '/templates/site/static-devices/property-edit-modal.html',
            {
                title: properties[index].name,
                value: properties[index].value,
                confirm: function (title, value) {
                    properties[index].name = title;
                    properties[index].value = value;
                    history.back();
                }
            }, {
                hidePrev: false
            });
    };

    $scope.onClickDeleteProperty = function ($event, properteis, index) {
        // 点击删除属性
        $event.stopPropagation();
        properteis.splice(index, 1);
    };

    $scope.onClickAddProperty = function (properties) {
        // 点击增加属性
        routerService.openPage($scope, '/templates/site/static-devices/property-edit-modal.html',
            {
                title: '',
                value: '',
                confirm: function (title, value) {
                    if (title && value) {
                        properties.push({
                            name: title,
                            value: value
                        });
                    }
                    history.back();
                }
            }, {
                hidePrev: false
            });
    };

    $scope.onClickEditDevice = function (keyTitle, keyName) {
        // 编辑设备属性
        routerService.openPage($scope, '/templates/site/static-devices/device-edit-modal.html',
            {
                title: keyTitle,
                value: $scope.device[keyName],
                confirm: function (value) {
                    if (value) {
                        $scope.device[keyName] = value;
                    }
                    history.back();
                }
            }, {
                hidePrev: false
            });

    };

    $scope.chooseImage = function (files) {     // 选择图片
        $scope.canDelete = true;
        for (var i = 0; i < files.length; i++) {
            var reader = new FileReader(), file=files[i];
            reader.readAsDataURL(file);
            reader.onloadstart = function () {
                //用以在上传前加入一些事件或效果，如载入中...的动画效果
            };
            reader.onload = function (event) {
                var img = new Image();
                img.src = event.target.result;
                img.onload = function(){
                    var quality =  75;
                    var dataUrl = imageHandler.compress(this, 75, file.orientation).src;
                    $scope.deviceImage = dataUrl;
                    $scope.device.device_photo_src_link = dataUrl;
                    $scope.$apply();
                };
            };
        }
    } ;

    $scope.openMobileGallery = function () {
        window.android.openGallery(1, 'onAndroid_deviceImageImport', null);
    };

    $scope.chooseDeviceImage = function () {
        // 上传设备图片

    };

    $scope.addImagesWithBase64 = function (data, filename) {
        $scope.deviceImage = data;
        $scope.device.device_photo_src_link = data;
        $scope.$apply();
    };


    $scope.chooseDeviceQr = function () {
        // 上传二维码
    };

    $scope.save = function () {
        $.notify.progressStart();
        var params = stringifyDeviceData($scope.device);
        ajax.patch({
            url: '/stations/' + $scope.device.station_sn + '/staticdevices/' + $scope.device.id,
            data: JSON.stringify(params),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            success: function (response) {
                $.notify.progressStop();
                $.notify.info('更新成功');
                $scope.device = parseDeviceData(response);
                if ($scope.onSave) {
                    $scope.onSave($scope.device, response.device_photo_src_link);
                }
                $scope.device.device_photo_src_link = null;      // 默认使用$scope.deviceImage显示图片
                $scope.$apply();
            },
            error: function () {
                $.notify.progressStop();
                $.notify.error('更新失败');
                console.log('error');
            }
        })
    };


    $scope.getDataList();
});