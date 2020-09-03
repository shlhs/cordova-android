
app.controller('MaintenanceBaseCtrl', ['$scope', '$compile', function ($scope, $compile) {
    function load() {
        var templateUrl = GetQueryString("template");
        var html = "<root-page template=" + templateUrl + "></root-page>";
        var compileFn = $compile(html);
        var $dom = compileFn($scope);
        // 添加到文档中
        $dom.appendTo($('body'));
    }
    load();
}]);

app.controller('MaintenanceCheckHistoryCtrl', ['$scope', 'ajax', 'routerService', function ($scope, ajax, routerService) {
    var sn = GetQueryString('sn');
    $scope.stationName = GetQueryString("name");
    $scope.history = [];
    $scope.isLoading = false;
    $scope.loadingFailed = false;

    $scope.createOneRecord = function () {
        $scope.openPage('/templates/maintenance-check/check-one-record-home.html', {isCreate: true, stationSn: sn, stationName: $scope.stationName});
    };

    $scope.openPage = function(template, params, config){
        routerService.openPage($scope, template, params, config);
    };

    $scope.getDataList = function() {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: '/poweroff_reports?station_sn=' + sn,
            success: function (data) {
                $scope.isLoading = false;
                $scope.history = data;
                $scope.$apply();
            },
            error: function (xhr, status, error) {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        });
    };

    $scope.addReport = function (data) {
        $scope.history.unshift(data);
    };

    $scope.getDataList();
}]);

function onAndroid_powerOffImageImport(imageData, filename) {    // 从Android读取的图片
    var scope = angular.element("#powerOffHandler").scope();
    if (scope) {
        scope.addImagesWithBase64(imageData, filename);
    }
}

function onAndroid_powerOffImageDelete(filename) {       // Android手机上删除所选图片
    var scope = angular.element("#powerOffHandler").scope();
    if (scope) {
        scope.deleteImageFromMobile(filename);
    }
}

app.controller("MaintenanceCheckRecordItemCtrl", ['$scope', 'ajax', 'routerService', 'userService', '$rootScope', '$myTranslate', function ($scope, ajax, routerService, userService, $rootScope, $myTranslate) {
    var d = new Date(), today=d.year + d.month + d.day;
    $scope.image_before_check = [];
    $scope.image_in_check = [];
    $scope.image_after_check = [];
    $scope.isPC = IsPC();
    $scope.useMobileGallery = window.android && window.android.openGallery;
    $scope.canEdit = false;
    var apiHost = GetQueryString("apiHost") || '';      // 适配网页

    if ($scope.isCreate) {
        $scope.recordData = {station_sn: $scope.stationSn, station_name: $scope.stationName,
            creator_account: userService.username, creator_name: userService.getUser().name, create_time: new Date().format('yyyy-MM-dd')};
    } else {
        $scope.recordData = {};
    }

    $scope.gotoCheckListPage = function(){
        routerService.openPage($scope, '/templates/maintenance-check/check-one-record-items.html', {recordData: $scope.recordData});
    };

    $scope.openGallery = function(startIndex, images) {
        routerService.openPage($scope, '/templates/maintenance-check/gallery.html', {
            index: startIndex,
            images: images
        });
    };

    $scope.gotoPrevPage = function () {
        if (routerService.hasNoHistory()) {
            pageBack();
        } else {
            history.back();
        }
    };

    function getData() {
        function _splitImagePath(images) {
            if (!images) {
                return [];
            }
            if (images.lastIndexOf(';') === (images.length-1)) {
                images = images.substring(0, images.length-1);
            }
            var paths = [], urlHost = $rootScope.host + ":8099/v1" || apiHost;
            images.split(';').forEach(function (n) {
                paths.push(urlHost+ '/' + n);
            });
            return paths;
        }

        if ($scope.isCreate) {
            $scope.canEdit = true;
            ajax.get({
                url: '/poweroff_reports/template',
                success: function (data) {
                    $scope.recordData.template = data;
                    $scope.$apply();
                },
                error: function (xhr, status, error) {
                    $.notify.error($myTranslate.instant('get data failed'));
                }
            });
        } else {
            ajax.get({
                url: apiHost + '/poweroff_reports/' + $scope.id,
                success: function (data) {
                    $scope.recordData = $.extend({}, data, {template: JSON.parse(data.template)});
                    $scope.recordData.image_before_check = _splitImagePath(data.image_before_check);
                    $scope.recordData.image_in_check = _splitImagePath(data.image_in_check);
                    $scope.recordData.image_after_check = _splitImagePath(data.image_after_check);
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
        if ($scope.recordData.creator_account === userService.username && $scope.recordData.editable) {
            $scope.canEdit = true;
        }
    }

    $scope.save = function () {
        $.notify.progressStart();

        if (!$scope.recordData.id) {
            var postData = $.extend({}, $scope.recordData,
                {
                    template:JSON.stringify($scope.recordData.template),
                    image_before_check: JSON.stringify($scope.image_before_check),
                    image_in_check: JSON.stringify($scope.image_in_check),
                    image_after_check: JSON.stringify($scope.image_after_check),
                    stationSn: $scope.stationSn,
                    stationName: $scope.stationName
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
                    $.notify.info($myTranslate.instant('save successful'));
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
                    $.notify.error($myTranslate.instant('save failed'));
                }
            })
        } else {
            var postData = {
                power_capacity: $scope.recordData.power_capacity,
                power_circuit: $scope.recordData.power_circuit,
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
                    $.notify.info($myTranslate.instant('save successful'));
                    $scope.image_before_check = [];
                    $scope.image_in_check = [];
                    $scope.image_after_check = [];
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error($myTranslate.instant('save failed'));
                }
            })
        }
    };


    $scope.chooseImage = function (model, obj) {     // 选择图片
        $scope.setCurrentImageModel(model);
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
                    $scope.addImagesWithBase64(dataUrl);
                };
            };
        }
        obj.files = null;
    };

    var currentImageModel = '';
    function clearAllExist() {
        window.android && window.android.clearSelectedPhotos && window.android.clearSelectedPhotos();      // 调用Android js接口，清除选择的所有照片
    }
    $scope.setCurrentImageModel = function (model) {
        currentImageModel = model;
        clearAllExist();
        window.android && window.android.openGallery(9, 'onAndroid_powerOffImageImport', 'onAndroid_powerOffImageDelete');
    };

    $scope.addImagesWithBase64 = function (data) {
        if ($scope.recordData[currentImageModel] === undefined) {
            $scope.recordData[currentImageModel] = [];
        }
        if ($scope[currentImageModel] === undefined){   // 用于保存新上传的图片，保存时只保存新上传的图片
            $scope[currentImageModel] = [];
        }
        $scope[currentImageModel].push(data);
        $scope.recordData[currentImageModel].push(data);
        $scope.$apply();
    };
    clearAllExist();

    $scope.$on('$destroy', function (event) {
        clearAllExist();
    });

    init();
}]);


app.controller('MaintenanceChecklistCtrl', ['$scope', 'ajax', function ($scope, ajax) {
    var byWeb = GetQueryString("by") === 'web' ? true : false;      // 是否是从web请求的
    $scope.template = byWeb ? '' : $scope.recordData.template;
    $scope.currentData = {};
    $scope.currentIndex = 0;

    $scope.chooseItem = function (index) {
        $scope.currentIndex = index;
        if ($scope.template)
        {
            $scope.currentItem = $scope.template[index];
        }
    };

    $scope.checkThis = function (item, value) {
        item.value = value;
    };

    function init() {
        if (byWeb)
        {
            getTemplate();
        }
        else {
            $scope.chooseItem(0);
        }
    }

    function getTemplate() {
        var templateName = GetQueryString("name"), apiHost=GetQueryString("apiHost");
        ajax.get({
            url: apiHost+'/poweroff_reports/template?name=' + templateName,
            success: function (data) {
                $scope.template=data;
                $scope.chooseItem(0);
                $scope.$apply();
            },
            error: function (xhr, status, error) {
                $scope.$apply();
            }
        });
    }

    $scope.pageBack = function () {
        if (!byWeb) {
            history.back();
        }
    };

    init();
}]);

app.controller('PowerOffGalleryCtrl', ['$scope', '$stateParams', '$timeout', function ($scope, $stateParams, $timeout) {
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
}]);