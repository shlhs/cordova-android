app.config(['$sceDelegateProvider',function($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'http://hls.open.ys7.com/**'
    ]);
}]);

function onVideoPause(ipcId) {       // 暂停视频播放
    var scope = angular.element("#videoMonitor").scope();
    if (scope) {
        scope.pausePlay(parseInt(ipcId));
    }
}

app.controller('VideoMonitorCtrl', ['$scope', '$stateParams', '$state', '$timeout', '$sce', 'platformService', 'ajax', 'routerService', '$myTranslate', function ($scope, $stateParams, $state, $timeout, $sce, platformService, ajax, routerService, $myTranslate) {
    $scope.sn = $stateParams.sn; // GetQueryString("sn");
    $scope.ipcs = [];
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.listType = 'row';
    $scope.playingIpc = null;

    $scope.getIpcList = function() {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: platformService.getIpcServiceHost() + '/ipc/findByStationSn',
            data: {
                sn: $scope.sn,
                sync: true
            },
            headers: {
                Accept: 'application/json'
            },
            success: function (data) {
                $scope.isLoading = false;
                data.forEach(function (ipc) {
                    if (ipc.status === '0') {
                        ipc.statusName = $myTranslate.instant('online');
                        ipc.online = true;
                    } else if (ipc.status) {
                        ipc.statusName = $myTranslate.instant('offline');
                        ipc.online = false;
                    } else {
                        ipc.statusName = '';
                        ipc.online = true;
                    }
                    var address = ipc.liveAddressApp;
                    if (ipc.type === 'YS7') {
                        ipc.streamUrl = '/templates/video-monitor/iframe/ys7-player.html?url=' + address + '&autoplay&ipcId=' + ipc.id;
                    } else if (address.indexOf('http:') === 0) {
                        ipc.streamUrl = $sce.trustAsResourceUrl(address);
                    } else {
                        // 从liveAddress中解析出flv视频地址
                        var liveAddress = address;
                        var serviceHost = liveAddress.substring(0, liveAddress.indexOf(':', 5)),
                            deviceId=GetQueryString("device", liveAddress),
                            channelId=GetQueryString("channel", liveAddress);
                        var streamUrl = serviceHost + ':10812/nvc/' + deviceId + '/flv/hls/stream_' + channelId + '.flv';
                        ipc.streamUrl = '/templates/video-monitor/iframe/kk-player.html?url=' + streamUrl + '&ipcId=' + ipc.id;
                    }
                });
                $scope.ipcs = data;
                $scope.$apply();
            },
            error: function () {
                $scope.loadingFailed = true;
                $scope.isLoading = false;
                $.notify.error($myTranslate.instant('video.geterror'));
                $scope.$apply();
            }
        });
    };

    $scope.startPlay = function (ipc) {
        ipc.startPlay = true;
        $scope.playingIpc = ipc;
    };

    $scope.pausePlay = function (ipcId) {
        // $scope.ipcs.forEach(function (ipc) {
        //     if (ipc.id === ipcId) {
        //         ipc.startPlay = false;
        //         return false;
        //     }
        // });
        $scope.playingIpc = null;
        $scope.$apply();
    };

    $scope.openCaptureRecordPage = function () {
        // routerService.openPage($scope, '/templates/video-monitor/ipc-record-history.html', {
        //     sn: $scope.sn
        // }, {
        //     hidePrev: false
        // });
        $state.go('.records');
    };

    $scope.switchListType = function () {
        $scope.listType = $scope.listType === 'col' ? 'row' : 'col';
    };

    $scope.openSnapModal = function () {
        var ipcIds = [];
        $scope.ipcs.forEach(function (t) {
            ipcIds.push(t.id);
        });
        routerService.openPage($scope, '/templates/video-monitor/snap-desp-modal.html', {
            stationSn: $scope.sn,
            ipcIds: ipcIds,
            onSuccess: function () {
                $scope.openCaptureRecordPage();
            },
        }, {
            hidePrev: false,
        });
    };

    $timeout($scope.getIpcList, 500);
}]);

app.controller('VideoMonitorSnapConfirmCtrl', ['$scope', 'platformService', 'ajax', '$myTranslate', function ($scope, platformService, ajax, $myTranslate) {
    var newValue = '';

    $scope.onInputValidate = function (value) {
        newValue = value;
    };

    $scope.confirm = function () {
        $scope.onCancel();
        ajax.post({
            url: platformService.getIpcServiceHost() + '/ipc/capturePic/' + $scope.stationSn + '?name=' + newValue + '&ipcIds=' + $scope.ipcIds.join(','),
            headers: {
                Accept: "application/json; charset=utf-8"
            },
            success: function () {
                $scope.onSuccess();
            },
            error: function () {
                $.notify.error($myTranslate.instant('video.error.capture'));
            }
        })
    };

    $scope.onCancel = function () {
        history.back();
    }
}]);

app.controller('IpcRecordHistoryCtrl', ['$scope', '$stateParams', '$state', 'platformService', '$timeout', 'ajax', 'routerService', '$myTranslate', function ($scope, $stateParams, $state, platformService, $timeout, ajax, routerService, $myTranslate) {
    $scope.sn = $stateParams.sn; // GetQueryString("sn");
    $scope.records = [];
    $scope.isLoading = true;
    var isSavingRecords = [];
    var refreshInterval = null;

    $scope.getRecords = function () {
        $scope.isLoading = true;
        ajax.get({
            url: platformService.getIpcServiceHost() + '/captureRecord/findByStationSn',
            data: {
                sn: $scope.sn,
                type: 'PIC'
            },
            headers: {
                Accept: "application/json; charset=utf-8"
            },
            success: function (data) {
                $scope.isLoading = false;
                isSavingRecords = [];
                data.forEach(function (item) {
                   var createTime = item.createTime;
                   item.createTime = createTime.substring(0, 4) + '年' + parseInt(createTime.substring(5, 7)) + '月' +
                       parseInt(createTime.substring(8, 10)) + '日 ' + createTime.substring(11, 19);
                   if (item.status !== '0') {
                       isSavingRecords.push(item.id);
                   }
                });
                $scope.records = data.reverse();
                $scope.$apply();
                startRefreshInterval();
            },
            error: function () {
                $.notify.error($myTranslate.instant('get video.snapshots failed'));
                $scope.isLoading = false;
                $scope.$apply();
            }
        });
    };

    function startRefreshInterval() {
        if (isSavingRecords.length && refreshInterval === null) {
            refreshInterval = setInterval(function () {
                if (!isSavingRecords.length) {
                    clearRefreshInterval();
                    return;
                }
                isSavingRecords.forEach(function (recordId) {
                    refreshRecordStatus(recordId);
                });
            }, 2000);
        }
    }

    function clearRefreshInterval() {
        if (refreshInterval !== null) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    function refreshRecordStatus(recordId) {
        ajax.get({
            url: platformService.getIpcServiceHost() + '/captureRecord/' + recordId,
            headers: {
                Accept: "application/json; charset=utf-8"
            },
            success: function (data) {
                $scope.records.forEach(function (record) {
                    if (record.id === data.id) {
                        $.extend(record, {
                            status: data.status,
                            downCount: data.downCount,
                            allCount: data.allCount
                        });
                        if (data.status === '0') {
                            isSavingRecords.splice(isSavingRecords.indexOf(recordId), 1);
                        }
                        return false;
                    }
                });
                $scope.$apply();
            }
        });
    }

    $scope.openRecordDetail = function (record) {
        // routerService.openPage($scope, '/templates/video-monitor/ipc-pic-record-detail.html', {
        //     record: record
        // });
        $state.go('.detail', {id: record.id});
    };

    $scope.$on('$destroy', function (event) {
       clearRefreshInterval();
    });

    $timeout($scope.getRecords, 500);
}]);

app.controller('IpcPicRecordDetailCtrl', ['$scope', '$stateParams', 'platformService', 'ajax', '$timeout', 'routerService', function ($scope, $stateParams, platformService, ajax, $timeout, routerService) {
    // var createMoment = moment($scope.record.createTime, 'YYYY-MM-DD HH:mm:ss');
    // var dayOfWeek = createMoment.format('e');
    // var daysOfWeek = ['日', '一', '二', '三', '四', '五', '六'];
    $scope.record = {};
    $scope.createTime = null; // createMoment.format('M月D日 ') + '周' + daysOfWeek[dayOfWeek];
    $scope.images = [];
    var refreshInterval = null;
    var recordId = $stateParams.id;

    function getRecordDetail() {
        ajax.get({
            url: platformService.getIpcServiceHost() + '/captureRecord/' + recordId,
            headers: {
                Accept: "application/json; charset=utf-8"
            },
            success: function (data) {
                // var createMoment = moment(data.createTime, 'YYYY-MM-DD HH:mm:ss');
                $scope.record = data;
                // $scope.createTime = moment(data.createTime, 'YYYY-MM-DD HH:mm:ss').format('M月D日 周e');
                $scope.images = [];
                data.ipcRecord.forEach(function (ipc) {
                    $scope.images.push(platformService.getIpcServiceHost() + ipc.srcLink);
                });
                $.extend($scope.record, {
                    status: data.status,
                    allCount: data.allCount,
                    downCount: data.downCount
                });
                $scope.$apply();
                if (data.status === '0') {
                    clearRefreshInterval();
                } else {
                    startRefreshInterval();
                }
            }
        });
    }

    $scope.openGallery = function (index) {
        routerService.openPage($scope, '/templates/base-gallery.html', {
            images: $scope.images,
            index: index + 1
        });
    };

    function startRefreshInterval() {
        if (refreshInterval === null) {
            refreshInterval = setInterval(getRecordDetail, 2000);
        }
    }

    function clearRefreshInterval() {
        if (refreshInterval !== null) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    $scope.$on('$destroy', function (event) {
        clearRefreshInterval();
    });

    $timeout(getRecordDetail, 500);
}]);