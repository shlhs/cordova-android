"use strict";

app.service('scrollerService', function () {

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
                    upFn.call();
                    dropload.resetload();
                }
            });
            element.data('scrollInited', true);
        }
    };

});

var gMediaCbFunc = null;

function mediaCommonCallback(param) {
    if (gMediaCbFunc) {
        try {
            var json = JSON.parse(param);
            gMediaCbFunc(json);
        } catch (e) {
            gMediaCbFunc(param);
        }
    }
}

var gAudioPlayerCallbacks = {};
function audioPlayCompleteCallback(path) {
    var cb = gAudioPlayerCallbacks[path];  // 当前一个语音未播放完成就开始下一个语音时，用path判断应该停止哪一个语音
    if (cb) {
        delete gAudioPlayerCallbacks[path];
        cb();
    }
}

app.service('mediaService', ['platformService', function (platformService) {
    var audioVideoEnabled = window.android && window.android.captureVideo;

    /**
     * @param callback function(path)
     */
    this.captureVideo = function (callback) { // 录制视频
        gMediaCbFunc = callback;
        if (audioVideoEnabled) {
            window.android.captureVideo('mediaCommonCallback');
        }
    };

    this.playVideo = function (path) { // 播放本地或远程视频
        if (audioVideoEnabled) {
            window.android.playVideo(path);
        } else {
            $.notify.toast('无法播放视频，请升级app版本');
        }
    };

    /**
     * @param path 视频地址，可能是远程地址（http）或手机本地地址（content://）
     * @param callback function({code: 200/400/500, data: 音频链接, duration: 音频时长ms，message: 错误信息})
     */
    this.uploadVideo = function (path, callback) { // 上传视频
        if (path.indexOf('http') === 0) {
            return path;
        }
        gMediaCbFunc = callback;
        window.android.uploadVideo(platformService.getMediaHost(), path, 'mediaCommonCallback');
    };

    /**
     * @param callback function(path)
     */
    this.captureAudio = function (callback) { // 录制音频
        gMediaCbFunc = callback;
        window.android.captureAudio('mediaCommonCallback');
    };

    this.stopRecordAudio = function (callback) {
        gMediaCbFunc = callback;
        window.android.stopRecordAudio('mediaCommonCallback');
    };

    this.playAudio = function (path, callback) { // 播放本地或远程音频，callback：播放完成的回调
        gAudioPlayerCallbacks[path] = callback;
        if (audioVideoEnabled) {
            window.android.playAudio(path, 'audioPlayCompleteCallback');
        } else {
            $.notify.toast('无法播放视频，请升级app版本');
        }
    };

    this.stopPlayAudio = function () {
        if (audioVideoEnabled) {
            window.android.stopPlayAudio();
        } else {
            $.notify.toast('无法播放视频，请升级app版本');
        }
    };

    /**
     * @param path 视频地址，可能是远程地址（http）或手机本地地址（content://）
     * @param callback function({code: 200/400/500, data: 音频链接, duration: 音频时长msm，essage: 错误信息})
     */
    this.uploadAudio = function (path, callback) {  // 上传音频
        if (path.indexOf('http') === 0) {
            return path;
        }
        gMediaCbFunc = callback;
        window.android.uploadAudio(platformService.getMediaHost(), path, 'mediaCommonCallback');
    };

    this.removeFile = function (path) {
        window.android.removeFile(path);
    };
}]);

app.controller('DeviceSelectPageCtrl', ['$scope', function ($scope) { // 创建工单、缺陷单时，选择设备的controller
    var devices = null; // 单选时为单个设备，多选时为多个设备
    $scope.selectItem = function(device) {
        if ($scope.multiple) {
            devices = device;
        } else { // 单选时，点击某个设备，直接选择并返回
            $scope.onSelect(device);
        }
    };

    $scope.confirm = function () {
        $scope.onSelect(devices);
    }
}]);

app.directive('deviceTreeView',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/site/device-tree/tree-view.html',
        scope: {
            deviceList: '=',
            clickCallback: '=',
            showStatus: '=',        // 是否显示 运维/缺陷 状态
            checkbox: '=',        // 是否能多选
            defaultCheckedDevices: '=',  // 默认选中的设备
            // textField: '@',
            itemClicked: '&',
            itemCheckedChanged: '&',
            itemTemplateUrl: '@'
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
            var formatted = formatToTreeData($scope.deviceList);
            $scope.treeData = formatted.length ? formatToTreeData($scope.deviceList)[0].children : [];
            var lastSelected = null;
            var checkedSns = []; // checkbox选中的设备sn
            var checkedDevices = []; // checkbox选中的设备

            $scope.isGroup = function (item) {
                if (item.is_group && !item.product_type_id) {
                    return true;
                }
                return false;
            };

            if ($scope.defaultCheckedDevices && $scope.defaultCheckedDevices.length) {
                $scope.defaultCheckedDevices.forEach(function (d) {
                    checkedSns.push(d.sn);
                    checkedDevices.push(d);
                });
            }

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
            $scope.isLeaf = function(item){
                return !item.is_group;
            };
            $scope.warpCallback = function(item, $event){
                item.$$isExpend = !item.$$isExpend;
                if (!item.is_group) {
                    if ($scope.checkbox) { // 多选情况下，点击等于勾选checkbox
                        $scope.checkDevice($event, item);
                    } else {
                        if (lastSelected) {
                            lastSelected.$$selected = false;
                        }
                        item.$$selected = true;
                        lastSelected = item;
                        if ($scope.clickCallback) {
                            $scope.clickCallback(item);
                        }
                    }
                }
            };

            $scope.checkDevice = function ($event, device) {
                $event.stopPropagation();
                var index = checkedSns.indexOf(device.sn);
                if (index >= 0) {
                    checkedSns.splice(index, 1);
                    checkedDevices.splice(index, 1);
                } else {
                    checkedSns.push(device.sn);
                    checkedDevices.push(device);
                }
                if ($scope.clickCallback) {
                    $scope.clickCallback(checkedDevices);
                }
            };

            $scope.isChecked = function (sn) {
                return checkedSns.indexOf(sn) >= 0;
            };

            $scope.confirm = function () { // 多选时，点击"确定"才返回
                if ($scope.clickCallback) {
                    $scope.clickCallback(checkedDevices);
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


/* 运维班组选择 */
app.directive('operatorTeamSelector',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/task/selector/team-selector.html',
        scope: {
            defaultTeam: '=',
            teams: '=',
            callback: '=',
            visible: '=',
            multiple: '=',
            onHide: '='
        },
        controller:['$scope', '$attrs', function($scope, $attrs){

            var selected = null;           // 当点击了"确定"后，所选项就是最终选择的

            if ($scope.defaultTeam) {
                selected = $scope.defaultTeam;
            }

            $scope.hide = function () {
                if ($scope.onHide) {
                    $scope.onHide();
                } else {
                    $scope.visible = false;
                }
            };

            $scope.confirm = function () {
                $scope.callback(selected);
                $scope.hide();
            };

            $scope.onToggleCheck = function(team) {
                if (!selected || selected.id !== team.id ) {
                    selected = team;
                    $scope.callback(team);
                }
                $scope.hide();
            };

            $scope.isSelected = function (id) {
                return selected && selected.id === id;
            };
        }]
    };
}]);

/* 用户选择，多选 */
app.directive('handlersSelector',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/task/selector/handler-selector.html',
        scope: {
            title: '@',     // 选择框的标题，默认为：请选择运维工
            defaultUsers: '=',       // 默认选中的账号
            users: '=',
            callback: '=',
            visible: '=',
            multiple: '=',
            onHide: '='
        },
        controller:['$scope', '$attrs', function($scope, $attrs){

            var selected = [];           // 当点击了"确定"后，所选项就是最终选择的
            $scope.tmpSelected = [];        // 保存未点击"确定"前的选项

            if ($scope.defaultUsers && $scope.defaultUsers.length) {
                var defaultAccounts = [];
                $scope.defaultUsers.forEach(function (user) {
                    defaultAccounts.push(user.account);
                });
                $scope.users.forEach(function (user) {
                    if (defaultAccounts.indexOf(user.account) >= 0) {
                        selected.push(user.account);
                        $scope.tmpSelected.push(user.account);
                    }
                });
            }

            $scope.getNameAndPhone = function (user) {
                return user.name + (user.phone ? '/' + user.phone : '');
            };

            $scope.hide = function () {
                $scope.tmpSelected = selected;
                if ($scope.onHide) {
                    $scope.onHide();
                } else {
                    $scope.visible = false;
                }
            };

            $scope.confirm = function () {
                selected = $scope.tmpSelected;
                var users = [];
                $scope.users.forEach(function (user) {
                    if (selected.indexOf(user.account) >= 0) {
                        users.push(user);
                    }
                });
                $scope.callback(users);
                $scope.hide();
            };

            $scope.onToggleCheck = function(account) {
                if ($scope.tmpSelected.indexOf(account) >= 0) {
                    $scope.tmpSelected.splice($scope.tmpSelected.indexOf(account), 1);
                } else {
                    $scope.tmpSelected.push(account);
                }
            };

            $scope.isSelected = function (account) {
                return $scope.tmpSelected.indexOf(account) >= 0;
            };
        }]
    };
}]);

/* 班组、用户选择 */
app.directive('teamAndHandlerSelector',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/task/selector/team-and-user-selector.html',
        scope: {
            teams: '=',
            callback: '=',
            visible: '=',
            onHide: '=',
            firstTitle: '@', // 第一页的描述
            secondTitle: '@', // 第二页的描述
        },
        controller:['$scope', '$attrs', function($scope, $attrs) {
            $scope.selectedTeam = null;
            $scope.isTeamSelector = true;   // true：选择班组，false：选择维修工
            var selected = [];           // 当点击了"确定"后，所选项就是最终选择的
            $scope.selectedAccounts = [];        // 保存未点击"确定"前的选项

            $scope.getNameAndPhone = function (user) {
                return user.name + (user.phone ? '/' + user.phone : '');
            };

            $scope.hide = function () {
                $scope.selectedAccounts = selected;
                if ($scope.onHide) {
                    $scope.onHide();
                } else {
                    $scope.visible = false;
                }
            };

            $scope.confirm = function () {
                const users = [];
                $scope.selectedTeam.users.forEach(function (user) {
                    if ($scope.isUserSelected(user.account)) {
                        users.push(user);
                    }
                });
                $scope.callback($scope.selectedTeam, users);
            };

            $scope.onToggleCheckTeam = function(team) {
                $scope.isTeamSelector = false;
                if (!$scope.selectedTeam || team.id !== $scope.selectedTeam.id) {
                    $scope.selectedTeam = team;
                    // 跳转到维修工选择页
                    $scope.selectedAccounts = [];
                }
            };

            $scope.isTeamSelected = function (teamId) {
                return $scope.selectedTeam && $scope.selectedTeam.id === teamId;
            };

            $scope.onToggleCheckUser = function(account) {
                if ($scope.selectedAccounts.indexOf(account) >= 0) {
                    $scope.selectedAccounts.splice($scope.selectedAccounts.indexOf(account), 1);
                } else {
                    $scope.selectedAccounts.push(account);
                }
            };

            $scope.isUserSelected = function (account) {
                return $scope.selectedAccounts.indexOf(account) >= 0;
            };

            $scope.reSelectTeam = function () {
                $scope.isTeamSelector = true;
            };
        }]
    };
}]);

var gCurrentImageContainerScope = null;     // 当前操作的图片的scope

function onAndroid_taskImageImport(imageData, filename) {    // 从Android读取的图片
    if (gCurrentImageContainerScope) {
        gCurrentImageContainerScope.addImagesWithBase64(imageData, filename);
    }
}

function onAndroid_taskImageDelete(filename) {       // Android手机上删除所选图片
    if (gCurrentImageContainerScope) {
        gCurrentImageContainerScope.deleteImageFromMobile(filename);
    }
}

app.directive('imageUploader', ['platformService', function (platformService) {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: '/templates/image-uploader.html',
        scope: {
            images: '=',        // 图片列表，默认[]
            rowCount: '@',      // 一行几个，默认一行4个
            single: '@',        // 是否只允许一张照片，默认false
            style: '@',
            onUpdate: '='       // 不必需，function(images) {}
        },
        controller:['$scope', '$attrs', 'routerService', function($scope, $attrs, routerService){

            $scope.getImageUrl = function (data) {
                if (data.indexOf('data:image') === 0) {
                    return data;
                } else if (data.indexOf('http') === 0) {
                    return data;
                }
                return platformService.getCloudHost() + data;
            };

            var files = {};
            $scope.isSingle = $attrs.single === 'true';
            $scope.style = $attrs.style || '';
            $scope.itemStyle = '';
            if ($attrs.rowCount) {
                var width = (100 / $attrs.rowCount) + '%';
                $scope.itemStyle += 'width: ' + width + ';padding-top: ' + width + ';';
            }

            $scope.isPC = IsPC();
            $scope.useMobileGallery = window.android && window.android.openGallery;

            function clearAllExist() {
                window.android && window.android.clearSelectedPhotos && window.android.clearSelectedPhotos();      // 调用Android js接口，清除选择的所有照片
            }

            function fileExist(fileName) {
                return files[fileName] !== undefined;
            }

            $scope.chooseImage = function (tmpFiles) {     // 选择图片
                $scope.canDelete = true;
                for (var i = 0; i < tmpFiles.length; i++) {
                    var reader = new FileReader(), file=tmpFiles[i];
                    // 如果文件已选择过，则无法再选择
                    if (fileExist(file.name)) {
                        continue;
                    }
                    reader.readAsDataURL(file);
                    reader.onloadstart = function () {
                        //用以在上传前加入一些事件或效果，如载入中...的动画效果
                    };
                    reader.onload = function (event) {
                        var img = new Image();
                        img.src = event.target.result;
                        img.onload = function(){
                            var dataUrl = imageHandler.compress(this, 75, file.orientation).src;
                            if ($scope.isSingle) {
                                $scope.images = [dataUrl];
                            } else {
                                files[file.name] = dataUrl;
                                $scope.images.push(dataUrl);
                            }
                            notify();
                            $scope.$apply();
                        };
                    };
                }
            };

            $scope.addImagesWithBase64 = function (data, filename) {
                $scope.canDelete = true;
                if (fileExist(filename)) {
                    return;
                }
                if ($scope.isSingle) {
                    $scope.images = [data];
                } else {
                    files[filename] = data;
                    $scope.images.push(data);
                }
                notify();
                $scope.$apply();
            };

            $scope.deleteImageFromMobile = function (filename) {
                if (files[filename] !== undefined) {
                    var fileData = files[filename];
                    var fileDataLen = fileData.length;
                    delete files[filename];
                    for (var i=0; i<$scope.images.length; i++) {
                        var imageData = $scope.images[i];
                        if (fileDataLen === imageData.length) {
                            if (fileData === imageData) {
                                $scope.images.splice(i, 1);
                                break;
                            }
                        }
                    }
                    delete files[filename];
                    notify();
                    $scope.$apply();
                }
            };

            $scope.openMobileGallery = function () {
                gCurrentImageContainerScope = $scope;
                if ($scope.isSingle) {
                    clearAllExist();
                    window.android.openGallery(1, 'onAndroid_taskImageImport', 'onAndroid_taskImageDelete');
                } else {
                    window.android.openGallery(9, 'onAndroid_taskImageImport', 'onAndroid_taskImageDelete');
                }
            };

            $scope.deleteImage = function (index) {
                // 删除某一张图片
                // 找到index对应的文件名
                var fileNames = Object.keys(files);
                var imageData = $scope.images[index];
                var imageDataLen = imageData.length;
                for (var i=0; i<fileNames.length; i++) {
                    var fileName = fileNames[i];
                    var fileData = files[fileName];
                    if (fileData.length === imageDataLen && fileData === imageData) {
                        window.android && window.android.deleteSelectedPhoto && window.android.deleteSelectedPhoto(fileName);
                        delete files[fileName];
                        break;
                    }
                }
                $scope.images.splice(index, 1);
                notify();
            };

            $scope.openGallery = function (index) {
                var tmpImages = [];
                $scope.images.forEach(function (data) {
                    tmpImages.push($scope.getImageUrl(data));
                });
                routerService.openPage($scope, '/templates/base-gallery.html', {
                    index: index+1,
                    images: tmpImages,
                    canDelete: true,
                    onDelete: $scope.deleteImage
                }, {
                    hidePrev: false
                });
            };

            function notify() {
                if ($scope.onUpdate) {
                    $scope.onUpdate($scope.images);
                }
            }

            clearAllExist();
        }]
    };
}]);

app.directive('videoUploader', function () {
   return {
       replace: true,
       restrict: 'E',
       templateUrl: '/templates/video-uploader.html',
       scope: {
           onUpdate: '=',
           video: '=',
           canEdit: '=',
       },
       controller: ['$scope', '$attrs', 'routerService', 'mediaService', function ($scope, $attrs, routerService, mediaService) {
            $scope.startCapture = function () {
                mediaService.captureVideo(function (path) {
                    $scope.onUpdate(path);
                    $scope.$apply();
                });
            };

            $scope.startPlay = function () {
                mediaService.playVideo($scope.video);
            };

            $scope.remove = function ($event) {
                $event.stopPropagation();
                mediaService.removeFile($scope.video);
                $scope.onUpdate(null);
                return false;
            };
       }]
   };
});

app.directive('audioRecorder', function () {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: '/templates/media/voice-record.html',
        scope: {
            onUpdate: '=',
            audio: '=',
            duration: '=',
            canEdit: '=',
        },
        controller: ['$scope', '$attrs', 'routerService', 'mediaService', function ($scope, $attrs, routerService, mediaService) {
            $scope.playing = false;
            $scope.recording = false;
            $scope.tmpDuration = null;  // 以秒显示跌间隔时间
            $scope.iconWidth = '0';   // 语音条的宽度
            setIntDuration($scope.duration);

            $scope.startCapture = function () {
                mediaService.captureAudio(function (res) {
                    $scope.recording = false;
                    if (!res.code) { // code=403表示没有权限
                        $scope.onUpdate(res.path, res.duration);
                        setIntDuration(res.duration);
                    }
                    $scope.$apply();
                });
                // $scope.recording = true;
            };

            $scope.startPlay = function () {
                if ($scope.playing) {
                    $scope.playing = false;
                    mediaService.stopPlayAudio();
                } else {
                    $scope.playing = true;
                    mediaService.playAudio($scope.audio, function () {
                        $scope.playing = false;
                        $scope.$apply();
                    });
                }
            };

            $scope.remove = function () {
                mediaService.removeFile($scope.audio);
                $scope.onUpdate(null, null);
                return false;
            };

            function setIntDuration(duration) {
                if (duration) {
                    $scope.tmpDuration = Math.ceil(duration/1000);
                    if ($scope.canEdit) {
                        $scope.iconWidth = $scope.tmpDuration*2 + 80;
                    } else {
                        $scope.iconWidth = $scope.tmpDuration * 2 + 60;
                    }
                } else {
                    $scope.tmpDuration = null;
                    $scope.iconWidth = '0';
                }
            }

            $scope.stopRecording = function () { // 停止录音
                mediaService.stopRecordAudio(function (res) {
                    $scope.recording = false;
                    $scope.onUpdate(res.path, res.duration);
                    $scope.$apply();
                });
            };

            $scope.cancelRecording = function () { // 取消录音
                mediaService.stopRecordAudio(function (path, duration) {
                    $scope.recording = false;
                    $scope.$apply();
                });
            }
        }]
    };
});

// 图片相册，不可编辑时使用
app.directive('imageGridList', [function () {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: '/templates/image-grid-list.html',
        scope: {
            video: '=',
            images: '='        // 图片列表，默认[]
        },
        controller: ['$scope', '$attrs', 'routerService', 'platformService', 'mediaService', function ($scope, $attrs, routerService, platformService, mediaService) {
            $scope.isVisible = function () {
                if (($scope.images && $scope.images.length) || $scope.video) {
                    return true;
                }
                return false;
            };

            $scope.imageList = [];
            if (!$scope.images) {
                $scope.imageList = [];
            } else {
                $scope.images.forEach(function (url) {
                    if (url.indexOf('http') >= 0) {
                        $scope.imageList.push(url);
                    } else if (url.indexOf('data:image') >= 0) {
                        $scope.imageList.push(url);
                    } else {
                        $scope.imageList.push(platformService.getCloudHost() + url);
                    }
                });
            }
            $scope.openGallery = function (index) {
                routerService.openPage($scope, '/templates/base-gallery.html', {
                    index: index+1,
                    images: $scope.imageList,
                    canDelete: false,
                }, {
                    hidePrev: false
                });
            };

            $scope.startPlay = function () {
                mediaService.playVideo($scope.video);

            };
        }]
    };
}]);