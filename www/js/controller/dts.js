app.controller('DtsCreateCtrl', function ($scope, $timeout, ajax, userService, routerService) {
    $scope.device = {
        sn: GetQueryString('device_sn'),
        station_sn: GetQueryString('station_sn'),
        name: GetQueryString('name'),
        path: GetQueryString('path')
    };
    $scope.taskData = {};
    $scope.name = $scope.device.path ? $scope.device.path + '/' + $scope.device.name : $scope.device.name;

    $scope.files = [];
    $scope.images = [];
    $scope.description = '';
    $scope.isPC = IsPC();
    $scope.useMobileGallery = window.android && window.android.openGallery;

    var insertPosition = angular.element("#imageList>.upload-item");
    var companyId = userService.getTaskCompanyId();

    function init() {
        initTaskTypeList();
        initDatePicker();
        initMembers();
    }

    function _format(data, idKey, nameKey) {
        var d = null;
        if (typeof (idKey) === 'undefined'){
            idKey = 'id';
        }
        if (typeof (nameKey) === 'undefined'){
            nameKey = 'name'
        }
        for(var i=0; i<data.length; i++){
            d = data[i];
            d['value'] = d[idKey];
            d['text'] = d[nameKey];
        }
    }

    function initTaskTypeList() {
        var taskTypes = [{
            value: 8,
            text: '一般缺陷'
        }, {
            value: 9,
            text: '严重缺陷'
        }, {
            value: 10,
            text: '致命缺陷'
        }];
        var taskTypePicker = new mui.PopPicker();
        taskTypePicker.setData(taskTypes);
        var taskTypeButton = document.getElementById('taskTypePicker');

        taskTypeButton.addEventListener('click', function(event) {
            taskTypePicker.show(function(items) {
                $scope.taskTypeName = items[0].text;
                $scope.taskData.task_type_id = items[0].value;
                $scope.$apply();
            });
        }, false);
        // 默认使用一般缺陷
    }

    function initMembers() {
        var userPicker = null;
        ajax.get({
            url: '/opscompanies/' + userService.getTaskCompanyId() + '/members',
            success: function (data) {
                $scope.memberList = data;
                _format(data, 'account');
                if (!userPicker){
                    userPicker = new mui.PopPicker();
                    var taskTypeButton = document.getElementById('handlerPicker');
                    taskTypeButton.addEventListener('click', function(event) {
                        userPicker.show(function(items) {
                            $scope.handlerName = items[0].text;
                            $scope.taskData.current_handler = items[0].value;
                            $scope.$apply();
                            // userResult.innerText = JSON.stringify(items[0]);
                            //返回 false 可以阻止选择框的关闭
                            //return false;
                        });
                    }, false);
                }
                userPicker.setData(data);
            },
            error: function () {
                console.log('获取站点成员失败');
            }
        });
    }

    function initDatePicker() {

        document.getElementById('expectedTime').addEventListener('tap', function() {
            var _self = this;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    $scope.taskData.expect_complete_time = rs.text;
                    _self.picker.dispose();
                    _self.picker = null;
                    $scope.$apply();
                });
            } else {
                var optionsJson = this.getAttribute('data-options') || '{}';
                var options = JSON.parse(optionsJson);
                var id = this.getAttribute('id');
                /*
                 * 首次显示时实例化组件
                 * 示例为了简洁，将 options 放在了按钮的 dom 上
                 * 也可以直接通过代码声明 optinos 用于实例化 DtPicker
                 */
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    $scope.taskData.expect_complete_time = rs.text + ":00";
                    _self.picker.dispose();
                    _self.picker = null;
                    $scope.$apply();
                });
            }
        }, false);
    }

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
                    $scope.files.push({name: file.name});
                    $scope.images.push(dataUrl);
                    $scope.$apply();
                };
            };
        }
    } ;

    $scope.submitAndBack = function() {   //上传描述和图片
        if (!$scope.description && !$scope.files.length){
            mui.alert('评论与图片不能同时为空', '无法提交', function() {
            });
            return;
        }
        var images = [];
        insertPosition.prevAll().each(function (i, n) {
            var imageUrl = $(n).find('.img-file').css('background-image');
            images.push(imageUrl.substring(5, imageUrl.length-2));
        });
        $scope.postAction(TaskAction.Update, $scope.description, images, function () {       // 上传成功，清空本次信息
            $timeout(function () {
                $scope.cancel();
            }, 500);
        });
    };

    $scope.addImagesWithBase64 = function (data, filename) {
        $scope.canDelete = true;
        if (filename === undefined) {
            filename = '';
        }
        $scope.files.push({name: filename});
        $scope.images.push(data);
        $scope.$apply();
    };

    $scope.deleteImageFromMobile = function (filename) {
        for (var i=0; i<$scope.files.length; i++) {
            if ($scope.files[i].name === filename) {
                $scope.files.splice(i, 1);
                $scope.images.splice(i, 1);
                break;
            }
        }
        $scope.$apply();
    };

    $scope.openMobileGallery = function () {
        window.android.openGallery();
    };

    $scope.cancel = function () {
        window.android && window.android.clearSelectedPhotos && window.android.clearSelectedPhotos();      // 调用Android js接口，清除选择的所有照片
        window.history.back();
    };

    $scope.openGallery = function (index) {
        routerService.openPage($scope, '/templates/base-gallery.html', {
            index: index+1,
            images: $scope.images,
            canDelete: true,
            onDelete: function (deleteIndex) {
                $scope.images.splice(deleteIndex, 1);
            }
        }, {
            hidePrev: false
        });
    };

    $scope.deleteImage = function (index) {
        // 删除某一张图片
        var filename = $scope.files[index].name;
        window.android && window.android.deleteSelectedPhoto && window.android.deleteSelectedPhoto(filename);
        $scope.files.splice(index, 1);
        $scope.images.splice(index, 1);
    };

    $scope.submitForm = function() {
        if($scope.myForm.$invalid){
            console.log('form invalid');
        }else {
            $scope.createTask();
        }
    };

    $scope.createTask = function () {
        var taskData = $scope.taskData;
        taskData.devices = [{
            sn: $scope.device.sn
        }];
        if ($scope.images.length) {
            $scope.images.forEach(function (image, i) {
                taskData['file' + (i+1)] = image;
            });
        }
        taskData.events = [];
        taskData.station_sn = $scope.device.station_sn;
        $.notify.progressStart();
        ajax.post({
            url: '/opstasks/' + companyId,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            data: JSON.stringify(taskData),
            success: function (data) {
                $.notify.progressStop();
                $.notify.info('创建成功');
                $timeout(function () {
                    window.location.href = '/templates/task/task-detail.html?finishPage=1&id=' + data.id;       // 设置finish=1，这样在Android端在打开新页面时，会将当前页finish掉
                }, 800);
            },error: function () {
                $.notify.progressStop();
                $.notify.error('创建失败');
                console.log('error');
            }
        });
    };

    init();
});