
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
    var sn = $scope.sn;
    $scope.stationName = $scope.name;
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
});


function onAndroid_maintenanceImageImport(imageData, filename) {    // 从Android读取的图片
    angular.element("#powerOffHandler").scope().addImagesWithBase64(imageData, filename);
}

function onAndroid_maintenanceImageDelete(filename) {    // 从Android读取的图片
    angular.element("#powerOffHandler").scope().deleteImageFromMobile(filename);
}

app.controller("MaintenanceCheckRecordItemCtrl", function ($scope, ajax, routerService, userService, $rootScope) {
    var d = new Date(), today=d.year + d.month + d.day;
    $scope.image_before_check = [];
    $scope.image_in_check = [];
    $scope.image_after_check = [];
    $scope.useMobileGallery = window.android && window.android.openGallery;
    $scope.canEdit = false;
    var apiHost = GetQueryString("apiHost") || '';      // 适配网页
    var models =['image_before_check', 'image_in_check', 'image_after_check'];
    var currentImageModel = '';     // 当前照片类型：维护前、维护过程、维护后

    if ($scope.isCreate) {
        $scope.recordData = {station_sn: $scope.stationSn, station_name: $scope.stationName,
            creator_account: userService.username, creator_name: userService.getUser().name, create_time: new Date().format('yyyy-MM-dd')};
    } else {
        $scope.recordData = {};
    }

    $scope.gotoCheckListPage = function(){
        routerService.openPage($scope, '/templates/maintenance-check/check-one-record-items.html', {recordData: $scope.recordData});
    };

    $scope.gotoPrevPage = function () {
        if (routerService.hasNoHistory()) {
            pageBack();
        } else {
            history.back();
        }
    };

    function splitImagePath(images) {
        if (!images) {
            return [];
        }
        if (images.lastIndexOf(';') === (images.length-1)) {
            images = images.substring(0, images.length-1);
        }
        var paths = [], urlHost = $rootScope.host || apiHost;
        images.split(';').forEach(function (n) {
            paths.push(urlHost+ '/' + n);
        });
        return paths;
    }

    function getData() {
        if ($scope.isCreate) {
            $scope.canEdit = true;
            ajax.get({
                url: '/poweroff_reports/template',
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
                url: apiHost + '/poweroff_reports/' + $scope.id,
                success: function (data) {
                    $scope.recordData = $.extend({}, data, {template: JSON.parse(data.template)});
                    $scope.recordData.image_before_check = splitImagePath(data.image_before_check);
                    $scope.recordData.image_in_check = splitImagePath(data.image_in_check);
                    $scope.recordData.image_after_check = splitImagePath(data.image_after_check);
                    models.forEach(function (model) {
                        $scope[model] = [];
                        splitImagePath(data[model]).forEach(function (image) {
                            $scope[model].push({
                                filename: image,
                                data: image,
                                canDelete: false
                            })
                        });
                    });
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
        var postImages = {};
        models.forEach(function (model) {
            var images = [];
            $scope[model].forEach(function (f) {
                if (f.canDelete) {
                    images.push(f.data);
                }
            });
            postImages[model] = JSON.stringify(images);
        });

        if (!$scope.recordData.id) {
            var postData = $.extend({}, $scope.recordData,
                {
                    template:JSON.stringify($scope.recordData.template),
                    stationSn: $scope.stationSn,
                    stationName: $scope.stationName
                }, postImages);
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
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error('保存失败');
                }
            })
        } else {
            var postData = $.extend({}, {
                power_capacity: $scope.recordData.power_capacity,
                power_circuit: $scope.recordData.power_circuit,
                template: JSON.stringify($scope.recordData.template)
            }, postImages);
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
                    $scope.addImagesWithBase64(dataUrl, file.name);
                };
            };
        }
        obj.files = null;
    };

    $scope.openMobileGallery = function (model) {        // 打开手机上相册
        currentImageModel = model;
        window.android.openGallery(9, 'onAndroid_maintenanceImageImport', 'onAndroid_maintenanceImageDelete');
    };

    $scope.setCurrentImageModel = function (model) {
        currentImageModel = model;
    };

    $scope.addImagesWithBase64 = function (data, filename) {
        if ($scope[currentImageModel] === undefined){   // 用于保存新上传的图片，保存时只保存新上传的图片
            $scope[currentImageModel] = [];
        }
        $scope[currentImageModel].push({filename: filename, data: data, canDelete: true});
        $scope.$apply();
    };


    $scope.deleteImageFromMobile = function (filename) {
        var editingImageFiles = $scope[currentImageModel];
        for (var i=0; i<editingImageFiles; i++) {
            if (editingImageFiles[i].canDelete && editingImageFiles[i].filename === filename) {
                editingImageFiles.splice(i, 1);
                break;
            }
        }
        $scope.$apply();
    };

    $scope.openGallery = function(startIndex, imageModel) {
        currentImageModel = imageModel;
        routerService.openPage($scope, '/templates/maintenance-check/gallery.html', {
            index: startIndex+1,
            files: $scope[imageModel],
            onDelete: function (index) {
                if ($scope[currentImageModel].length > index) {
                    $scope[currentImageModel].splice(index, 1);
                }
            }
        });
    };

    init();
});


app.controller('MaintenanceChecklistCtrl', function ($scope, ajax) {
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
});

app.controller('MaintenanceGalleryCtrl', function ($scope, $timeout) {

    $scope.show = false;

    $scope.deleteImage = function(index) {       // 删除图片
        if ($scope.onDelete) {
            $scope.onDelete(index);
        }
        history.back();
    };

    function initSlider() {
        if ($scope.files.length>1){
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
        $scope.$apply();
    }

    $timeout(initSlider, 100);


    $scope.hide = function () {
        history.back();
    };
});