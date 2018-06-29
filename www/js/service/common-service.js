"use strict";

app.service('cordovaService', function (fileService, $timeout) {

    var self=this, deviceReady = false, networkValid=true;

    function init() {
        // alert('listen for device ready');
        document.addEventListener("deviceready", onDeviceReady,false);
    }

    this.checkVersionUpdate = function() {      // 检查版本是否有更新
        if (typeof(chcp) === 'undefined'){
            return;
        }
        chcp.fetchUpdate(updateCallback);
        function updateCallback(error, data) {
            if (error){
                console.log("version check: " + JSON.stringify(error));
            }
            // 如果error 为空，且data不为空，则说明有需要安装的更新
            if (!error && data && data.config && data.config.content_url){
                mui.alert("请先升级新版本，升级完毕应用将自动重启", "检测到新版本", "升级", function () {
                    $.notify.info('正在升级，升级完毕应用将自动重启...');
                    chcp.installUpdate(function (error) {
                        if (error && error.description){
                            mui.alert(error.description, '升级失败', '知道了');
                        }
                    });
                });
            }
        }
    };


    function onDeviceReady() {
        // alert('deviceready');
        deviceReady = true;
        if (cordova && cordova.InAppBrowser)
        {
            console.log("window.open works well");
            window.open = cordova.InAppBrowser.open;
        }
        onNetworkState();

        // document.addEventListener("pause", appOnPause, false);       // 监听app是否进入后台
        // document.addEventListener("resume", appOnResume, false);     // 监听app是否重新打开
        document.addEventListener("offline", onNetworkState, false);
        document.addEventListener("online", onNetworkState, false);
        // if (device)
        // {
        //     fileService.log('device ready: ' + JSON.stringify(self.getDeviceInfo()));
        // }else{
        //     fileService.log('device ready');
        // }
    }

    function onNetworkState() {
        if (deviceReady && typeof (Connection) !== 'undefined') {
            var networkState = navigator.connection.type;
            if (networkState !== Connection.NONE){
                networkValid = true;
            }else{
                networkValid = false;
                mui.toast('网络异常，请检查网络', {duration:'long'});
            }
        }
    }

    this.networkIsValid = function () {
        return networkValid;
    };

    this.getDeviceInfo = function () {      // 获取设备信息
        if (!deviceReady){
            return null;
        }
        return {
            platform: device.platform,
            version: device.version,
            model: device.model
        };
    };

    init();
});


app.service('scrollerService', function ($timeout) {


    this.initScroll = function(elementQuery, upFn) {
        var element = angular.element(elementQuery);
        if (!element.data('scrollInited') && element.hasClass("scroll-wrapper")){
            var dropload = element.dropload({
                domUp : {
                    domClass   : 'dropload-up',
                    domRefresh : '<div class="dropload-refresh">↓下拉刷新</div>',
                    domUpdate  : '<div class="dropload-update">↑释放更新</div>',
                    domLoad    : '<div class="dropload-load"><span class="loading"></span>加载中...</div>'
                },
                loadUpFn : function(me){
                    // angular.element(elementQuery).scope().getDataList();
                    upFn.call();
                    dropload.resetload();
                }
            });
            element.data('scrollInited', true);
        }
    };

});


app.directive('deviceTreeView',[function(){
    return {
        restrict: 'E',
        templateUrl: 'templates/site/common-device-tree.html',
        scope: {
            deviceList: '=',
            gotoDevice: '='
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
            var deviceDataList = $scope.deviceList;
            $scope.treeData = [];
            $scope.selectOptions = [null, null, null, null, null];       // select内容按5级显示
            $scope.deviceSelected = [null, null, null, null, null];
            $scope.collapse = [false, false, 0];        // 表示选择器是否展开，一级、二级用true/false表示是否展开，三级用数据id表示
            $scope.maxDepth = -1;

            function formatToTreeData(data) {

                function addToGroup(newItem, items, depth) {
                    if (!items || !items.length) {
                        return false;
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
                    return false;
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
                                delete childrenMap[i];
                            }
                        });
                        // 如果children的id不在indexs里，那么顺序加到后面
                        for (var id in childrenMap) {
                            if (!id) {
                                  continue;
                                }
                            newChildren.push(childrenMap[id]);
                        }
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

                    if (a.is_group !== b.is_group) {  // 分组排在前
                        return b.is_group - a.is_group;
                    }
                    if (!a.name) {
                        return 0;
                    }
                    return a.name.localeCompare(b.name, 'zh-CN');
                });

                var notInsertedNodes = []; // 上一次遍历没有找到对应位置的节点
                var insertNodeCount = 1; // 本次循环加入的节点数
                while (insertNodeCount > 0) {
                    notInsertedNodes = [];
                    insertNodeCount = 0;
                    data.forEach(function (item) {
                        var found = true;
                        if (item.parent_id) {
                            if (!addToGroup(item, formatted, 1)) {
                                notInsertedNodes.push(item);
                                found = false;
                            }
                        } else if (item.depth < 0) {
                            // 根节点
                            item.text = item.name;
                            item.is_group = true;
                            item.children = [];
                            formatted.push(item);
                        } else if (item.depth === 0 && item.parent_id === 0) {
                            if (item.is_group) {
                                item.children = [];
                            }
                            item.text = item.name;
                            formatted[0].children.push(item);
                            if (maxDepth < 2) {
                                maxDepth = 2;
                            }
                        } else {
                            item.text = item.name;
                            item.children = [];
                            formatted.push(item);
                        }
                        if (found) {
                            insertNodeCount += 1;
                        }
                    });
                    data = notInsertedNodes;
                }

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
                    $scope.gotoDevice(itemData);
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

            $scope.treeData = formatToTreeData(deviceDataList);
            setDefaultData();
        }]
    };
}]);