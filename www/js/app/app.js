"use strict";
/**
 * Created by liucaiyun on 2017/5/4.
 */
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


app.controller('MainCtrl', function ($scope, $rootScope, userService, routerService, cordovaService) {

    $scope.openPage = function(scope, template, params, config){
        routerService.openPage(scope, template, params, config);
    };

    var taskUpdateListener = $scope.$on('onBaseTaskUpdate', function (event, taskData) {
        $scope.$broadcast('onTaskUpdate', taskData);
    });

    $scope.$on('$destroy', function (event) {
        taskUpdateListener();
        taskUpdateListener = null;
    });
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

    this.getDeviceMgmtHost = function () {
        return this.ipAddress + ':8097';
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

    this.getOldMonitorScreenUrl = function (screenSn) {
        // 老的监控画面服务
        return this.ipAddress + ':8098/monitor_screen?sn=' + screenSn;
    };

    this.getImageUrl = function (width, height, imageUrl) {
        return this.thumbHost + '/' + width + 'x' + height + '/' + imageUrl;
    };

    this.getIpcServiceHost = function () {
        // return this.ipAddress + ':8095/v1';
        return 'http://114.215.90.83:8095/v1';
    };

    this.host = this.getHost();
    this.ipAddress = this.host ? this.host.substring(0, this.host.indexOf(':', 5)) : '';
    this.thumbHost = this.getImageThumbHost();
});

app.service('ajax', function ($rootScope, platformService, userService, $http, cordovaService) {
    var host = platformService.host;
    $rootScope.host = host;
    var username = userService.getUsername(), password = userService.getPassword();

    $rootScope.user = null;

    $rootScope.getCompany = function(callback) {
        console.log(platformService.host + '/user/' + username + '/opscompany');
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
        $.extend(option, {
            xhrFields: {withCredentials: true},
            crossDomain: true,
            headers: headers
        });


		var newOption = $.extend({}, {timeout: 15000}, option);
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
    // $scope.link = $stateParams.link;
    // $scope.name = $stateParams.name;
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


app.controller('mapCtrl', function ($scope, cordovaService) {
    var sn = $scope.stationSn;

    $scope.siteData = {};
    $scope.distance = '';
    $scope.enableNavigate = false;
    function getSite() {
        var host = JSON.parse(getStorageItem('latestPlatform')).url;
        $.ajax({
            url: host + '/stations/' + sn,
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            headers: {
                Authorization: 'Bearer' + (getStorageItem('accountToken') || ''),
                credentials: 'include',
                mode: 'cors'
            },
            success: function (data) {
                data.address = (data.address_province?data.address_province:'') + (data.address_city?data.address_city:'')
                    + (data.address_district?data.address_district:'') + (data.address || '');
                $scope.siteData = data;
                $scope.$apply();
                drawMap(data);
            },
            error: function (a, b, c) {
                $.notify.error('获取站点信息失败');
                console.log('login fail');
            }
        });
    }

    function drawMap(siteData) {
        var map = new BMap.Map("map");          // 创建地图实例
        if (!map){ return; }
        // 导航
        var driving = new BMap.DrivingRoute(map, {
            renderOptions: {
                map   : map,
                panel : "results",
                autoViewport: true
            },
            onSearchComplete: function (result) {
                if (result){
                    $scope.distance = result.getPlan(0).getDistance();
                    $scope.$apply();
                }
            }
        });
        var end = new BMap.Point(siteData.longitude, siteData.latitude);
        // 添加标注
        map.centerAndZoom(end, 15);
        map.enableScrollWheelZoom();
        var marker = new BMap.Marker(end);
        var mgr = new BMapLib.MarkerManager(map,{
            maxZoom: 15,
            trackMarkers: true
        });
        mgr.addMarker(marker,1, 15);
        mgr.showMarkers();
        if (window.android && window.android.gotoThirdMap) {
            $scope.enableNavigate = true;
        }

        $scope.$apply();
        if (cordovaService.deviceReady) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var longtitude = position.coords.longtitude;
                var latitude = position.coords.latitude;
                // 添加标注
                var start = new BMap.Point(longtitude, latitude);
                // 坐标转换
                var convertor = new BMap.Convertor();
                var pointArr = [start];
                convertor.translate(pointArr, 3, 5, function (data) {   //3: gcj02坐标，5：百度坐标
                    driving.search(data.points[0], end);
                    map.centerAndZoom(end, 15);                 // 初始化地图，设置中心点坐标和地图级别
                });
            }, function (error) {
                console.log(error);
            });

        }

    }

    // 打开第三方地图
    $scope.openThirdMap = function () {
        if (window.android && window.android.gotoThirdMap){
            var sitePoint = new BMap.Point($scope.siteData.longitude, $scope.siteData.latitude);

            var convertor = new BMap.Convertor();
            var pointArr = [sitePoint];
            convertor.translate(pointArr, 5, 3, function (data) {   //3: gcj02坐标，5：百度坐标
                window.android.gotoThirdMap($scope.siteData.latitude, $scope.siteData.longitude, data.points[0].lat, data.points[0].lng);
            });
        }
    };

    getSite();
});