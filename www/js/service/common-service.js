"use strict";

app.service('cordovaService', function (fileService, $timeout) {
    this.deviceReady = false;

    var self=this, networkValid=true;

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
        self.deviceReady = true;
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
        // initQrScan();
    }

    function onNetworkState() {
        if (self.deviceReady && typeof (Connection) !== 'undefined') {
            var networkState = navigator.connection.type;
            if (networkState !== Connection.NONE){
                networkValid = true;
            }else{
                networkValid = false;
                mui.toast('网络异常，请检查网络', {duration:'long'});
            }
        }
    }

    function onQrScanDone(err, status){
        if (err) {
            // here we can handle errors and clean up any loose ends.
            console.error(err);
            alert('scan init err:' + 0);
        }
        if (status.authorized) {
            // W00t, you have camera access and the scanner is initialized.
            // QRscanner.show() should feel very fast.
            alert('scan init err:' + 1);

        } else if (status.denied) {
            // The video preview will remain black, and scanning is disabled. We can
            // try to ask the user to change their mind, but we'll have to send them
            // to their device settings with `QRScanner.openSettings()`.
            alert('scan init err:' + 2);
        } else {
            // we didn't get permission, but we didn't get permanently denied. (On
            // Android, a denial isn't permanent unless the user checks the "Don't
            // ask again" box.) We can ask again at the next relevant opportunity.
            alert('scan init err:' + 3);

        }
    }

    function initQrScan() {
        QRScanner.prepare(onQrScanDone); // show the prompt
    }
    this.networkIsValid = function () {
        return networkValid;
    };

    this.getDeviceInfo = function () {      // 获取设备信息
        if (!self.deviceReady){
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
        templateUrl: 'templates/site/device-tree/tree-view.html',
        scope: {
            deviceList: '=',
            clickCallback: '=',
            showStatus: '=',
            canChecked: '=',
            textField: '@',
            itemClicked: '&',
            itemCheckedChanged: '&',
            itemTemplateUrl: '@'
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
            if ($scope.deviceList.length) {
                $scope.treeData = formatToTreeData($scope.deviceList)[0].children;
            } else {
                $scope.treeData = [];
            }
            var lastSelected = null;

            function calcDeviceStatus() {
                function _calcItem(item) {
                    var taskCount = item.unclosed_task_count ? parseInt(item.unclosed_task_count) : 0;
                    var dtsCount = item.unclosed_defect_count ? parseInt(item.unclosed_defect_count) : 0;
                    if (item.is_group && item.children) {
                        item.children.forEach(function (child) {
                            var counts = _calcItem(child);
                            taskCount += counts[0];
                            dtsCount += counts[1];
                        });
                    }
                    if (taskCount) {
                        item.hasTask = true;
                    }
                    if (dtsCount) {
                        item.hasDts = true;
                    }
                    return [taskCount, dtsCount];
                }

                // 计算设备是否有运维、是否有缺陷
                $scope.treeData.forEach(function (item) {
                    var count = _calcItem(item);
                });
            }
            calcDeviceStatus();
            $scope.itemExpended = function(item, $event){
                item.$$isExpend = ! item.$$isExpend;
                ($scope[itemClicked] || angular.noop)({
                    $item:item,
                    $event:$event
                });
                $event.stopPropagation();
            };
            $scope.getItemIcon = function(item){
                var isLeaf = $scope.isLeaf(item);
                if(isLeaf){
                    return 'fa fa-leaf';
                }
                return item.$$isExpend ? 'fa fa-minus': 'fa fa-plus';
            };
            $scope.isLeaf = function(item){
                return !item.is_group;
            };
            $scope.warpCallback = function(item, $event){
                item.$$isExpend = !item.$$isExpend;
                if (!item.is_group) {
                    if (lastSelected) {
                        lastSelected.$$selected = false;
                    }
                    item.$$selected = true;
                    lastSelected = item;
                    if ($scope.clickCallback) {
                        $scope.clickCallback(item);
                    }
                }
            };

            $scope.searchInputChange = function (input) {
                var value = input.value.toLowerCase().trim();
                $scope.treeData.forEach(function (child) {
                    search(child, value);
                });
                $scope.$apply();
            };

            function search(data, input) {
                if (!data.is_group) {
                    if (!input || data.search_key.indexOf(input) >= 0) {
                        data.unvisible = false;
                        return true;
                    }
                    data.unvisible = true;
                    return false;
                }
                var found = false;
                data.children.forEach(function (child) {
                    if (search(child, input)) {
                        found = true;
                    }
                });
                data.unvisible = !found;
                return found;
            }
        }]
    };
}]);