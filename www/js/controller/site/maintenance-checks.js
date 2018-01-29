
app.controller('MaintenanceBaseCtrl', function ($scope, $compile) {
    function load() {
        var templateUrl = GetQueryString("template");
        var html = "<root-page template=" + templateUrl + "></root-page>";
        var compileFn = $compile(html);
        var $dom = compileFn($scope);
        // 添加到文档中
        $dom.appendTo($('body'));
    }
    load();
});

app.controller('MaintenanceCheckHistoryCtrl', function ($scope, ajax, routerService) {
    var sn = GetQueryString('sn');
    $scope.siteName = GetQueryString("name");
    $scope.history = [];
    $scope.isLoading = false;

    $scope.createOneRecord = function () {
        $scope.openPage('/templates/maintenance-check/check-one-record-home.html', {isCreate: true, stationSn: sn, stationName: $scope.siteName});
    };

    $scope.openPage = function(template, params, config){
        routerService.openPage($scope, template, params, config);
    };


    function getHistory() {
        $scope.isLoading = true;
        ajax.get({
            url: '/poweroff_reports?station_sn=' + sn,
            success: function (data) {
                $scope.isLoading = false;
                $scope.history = data;
                $scope.$apply();
            },
            error: function (xhr, status, error) {
                $scope.isLoading = false;
                $scope.$apply();
            }
        });
    }

    $scope.addReport = function (data) {
        $scope.history.unshift(data);
    };

    getHistory();
});


function importImage(imageData) {    // 从Android读取的图片
    angular.element("#powerOffHandler").scope().addImagesWithBase64(imageData);
}

app.controller("MaintenanceCheckRecordItemCtrl", function ($scope, ajax, routerService, userService, $rootScope) {
    var d = new Date(), today=d.year + d.month + d.day;
    $scope.image_before_check = [];
    $scope.image_in_check = [];
    $scope.image_after_check = [];
    $scope.isPC = IsPC();
    $scope.canEdit = false;

    if ($scope.isCreate) {
        $scope.recordData = {station_sn: $scope.stationSn, station_name: $scope.stationName,
            creator_account: userService.username, creator_name: userService.getUser().name, create_time: new Date().format('yyyy-MM-dd')};
    } else {
        $scope.recordData = {};
    }
    $scope.gotoCheckListPage = function(){
        routerService.openPage($scope, '/templates/maintenance-check/check-one-record-items.html', {recordData: $scope.recordData});
    };

    function splitImagePath(images) {
        if (!images) {
            return [];
        }
        if (images.lastIndexOf(';') === (images.length-1)) {
            images = images.substring(0, images.length-1);
        }
        var paths = [];
        images.split(';').forEach(function (n) {
            paths.push($rootScope.host + '/' + n);
        });
        return paths;
    }

    function getData() {
        if ($scope.isCreate) {
            $scope.canEdit = true;
            ajax.get({
                url: '/poweroff_reports/template?station_sn=' + $scope.stationSn,
                success: function (data) {
                    $scope.recordData.template = data;
                    $scope.$apply();
                },
                error: function (xhr, status, error) {
                    $.notify.error('获取数据失败');
                }
            });
        } else {
            ajax.get({
                url: '/poweroff_reports/' + $scope.id,
                success: function (data) {
                    $scope.recordData = $.extend({}, data, {template: JSON.parse(data.template)});
                    $scope.recordData.image_before_check = splitImagePath(data.image_before_check);
                    $scope.recordData.image_in_check = splitImagePath(data.image_in_check);
                    $scope.recordData.image_after_check = splitImagePath(data.image_after_check);
                    // 判断当前用户是否有操作权限
                    checkEditable();
                    $scope.$apply();
                }
            });
        }
    }

    function init() {
        getData();
    }

    function checkEditable() {
        if ($scope.recordData.creator_account === userService.username) {
            $scope.canEdit = true;
        }
    }

    $scope.save = function () {
        $.notify.progressStart();

        if ($scope.isCreate) {
            var postData = $.extend({}, $scope.recordData,
                {
                    template:JSON.stringify($scope.recordData.template),
                    image_before_check: JSON.stringify($scope.image_before_check),
                    image_in_check: JSON.stringify($scope.image_in_check),
                    image_after_check: JSON.stringify($scope.image_after_check)
                });
            if ($scope.taskId) {
                postData.ops_task_id = $scope.taskId;
            }
            ajax.post({
                url: '/poweroff_reports',
                data: JSON.stringify(postData),
                contentType:"application/json",
                headers: {
                    Accept: "application/json"
                },
                success: function (data) {
                    $.notify.progressStop();
                    $.notify.info('保存成功');
                    $scope.recordData.id = data.id;
                    $scope.image_before_check = [];
                    $scope.image_in_check = [];
                    $scope.image_after_check = [];
                    if ($scope.$parent.addReport) {
                        $scope.$parent.addReport($scope.recordData);
                    }
                    $scope.$apply();
                    // 调用Android接口
                    window.android && window.android.onJsCallbackForPrevPage('setTaskReportId', data.id);
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error('保存失败');
                }
            })
        } else {
            var postData = {
                template: JSON.stringify($scope.recordData.template),
                image_before_check: JSON.stringify($scope.image_before_check),
                image_in_check: JSON.stringify($scope.image_in_check),
                image_after_check: JSON.stringify($scope.image_after_check)
            };
            ajax.patch({
                url: '/poweroff_reports/' + $scope.recordData.id,
                data: JSON.stringify(postData),
                contentType:"application/json",
                headers: {
                    Accept: "application/json"
                },
                success: function (data) {
                    $.notify.progressStop();
                    $.notify.info('保存成功');
                    $scope.image_before_check = [];
                    $scope.image_in_check = [];
                    $scope.image_after_check = [];
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error('保存失败');
                }
            })
        }
    };


    $scope.chooseImage = function (model, obj) {     // 选择图片
        var files = obj.files;
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
                    $scope[model].push(dataUrl);
                    if ($scope.recordData[model] === null) {
                        $scope.recordData[model] = [];
                    }
                    $scope.recordData[model].push(dataUrl);
                    $scope.$apply();
                };
            };
        }
        obj.files = null;
    };

    var currentImageModel = '';
    $scope.setCurrentImageModel = function (model) {
        currentImageModel = model;
    };

    $scope.addImagesWithBase64 = function (data) {
        if ($scope.recordData[currentImageModel] === null) {
            $scope.recordData[currentImageModel] = [];
        }
        $scope[currentImageModel].push(data);
        $scope.recordData[currentImageModel].push(data);
        $scope.$apply();
    };

    init();
});


app.controller('MaintenanceChecklistCtrl', function ($scope, $http) {
    $scope.template = $scope.recordData.template;
    $scope.currentData = {};
    $scope.currentIndex = 0;

    $scope.chooseItem = function (index) {
        $scope.currentIndex = index;
        $scope.currentItem = $scope.template[index];
    };

    $scope.checkThis = function (item, value) {
        item.value = value;
    };

    function init() {
        $scope.chooseItem(0);
    }

    init();
});


app.controller('PowerOffGalleryCtrl', function ($scope, $stateParams, $timeout) {
    $scope.canDelete = false;
    $scope.index = $stateParams.index;
    $scope.images = $stateParams.images;
    $scope.show = false;



    function initSlider() {
        if ($scope.images.length>1){

            var slide = $("#slides");
            slide.slidesjs({
                start: $scope.index,
                width: window.screen.width,
                play: {
                    active: true,
                    swap: true
                }
            });
        }

        $scope.canDelete = $stateParams.canDelete;
        $scope.$apply();
    }

    $timeout(initSlider, 100);


    $scope.hide = function () {
        history.back();
    };
});


app.controller('PowerOffGalleryCtrl', function ($scope, $stateParams, $timeout) {
    $scope.show = false;


    function initSlider() {
        if ($scope.images.length>1){

            var slide = $("#slides");
            slide.slidesjs({
                start: $scope.index+1,
                width: window.screen.width,
                play: {
                    active: true,
                    swap: true
                }
            });
        }

        $scope.$apply();
    }
    $scope.hide = function () {
        history.back();
    };

    $timeout(initSlider, 100);
});