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


app.controller('MainCtrl', function ($scope, $rootScope, userService) {

});

var UserRole = {SuperUser: 'SUPERUSER', OpsAdmin: 'OPS_ADMIN', OpsOperator: 'OPS_OPERATOR', Normal: 'USER'};


app.service('userService', function ($rootScope) {
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
        return JSON.parse(getStorageItem('user'));
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

    this.getImageThumbHost = function () {      // 获取图片压缩服务的地址
        // 格式为： http://ip:8888/unsafe
        if (this.host)
        {
            return this.host.substring(0, this.host.indexOf(':', 5)) + ":8888/unsafe"
        }
        return null;
    };

    this.getImageUrl = function (width, height, imageUrl) {
        return this.thumbHost + '/' + width + 'x' + height + '/' + imageUrl;
    };

    this.host = this.getHost();
    this.thumbHost = this.getImageThumbHost();
});

app.service('ajax', function ($rootScope, platformService, userService, $http) {
    var host = platformService.host;
    $rootScope.host = host;
    var username = userService.getUsername(), password = userService.getPassword();

    $rootScope.user = null;
    $rootScope.login = function(callback) {
        console.log('login: username=' + username + ', password='+password);
        var url = host + '/login';
        var option = {
            url: url,
            type:'post',
            data: {
                username: username,
                password: password
            },
            dataType:"json",
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            complete: function (a,b,c) {
                console.log();
            },
            success: function (data) {
                console.log('login success');
                userService.saveLoginUser(data, password);
                $rootScope.getCompany(callback);
            },
            error: function (a, b, c) {
                $.notify.error('登录失败');
                console.log('login fail');
            }
        };
        $.ajax(option);

    };

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

    function request(option) {
        if (option.url.indexOf("http://") !== 0){
            option.url = platformService.host + option.url;
        }
        option.timeout = 5000;
        option.xhrFields = {withCredentials: true};
        option.crossDomain = true;

		var newOption = $.extend({}, option
            // {
            // error: function (xhr, status, error) {
		     //    if (xhr.status === 500){
		     //        option.error && option.error(xhr, status, error);
            //     } else {
            //         $rootScope.login(function () {
            //             $.ajax(option);
            //         });
            //     }
            // }}
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
