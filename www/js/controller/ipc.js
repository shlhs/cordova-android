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

app.controller('VideoMonitorCtrl', function ($scope, $timeout, platformService, ajax, routerService) {
    $scope.sn = GetQueryString("sn");
    $scope.ipcs = [];
    $scope.isLoading = true;
    $scope.loadingFailed = false;
    $scope.listType = 'row';

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
                        ipc.statusName = '在线';
                        ipc.online = true;
                    } else if (ipc.status) {
                        ipc.statusName = '不在线';
                        ipc.online = false;
                    } else {
                        ipc.statusName = '';
                        ipc.online = true;
                    }
                    if (ipc.type === 'YS7') {
                        ipc.streamUrl = '/templates/video-monitor/iframe/ys7-player.html?url=' + ipc.liveAddress + '&autoplay&ipcId=' + ipc.id;
                    } else {
                        // 从liveAddress中解析出flv视频地址
                        var liveAddress = ipc.liveAddress;
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
                $.notify.error('获取摄像头列表失败');
                $scope.$apply();
            }
        });
    };

    $scope.startPlay = function (ipc) {
        ipc.startPlay = true;
    };

    $scope.pausePlay = function (ipcId) {
        $scope.ipcs.forEach(function (ipc) {
            if (ipc.id === ipcId) {
                ipc.startPlay = false;
                return false;
            }
        });
        $scope.$apply();
    };

    $scope.openCaptureRecordPage = function () {
        routerService.openPage($scope, '/templates/video-monitor/ipc-record-history.html', {
            sn: $scope.sn
        }, {
            hidePrev: false
        });
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
});

app.controller('VideoMonitorSnapConfirmCtrl', function ($scope, platformService, ajax) {
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
                $.notify.error('远程巡检失败');
            }
        })
    };

    $scope.onCancel = function () {
        history.back();
    }
});

app.controller('IpcRecordHistoryCtrl', function ($scope, platformService, $timeout, ajax, routerService) {
    // $scope.sn = GetQueryString("sn");
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
                $.notify.error('获取巡检记录失败');
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
        routerService.openPage($scope, '/templates/video-monitor/ipc-pic-record-detail.html', {
            record: record
        });
    };

    $scope.$on('$destroy', function (event) {
       clearRefreshInterval();
    });

    $timeout($scope.getRecords, 500);
});

app.controller('IpcPicRecordDetailCtrl', function ($scope, platformService, ajax, $timeout, routerService) {
    var createMoment = moment($scope.record.createTime, 'YYYY-MM-DD HH:mm:ss');
    var dayOfWeek = createMoment.format('e');
    var daysOfWeek = ['日', '一', '二', '三', '四', '五', '六'];
    $scope.createTime = createMoment.format('M月D日 ') + '周' + daysOfWeek[dayOfWeek];
    $scope.images = [];
    var refreshInterval = null;

    function getRecordDetail() {
        ajax.get({
            url: platformService.getIpcServiceHost() + '/captureRecord/' + $scope.record.id,
            headers: {
                Accept: "application/json; charset=utf-8"
            },
            success: function (data) {
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
});