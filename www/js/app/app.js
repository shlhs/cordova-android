"use strict";
/**
 * Created by liucaiyun on 2017/5/4.
 */
var gAppUpdateTime = '20181127 12:00';      // 上一次app更新的时间，如果用户app上保存的时间小于这个时间，则会给出红点的更新提示
var gDefaultApps = [
    {
        name: '站点监控',
        children: [
            {
                name: '站点看板',
                icon: 'icon-kanban',
                templateUrl: '/templates/site/kanban.html',
                url: 'site-kanban',
                defaultChecked: true
            }, {
                name: '画面',
                icon: 'icon-monitor',
                templateUrl: '/templates/site/monitor-list.html',
                url: 'site-monitors',
                sn: 'station-monitor/monitor-screen-v2',
                defaultChecked: true
            }, {
                name: '设备监测',
                icon: 'icon-device-monitor',
                templateUrl: '/templates/site/device-monitor-list.html',
                url: 'device-monitor',
                sn: 'station-monitor/device-monitor',
                defaultChecked: true
            }, {
                name: '设备档案',
                icon: 'icon-archives',
                templateUrl: '/templates/site/static-devices/device-home.html',
                url: 'static-devices',
                sn: 'station-monitor/device-documents',
                defaultChecked: true
            }, {
                name: '月度报告',
                icon: 'icon-reports',
                templateUrl: '/templates/site/reports.html',
                url: 'monthly-report',
                defaultChecked: true
            }, {
                name: '电子档案',
                icon: 'icon-docs',
                templateUrl: '/templates/site/docs.html',
                url: 'site-documents',
                sn: 'station-monitor/device-documents',
                defaultChecked: true
            }, {
                name: '历史曲线',
                icon: 'icon-history-line',
                templateUrl: '/templates/site-monitor/data-line.html',
                url: 'data-line',
                sn: 'station-monitor/data-line',
                defaultChecked: true
            }, {
                name: '历史报表',
                icon: 'icon-history-report',
                templateUrl: '/templates/site-monitor/data-history.html',
                url: 'data-history',
                sn: 'station-monitor/data-report-v2',
                defaultChecked: true
            }
        ]
    }, {
    name: '运维中心',
    children: [
        {
            name: '缺陷记录',
            icon: 'icon-dashboard-dts',
            templateUrl: '/templates/dts/dts-list.html',
            url: 'dts-list',
            sn: 'ops-management/defect-tasks',
            defaultChecked: true
        }, {
            name: '安全评测',
            icon: 'icon-security',
            templateUrl: '/templates/maintenance-check/check-history.html',
            sn: 'ops-management',
            url: 'evaluate-security',
            defaultChecked: true
        }, {
            name: '停电维护',
            icon: 'icon-poweroff',
            templateUrl: '/templates/site/device-monitor-list.html',
            sn: 'ops-management',
            url: 'poweroff-maintenance',
            defaultChecked: true
        }
    ]
}, {
    name: '能源管理',
    children: [
        {
            name: '用能统计',
            icon: 'icon-energy-statistics',
            templateUrl: '/templates/energy/overview.html',
            url: 'energy-overview',
            sn: 'energy/overview',
            defaultChecked: true
        }, {
            name: '用能报表',
            icon: 'icon-energy-history',
            templateUrl: '/templates/energy/energy-report.html',
            url: 'energy-report',
            sn: 'energy/report',
            defaultChecked: true
        }, {
            name: '抄表',
            icon: 'icon-energy-reading',
            templateUrl: '/templates/energy/meter-reading.html',
            sn: 'energy/meter-reading',
            url: 'energy-meter-reading',
            defaultChecked: true
        }
    ]
}
];
var app = angular.module('myApp', ['ngAnimate', 'ui.router', 'ui.router.state.events']);

app.run(function ($animate) {
    $animate.enabled(true);
});
// app.config(['$locationProvider', function ($locationProvider) {
//
//
//     $locationProvider.html5Mode({
//         enabled: true,
//         requireBase: false//必须配置为false，否则<base href=''>这种格式带base链接的地址才能解析
//     });
// }]);

app.controller('MainCtrl', function ($scope, $rootScope, userService) {

});

var UserRole = {SuperUser: 'SUPERUSER', OpsAdmin: 'OPS_ADMIN', OpsOperator: 'OPS_OPERATOR', Normal: 'USER'};

app.service('userService', function ($rootScope) {

    this.setAccountToken = function (token) {
        setStorageItem('accountToken', token);
    };

    this.getAccountToken = function () {
        return 'Bearer' + (getStorageItem('accountToken') || '');
    };

    this.saveLoginUser = function (user, password) {
        setStorageItem('user', JSON.stringify(user));
        setStorageItem('username', user.account);
        setStorageItem('password', password);
        setStorageItem('company', '');
        this.username = user.account;
        this.password = password;
        this.user = user;
    };

    this.getUser = function () {
        var userStr = getStorageItem('user');
        if (userStr)
        {
            return JSON.parse(userStr);
        } else {
            return null;
        }
    };

    /* 获取用户角色：
        SUPERUSER：平台管理人，负责多个公司，需要先选择公司
        OPS_ADMIN：运维管理员，只负责一个公司
        OPS_OPERATOR：运维人员
        USER：普通用户，只有看站点的权限，没有任务权限
    */
    this.getUserRole = function () {
        var user = this.user;
        if (!user){
            return null;
        }
        return user.user_groups[0].name;
    };

    this.getUsername = function () {
        var username = getStorageItem('username');
        if (!username){
            username = GetQueryString("username");
            this.username = username;
        }
        return username;
    };

    this.getPassword = function () {
        var password = getStorageItem('password');
        if (!password){
            password = GetQueryString("password");
            this.password = password;
        }
        return password;
    };

    this.setPassword = function (password) {
        setStorageItem('password', password);
        this.password = password;
    };

    this.saveCompany = function (company) {
        if (company)
        {
            setStorageItem('company', JSON.stringify(company));
        }else{
            setStorageItem('company', '');
        }
        this.company = company;
    };

    this.getCompany = function () {
        return getStorageItem('company') ? JSON.parse(getStorageItem('company')) : null;
    };

    this.getTaskCompanyId = function () {
        // 获取任务时需要用到的用户id
        var perms = JSON.parse(getStorageItem("user")).permissions;
        for (var i=0; i<perms.length; i++) {
            var auth = perms[i].authrity_name;
            //运维公司
            if (auth.indexOf("COMPANY_OPS_COMPANY_VIEWCOMPANY") === 0) {
                return auth.substring("COMPANY_OPS_COMPANY_VIEWCOMPANY".length);
            }
            //用户公司
            if (auth.indexOf("USER_COMPANY_USERUSER_COMPANY") === 0) {
                return 'user' + auth.substring("USER_COMPANY_USERUSER_COMPANY".length);
            }
        }
        return null;
    };

    this.user = this.getUser();
    this.username = this.getUsername();
    this.password = this.getPassword();
    this.company = this.getCompany();

    $rootScope.permission = {canEditTask: this.getUserRole() != UserRole.Normal && this.getUserRole() != UserRole.OpsOperator};
});

app.service('platformService', function () {
    this.addPlatform = function (username, platform) {
        if (!platform){
            return;
        }
        // 将平台信息加入用户的平台信息中
        var allPlatforms = getStorageItem('platform') ? JSON.parse(getStorageItem('platform')) : {},
            currentUserPlatforms = allPlatforms[username] ? allPlatforms[username] : {};
        currentUserPlatforms[platform.code] = platform;
        allPlatforms[username] = currentUserPlatforms;
        setStorageItem('platform', JSON.stringify(allPlatforms));
    };

    this.getAllPlatform = function (username) {
        var allPlatforms = JSON.parse(getStorageItem('platform')),
            currentUserPlatforms = allPlatforms[username] ? allPlatforms[username] : {}, platforms = [];
        for (var code in currentUserPlatforms){
            platforms.push(currentUserPlatforms[code]);
        }
        return platforms;
    };

    this.setLatestPlatform = function (platform) {
        setStorageItem('latestPlatform', JSON.stringify(platform));
        this.host = platform.url;
        this.ipAddress = this.host.substring(0, this.host.indexOf(':', 5));
        this.thumbHost = this.getImageThumbHost();
    };

    this.getLatestPlatform = function () {
        var data = getStorageItem('latestPlatform');
        if (data)
        {
            return JSON.parse(getStorageItem('latestPlatform'));
        }
        return null;
    };

    this.getHost = function () {
        // 格式为： http://ip:port/v1
        var platform = this.getLatestPlatform();
        return platform ? platform.url : null;
    };

    this.getAuthHost = function () {
        return this.ipAddress + ":8096/v1"
    };

    this.getImageThumbHost = function () {      // 获取图片压缩服务的地址
        // 格式为： http://ip:8888/unsafe
        if (this.ipAddress)
        {
            return this.ipAddress + ":8888/unsafe"
        }
        return null;
    };

    this.getGraphHost = function () {
        return this.ipAddress + ':8920/v1';
    };

    this.getGraphScreenUrl = function (graphSn) {
        // 新的监控画面服务
        return this.ipAddress + ':8921/monitor.html?sn=' + graphSn;
    };

    this.getDeviceMgmtHost = function () {
        return this.ipAddress + ':8097';
    };

    this.getOldMonitorScreenUrl = function (screenSn) {
        // 老的监控画面服务
        return this.ipAddress + ':8098/monitor_screen?sn=' + screenSn;
    };

    this.getImageUrl = function (width, height, imageUrl) {
        return this.thumbHost + '/' + width + 'x' + height + '/' + imageUrl;
    };

    this.host = this.getHost();
    // this.host = 'http://127.0.0.1:8099/v1';
    this.ipAddress = this.host ? this.host.substring(0, this.host.indexOf(':', 5)) : '';
    this.thumbHost = this.getImageThumbHost();
});

app.service('ajax', function ($rootScope, platformService, userService, $http) {
    var host = platformService.host;
    $rootScope.host = host;
    var username = userService.getUsername(), password = userService.getPassword();

    $rootScope.user = null;

    $rootScope.getCompany = function(callback) {
        $.ajax({
            url: platformService.host + '/user/' + username + '/opscompany',
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            success: function (data) {
                if (data && data.length === 1)
                {
                    userService.saveCompany(data[0]);
                }else{
                    userService.saveCompany(data[0]);
                }
                callback && callback();
            },
            error: function (xhr, status, error) {
                console.log('get company info fail:' + xhr.status);
                userService.saveCompany([]);
                callback && callback();
            }
        });
    };

    this.getCompanyMembers = function (callback) {
        var companyId = userService.getTaskCompanyId();
        var url = '/opscompanies/' + companyId + '/members';
        if (companyId.indexOf('user') === 0) {
            url = '/usercompanies/'+ companyId.substring(4) + '/members';
        }
        this.get({
            url: url,
            success: function (result) {
                if (callback) {
                    callback(result);
                }
            }
        })
    };

    function request(option) {
        if (option.url.indexOf("http://") !== 0){
            option.url = platformService.host + option.url;
            // option.url = 'http://127.0.0.1:8099/v1' + option.url;
        }
        var headers = $.extend({
            Authorization: userService.getAccountToken(),
            credentials: 'include',
            mode: 'cors'
        }, option.headers);
        option = $.extend({}, {timeout: 30000}, option);
        $.extend(option, {
            xhrFields: {withCredentials: true},
            crossDomain: true,
            headers: headers
        });
		var newOption = $.extend({}, option
        );
        var r = $.ajax(newOption);
        return r;
    }
   this.get = function (option) {
        option.type = 'get';
       return request(option);
   };
   this.post = function (option) {
       option.type = 'post';
       return request(option);
   };
   this.put = function (option) {
       option.type = 'put';
       return request(option);
   };
   this.patch = function (option) {
       option.type = 'patch';
       return request(option);
   }
});

app.service('appStoreService', function () {

    this.getAllApps = function () {
        var enabledMenuSns = getMenuSns();
        if (!enabledMenuSns) {
            return gDefaultApps;
        } else {
            var appGroups = [];
            gDefaultApps.forEach(function (group) {
                var children = [];
                group.children.forEach(function (child) {
                    if (!child.sn) {    // sn为空，则说明所有人都有权限
                        children.push(child);
                    } else if (enabledMenuSns.indexOf(child.sn) >= 0) {
                        children.push(child);
                    }
                });
                if (children.length) {
                    appGroups.push({
                        name: group.name,
                        children: children
                    });
                }
            });
            return appGroups;
        }
    };

    function getMenuSns() {
        var menuStr = getStorageItem("menuSns");
        if (!menuStr) {
            return null;
        }
        return JSON.parse(menuStr);
    }

    this.getSelectedApps = function () {
        var enabledMenuSns = getMenuSns();
        var allApps = this.getAllApps();
        var appsStr = getStorageItem('apps');
        var apps = appsStr ? JSON.parse(appsStr) : null;
        var selectedApps = [];
        allApps.forEach(function (group) {
            group.children.forEach(function (app) {
                if (!apps) {
                    if (app.defaultChecked) {
                        if (app.sn && enabledMenuSns) {
                            if (enabledMenuSns.indexOf(app.sn) >= 0) {
                                app.selected = true;
                                selectedApps.push(app);
                            }
                        } else {
                            // 如果第一次登录，那么使用默认配置
                            app.selected = true;
                            selectedApps.push(app);
                        }
                    }
                } else {
                    if (apps.indexOf(app.url) >= 0) {
                        if (app.sn && enabledMenuSns) {
                            if (enabledMenuSns.indexOf(app.sn) >= 0) {
                                app.selected = true;
                                selectedApps.push(app);
                            }
                        } else {
                            app.selected = true;
                            selectedApps.push(app);
                        }
                        return false;
                    }
                }
            });
        });
        return selectedApps;
    };

    this.saveSelectedApps = function (apps) {
        var urls = [];
        apps.forEach(function (app) {
            urls.push(app.url);
        });
        setStorageItem('apps', JSON.stringify(urls));
    };

    this.appHasUpdated = function () {
        // app是否有更新
        var appUpdateTime = getStorageItem("appUpdateTime");
    }
});

app.controller('AppStoreCtrl', function ($scope, appStoreService) {
    $scope.allApps = appStoreService.getAllApps();
    $scope.selectedApps = appStoreService.getSelectedApps();
    $scope.isEditing = false;

    $scope.onAddOrDelete = function (app) {
        if (app.selected) {
            app.selected = false;
            $scope.selectedApps.forEach(function (item, i) {
                if (item.url === app.url) {
                    $scope.selectedApps.splice(i ,1);
                    return false;
                }
            });
        } else {
            app.selected = true;
            $scope.selectedApps.push(app);
        }
    };

    $scope.toggleEdit = function () {
        $scope.isEditing = !$scope.isEditing;
    };

    $scope.onSave = function () {
        appStoreService.saveSelectedApps($scope.selectedApps);
        $scope.toggleEdit();

        // 回到
        if (window.android) {
            window.android.onJsCallbackForPrevPage('onAndroidCb_updateAppList', '');
        }
    }
});

Date.prototype.format = function(fmt) {
    var o = {
        "M+" : this.getMonth()+1,                 //月份
        "d+" : this.getDate(),                    //日
        "h+" : this.getHours(),                   //小时
        "m+" : this.getMinutes(),                 //分
        "s+" : this.getSeconds(),                 //秒
        "q+" : Math.floor((this.getMonth()+3)/3), //季度
        "S"  : this.getMilliseconds()             //毫秒
    };
    if(/(y+)/.test(fmt)) {
        fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
    }
    for(var k in o) {
        if(new RegExp("("+ k +")").test(fmt)){
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
        }
    }
    return fmt;
};


var imageHandler = {
    rotate: function (file, cb) {
        EXIF.getData(file, function () {
            var orientation = EXIF.getTag(this, 'Orientation');
            var rotate='rotate(0deg)';
            if (orientation && orientation !== 1){  // 增加旋转
                switch(orientation){
                    case 6: // 需要顺时针90度旋转
                        rotate = 'rotate(90deg)';
                        break;
                    case 8: // 需要逆时针90度旋转
                        rotate = 'rotate(-90deg)';
                        break;
                    case 3: // 需要180度旋转
                        rotate = 'rotate(180deg)';
                        break;
                }
            }
            cb && cb(rotate);
        });
    },
    readFileAsDataURL: function (file, callback) {
        var a = new FileReader();
        a.onload = function(e) {
            callback(e.target.result);
        };
        a.readAsDataURL(file);
    },
    checkRotate: function(fileDict){
        var that = this;
        EXIF.getData(fileDict.file, function () {
            var orientation = EXIF.getTag(this, 'Orientation');
            // if(orientation != "" && orientation != 1){
            if(orientation != ""){
                var canvas = document.createElement("canvas"), data;
                that.readFileAsDataURL(this, function(result){
                    var img = $("<img style='display:none;'>").appendTo($('body'))[0];
                    img.src = result;
                    img.onload = function(){
                        switch(orientation){
                            case 1://需要顺时针（向左）90度旋转
                                that._rotateImg(this,'left',canvas);
                                break;
                            case 6://需要顺时针（向左）90度旋转
                                that._rotateImg(this,'left',canvas);
                                break;
                            case 8://需要逆时针（向右）90度旋转
                                that._rotateImg(this,'right',canvas);
                                break;
                            case 3://需要180度旋转
                                that._rotateImg(this,'right',canvas);//转两次
                                that._rotateImg(this,'right',canvas);
                                break;
                        }
                    }
                });
            }
        });
    },
    //对图片旋转处理 added by lzk www.bcty365.com

    _rotateImg: function (img, direction, canvas) {
        //alert(img);
        //最小与最大旋转方向，图片旋转4次后回到原方向
        var min_step = 0, max_step = 3;
        //var img = document.getElementById(pid);
        if (img === null)return;
        //img的高度和宽度不能在img元素隐藏后获取，否则会出错
        var originHeight = img.height, originWidth = img.width, width=originWidth, height=originHeight;
        if (originWidth > originHeight){
            if (originHeight > 2048){
                height = 2048;
                width = parseInt((height/originHeight) * originWidth);
            }
        }
        else {
            if (originWidth > 2048){
                width = 2048;
                height = parseInt(width/originWidth*originHeight);
            }
        }
        //var step = img.getAttribute('step');
        var step = 2;
        if (step === null) {
            step = min_step;
        }
        if (direction === 'right') {
            step++;
            //旋转到原位置，即超过最大值
            step > max_step && (step = min_step);
        } else {
            step--;
            step < min_step && (step = max_step);
        }
        //旋转角度以弧度值为参数
        var degree = step * 90 * Math.PI / 180, ctx = canvas.getContext('2d');
        switch (step) {
            case 0:
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0);
                break;
            case 1:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, 0, -height);
                break;
            case 2:
                canvas.width = width;
                canvas.height = height;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, -height);
                break;
            case 3:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, 0);
                break;
        }
    },
    compress: function(source_img_obj, quality, orientation){
        var that = this, mime_type = "image/jpeg", cvs = document.createElement('canvas');
        //naturalWidth真实图片的宽度
        var originWidth = source_img_obj.naturalWidth, originHeight = source_img_obj.naturalHeight, width=originWidth, height=originHeight;
        if (orientation && orientation !== 1){
            switch (orientation){
                case 6://需要顺时针（向左）90度旋转
                    that._rotateImg(source_img_obj,'left',cvs);
                    break;
                case 8://需要逆时针（向右）90度旋转
                    that._rotateImg(source_img_obj,'right',cvs);
                    break;
                case 3://需要180度旋转
                    that._rotateImg(source_img_obj,'right',cvs);//转两次
                    that._rotateImg(source_img_obj,'right',cvs);
                    break;
            }
        }else{
            if (originWidth > originHeight){
                if (originHeight > 2048){
                    height = 2048;
                    width = parseInt((height/originHeight) * originWidth);
                }
            }
            else {
                if (originWidth > 2048){
                    width = 2048;
                    height = parseInt(width/originWidth*originHeight);
                }
            }
            cvs.width = width;
            cvs.height = height;
            cvs.getContext("2d").drawImage(source_img_obj, 0, 0, originWidth, originHeight, 0, 0, width, height);
        }
        var result_image_obj = new Image();
        result_image_obj.src = cvs.toDataURL(mime_type, quality/100);
        return result_image_obj;
    }
};

/**
 * 图片缩放控制器
 */
app.controller('ImageZoomCtrl', function ($scope, $timeout) {
    $scope.menuVisible = false;
    $scope.header = null;
    $scope.headerVisible = false;
    imagesLoaded('#zoomTarget', function (e) {

        new RTP.PinchZoom($("#zoomTarget"), {});
    });

    $scope.hide = function () {
        history.back();
    };

    var prevTouchDown = 0, timeoutEvent=null;
    // 点击时隐藏，双击时保持PinchZoom的事件处理
    $("#zoomTarget").on({
        touchstart: function (e) {
            if (!timeoutEvent)
            {
                timeoutEvent = $timeout($scope.hide, 300);
            } else {
                $timeout.cancel(timeoutEvent);
                timeoutEvent = null;
            }
        },
        touchmove: function (e) {
            if (timeoutEvent){
                $timeout.cancel(timeoutEvent);
                timeoutEvent = null;
            }
        }
    });

    $scope.hide = function () {
        timeoutEvent = null;
        // history.back();
        $scope.headerVisible = !$scope.headerVisible;
    };

});

app.controller('BaseGalleryCtrl', function ($scope, $stateParams, $timeout) {
    // $scope.canDelete = false;
    // $scope.index = $stateParams.index;
    // $scope.images = $stateParams.images;
    $scope.show = false;

    $scope.deleteImage = function() {       // 删除图片
        var index = $("#slides .slidesjs-pagination a.active").parent().index();
        if (index < 0) {
            index = 0;
        }
        if ($scope.onDelete) {
            $scope.onDelete(index);
        }
        history.back();
    };


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
        $scope.$apply();
    }

    $timeout(initSlider, 100);


    $scope.hide = function () {
        history.back();
    };
});

app.directive('dropDownMenu', function () {
    return {
        restrict: 'E',
        templateUrl: '/templates/site-monitor/dropdown-menu.html',
        scope: {
            options: '=',
            onSelect: '=',
            modelName: '=',
            defaultValue: '=',
            selected: '='
        },
        replace: true,
        controller:['$scope', '$attrs', function($scope, $attrs){
            $scope.active = false;
            $scope.selected = $scope.selected || {};

            $scope.toggle = function () {
                $scope.active = !$scope.active;
                if ($scope.active) {
                    var mark = $('<div style="position: fixed;background-color: transparent;width: 100%;height: 100%;top:60px;z-index: 1;left: 0;" ng-click="toggle()"></div>')
                        .appendTo($scope.domEle);
                } else {
                    $scope.domEle.find('div:last').remove();
                }
            };

            $scope.onClick = function ($event, id) {
                if ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                }
                for (var i=0; i<$scope.options.length; i++) {
                    if ($scope.options[i].id === id) {
                        $scope.selected = $scope.options[i];
                        $scope.toggle();
                        $scope.onSelect($scope.modelName, $scope.selected.id, $scope.selected.name);
                        return false;
                    }
                }
            };

            if ($scope.defaultValue !== undefined) {
                for (var i=0; i<$scope.options.length; i++) {
                    if ($scope.options[i].id === $scope.defaultValue) {
                        $scope.selected = $scope.options[i];
                        break;
                    }
                }
            } else if ($scope.options.length) {
                $scope.selected = $scope.options[0];
            }
        }],
        link: function (scope, element, attrs) {
            console.log(element);
            scope.domEle = element;
        }
    }
});