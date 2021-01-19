"use strict";

var app = angular.module('myApp', ['ngAnimate', 'ui.router', 'ui.router.state.events', 'pascalprecht.translate']);

function setSystemLanguage(language) {
    if (language) {
        LANGUAGE = language;
        gIsEnglish = LANGUAGE === 'en-US';
        setStorageItem('LANGUAGE', language);
    }
}

app.run(['$animate', function ($animate) {
    $animate.enabled(true);
}]);
// app.config(['$locationProvider', function ($locationProvider) {
//
//
//     $locationProvider.html5Mode({
//         enabled: true,
//         requireBase: false//必须配置为false，否则<base href=''>这种格式带base链接的地址才能解析
//     });
// }]);

function loadTranslateFiles(forceLoad) { // 加载翻译文件，forceLoad：重新加载，否则从localStorage中读取
    var jsonData = {};
    if (!forceLoad) {
        var data = localStorage.getItem(LANGUAGE + "_source");
        if (data) {
            try {
                jsonData = JSON.parse(data);
                return jsonData;
            } catch (err) {}
        }
    }
    var url = '/i18n/' + LANGUAGE + '.json';
    $.ajax({
        url: url,
        async: false,
        success: function (data) {
            localStorage.setItem(LANGUAGE + "_source", JSON.stringify(data));
            jsonData = data;
        },
        error: function (err) {
            console.log(err);
        }
    });
    return jsonData;
}

app.config(['$translateProvider', function ($translateProvider) {

    //// 不用static-file-loader，因为是json文件是异步加载的，会导致controller里的js的translate不生效的情况
    // $translateProvider.useStaticFilesLoader({
    //     prefix: '../../i18n/',
    //     suffix: '.json'
    // });

    // 使用ajax同步加载，避免js的translate先调用，但是json文件未加载，导致无法显示翻译文本的问题
    var json = loadTranslateFiles();
    $translateProvider.translations(LANGUAGE, json);
    $translateProvider.preferredLanguage(LANGUAGE);
}]);

app.filter(
    'to_trusted', ['$sce', function ($sce) {
        return function (text) {
            return $sce.trustAsHtml(text);
        };
    }]
);

app.service("$myTranslate", ['$translate', function ($translate) {
    this.instant = function (keys) {
        var tmpKeys = keys.split(' ');
        var words = [];
        tmpKeys.forEach(function (key) {
            if (key) {
                words.push($translate.instant(key));
            } else {
                words.push('');
            }
        });
        if (gIsEnglish) {
            return words.join(' ');
        }
        return words.join('');
    };
}]);

app.filter('myTranslate', ['$myTranslate', function($myTranslate) { //可以注入依赖
    return function(keys) {
        return $myTranslate.instant(keys);
    };
}]);

app.controller('LoginExpireCtrl', ['$scope', 'userService', function ($scope, userService) {
    $scope.gotoLogin = function () {
        // 先清空密码
        userService.setPassword('');
        window.location.href = '/templates/login.html';
    };
}]);

var UserRole = {SuperUser: 'SUPERUSER', OpsAdmin: 'OPS_ADMIN', OpsOperator: 'OPS_OPERATOR', Normal: 'USER'};

var gUserAccount = null;
app.service('userService', ['$rootScope', function ($rootScope) {

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
        if (user.permissions) {
            const permissions = [];
            user.permissions.forEach(function (perm) {
                permissions.push(perm.authrity_name);
            });
            setStorageItem('permissions', permissions.join(','));
            this.permissions = permissions;
        }
        setStorageItem('company', '');
        this.username = user.account;
        this.password = password;
        this.user = user;
    };

    this.getUser = function () {
        var userStr = getStorageItem('user');
        if (userStr)
        {
            var user = JSON.parse(userStr);
            gUserAccount = user.account;
            return user;
        } else {
            return null;
        }
    };

    this.getCompanyId = function () {
        if (!getStorageItem("permissions")) {
            return null;
        }
        var roles = getStorageItem("permissions").split(',');
        for (var i=0; i<roles.length; i++) {
            var role = roles[i];
            if (role.indexOf("COMPANY_OPS_COMPANY_VIEWCOMPANY") === 0) {
                return role.substring("COMPANY_OPS_COMPANY_VIEWCOMPANY".length);
            }
            //用户公司
            if (role.indexOf("USER_COMPANY_USERUSER_COMPANY") === 0) {
                return 'user' + role.substring("USER_COMPANY_USERUSER_COMPANY".length);
            }
        }
        return null;
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

    this.getPermissions = function () {
        const permission = getStorageItem('permissions');
        if (permission) {
            return permission.split(',');
        }
        return [];
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
    this.permissions = this.getPermissions();

    $rootScope.permission = {canEditTask: this.getUserRole() != UserRole.Normal && this.getUserRole() != UserRole.OpsOperator};
}]);

app.service('authService', ['userService', function (userService) {

    function isHaveTheAuthority(authority) {
        var permissions = userService.getPermissions();

        return (permissions.indexOf(authority) >= 0);
    }

    this.canConfigStation = function (stationSn) {
        return isHaveTheAuthority('ROLE_SUPERUSER') || isHaveTheAuthority('ROLE_OPS_ADMIN') || isHaveTheAuthority('ROLE_MANAGER') || (isHaveTheAuthority('ROLE_OPS_OPERATOR') && isHaveTheAuthority('STATION_EDIT_'+stationSn));
    };

    this.canControlStation = function (stationSn) {
        return isHaveTheAuthority('ROLE_OPS_ADMIN') || (isHaveTheAuthority('ROLE_OPS_OPERATOR') && isHaveTheAuthority('STATION_W_'+stationSn));
    };
}]);

app.service('platformService', function () {

    this.setLanguage = function () {
        setStorageItem('LANGUAGE', LANGUAGE);
    };

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
        this.host = platform.url.substring(0, platform.url.indexOf(':', platform.url.indexOf(':')+1));
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

    this.setPlatFuncSwitch = function (data) {
        if (data) {
            setStorageItem('global-plat-fun-switch', JSON.stringify(data));
        } else {
            setStorageItem('global-plat-fun-switch', null);
        }
    };

    this.platHasOpsFunc = function () { // 平台是否有运维功能
        var str = getStorageItem('global-plat-fun-switch');
        if (!str) {
            return true;
        }
        var data = JSON.parse(str);
        if (data.opsManagement === undefined) {
            return true;
        }
        return data.opsManagement;
    };

    this.getHost = function () {
        // 格式为： http://ip:port/v1
        if (defaultPlatIpAddr) {
            return defaultPlatIpAddr;
        }
        var platform = this.getLatestPlatform();
        return platform ? platform.url.substring(0, platform.url.indexOf(':', platform.url.indexOf(':')+1)) : null;
    };

    this.getCloudHost = function () {
        return this.host + ':8099/v1';
        // return 'http://127.0.0.1:8099/v1';
    };

    this.getAuthHost = function () {
        return this.host + ":8096/v1";
    };

    this.getImageThumbHost = function () {      // 获取图片压缩服务的地址
        // 格式为： http://ip:8888/unsafe
        if (defaultImgThumbHost) {
            return defaultImgThumbHost + ":8888/unsafe";
        }
        if (this.host)
        {
            return this.host + ":8888/unsafe";
        }
        return null;
    };

    this.getGraphHost = function () {
        return this.host + ':8920/v1';
    };

    this.getGraphScreenUrl = function (graphSn) {
        // 新的监控画面服务
        return this.host + ':8921/monitor.html?sn=' + graphSn;
    };

    this.getDeviceMgmtHost = function () {
        return this.host + ':8097';
    };

    this.getOldMonitorScreenUrl = function (screenSn) {
        // 老的监控画面服务
        return this.host + ':8098/monitor_screen?sn=' + screenSn;
    };

    this.getImageUrl = function (width, height, imageUrl) {
        // When using gifsicle engine, filters will be skipped. Thumbor will not do smart cropping as well
        var urlLength = imageUrl.length;
        if(urlLength > 4 && imageUrl.toLocaleLowerCase().lastIndexOf('.gif') === (urlLength - 4)) {
            return imageUrl;
        }

        return this.thumbHost + '/' + width + 'x' + height + '/' + imageUrl;
    };

    this.getIpcServiceHost = function () {
        if (defaultIpcHost) {
            return defaultIpcHost + ':8095/v1';
        } else {
            return this.host + ':8095/v1';
        }
    };

    this.getMediaHost = function () {
        return this.host + ':8093/v2';
    };

    this.setUiMode = function (mode) {
        setStorageItem('globalUiMode', mode);
    };

    this.host = this.getHost();
    this.thumbHost = this.getImageThumbHost();
});

// routerService
app.service('routerService', ['$timeout', '$compile', function ($timeout, $compile) {
    var pages = [], pageLength=0, currentIndex=0;
    var nextPage = {};      // 保存下一个页面的数据
    window.addEventListener('popstate', function () {
        if (!pageLength){
            return;
        }
        // 显示前一个页面，排除掉 mui-popover组建内容
        if (pageLength>1){
            pages[pageLength - 2].ele.not('.mui-popover').not('script').show();
        } else{
            pages[0].ele.prevAll().not('.mui-popover').not('script').show();
        }
        var item = pages[currentIndex], element=item.ele;
        element.addClass('ng-leave');
        item.scope.$broadcast('$destroy');
        pages.splice(pageLength-1, 1);
        pageLength -= 1;
        currentIndex = pageLength - 1;
        element[0].addEventListener('webkitAnimationEnd', _animateEnd);
        function _animateEnd() {
            element.remove();
            if (item && item.config && item.config.onClose) {
                item.config.onClose();
            }
        }
    });

    this.addHistory = function (scope, element) {
        var pageData = this.getNextPage();
        var config = pageData.config;
        var data = {
            ele: element,
            scope: scope,
            config: config
        };
        var toFinishPage = null, addNewHistory=true;
        element.addClass('ng-enter');

        function _animationEnd(event) {

            if (config && config.finish){   // 打开这个页面时，需要关闭前一个页面
                toFinishPage = pages[currentIndex].ele;
                pages[currentIndex] = data;
                addNewHistory = false;
            }else{
                pages.push(data);
                pageLength += 1;
                currentIndex = pageLength - 1;
            }
            element.removeClass('ng-enter');
            if (config.hidePrev)        // 如果配置
            {
                element.prevAll().hide();
            }

            if (toFinishPage){
                toFinishPage.remove();
            }
            if (addNewHistory){
                history.pushState(null, null, null);
            }
            element[0].removeEventListener('webkitAnimationEnd', _animationEnd);
        }
        element[0].addEventListener('webkitAnimationEnd', _animationEnd);
    };

    /**
     * @param config参数：
     *          hidePrev：是否隐藏前一个页面
     *          addHistory：是否加到location.history中，false的话，则取代当前页面
     *          onClose：页面关闭的回调
     */
    this.openPage = function (scope, templateUrl, params, config) {
        var html = "<route-page template=" + templateUrl;
        this._setNextPage(params, config);
        html += '></route-page>';
        var compileFn = $compile(html);
        var $dom = compileFn(scope);
        // 添加到文档中
        $dom.appendTo($('body'));
    };

    this._setNextPage = function (params, config) {
        config = $.extend({}, {
            hidePrev: true,      // 默认打开新页面时会隐藏前一页
            addHistory: true    // 是否加到history中
        }, config);
        nextPage = {
            params: params,
            config: config
        };
    };

    this.getNextPage = function () {
        return nextPage;
    };

    this.hasNoHistory = function () {       // 当前是否已经是第一集页面
        if (pageLength === 0) {
            return true;
        } else {
            return false;
        }
    };
}]);

app.directive('routePage', function(){
    return {
        restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
        // templateUrl: '/templates/site/site-detail.html',
        replace: true,
        controller: ['$scope', '$element', 'routerService', function($scope, $element, routerService){
            var pageData = routerService.getNextPage();
            var params = pageData.params, config=pageData.config;
            if (params){
                for (var key in params){
                    $scope[key] = params[key];
                }
            }
            if (config.addHistory)
            {
                routerService.addHistory($scope, $element);
            }
        }],
        templateUrl: function (ele, attr) {
            return attr.template;
        },
        scope: true     // scope隔离
    };
});

// routerService end

app.service('ajax', ['$rootScope', 'platformService', 'userService', 'routerService', function ($rootScope, platformService, userService, routerService) {
    var host = platformService.host;
    $rootScope.host = host;
    var username = userService.getUsername(), password = userService.getPassword();
    var tzOffset = localStorage.getItem('tzOffset');

    $rootScope.user = null;

    var expireNotified = false;     // 是否已通知用户注册过期

    if (!tzOffset) {
        tzOffset = new Date().getTimezoneOffset();
    }

    this.setTzOffset = function (station) {
        tzOffset = new Date().getTimezoneOffset();
        if (station.time_zone) {
            tzOffset = station.time_zone;
        }
        setStorageItem('tzOffset', tzOffset);
    };

    $rootScope.getCompany = function(callback) {
        $.ajax({
            url: platformService.getCloudHost() + '/user/' + username + '/opscompany',
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
        if (option.url.indexOf("http://") !== 0 && option.url.indexOf("https://") !== 0){
            option.url = platformService.getCloudHost() + option.url;
        }
        var headers = $.extend({
            Authorization: userService.getAccountToken(),
            credentials: 'include',
            mode: 'cors',
            'Accept-LANGUAGE': LANGUAGE,
            'Tz-Offset': tzOffset,
        }, option.headers);
        option = $.extend({}, {timeout: 30000}, option);
        const errorFunc = option.error;
        var startTime = new Date().getTime();
        const timeout = option.timeout;
        $.extend(option, {
            xhrFields: {withCredentials: true},
            crossDomain: true,
            headers: headers,
            error: function (xhr, statusText, error) {
                // 如果请求本身设置了ignoreAuthExpire，则不提示认证过期
                if (loginExpireCheckEnable && new Date().getTime() - startTime < timeout && !option.ignoreAuthExpire) {
                    var statusCode = xhr.status;
                    if (errorFunc) {
                        errorFunc(xhr, statusText, error);
                    }
                    if (statusCode !== 400 || statusCode !== 500 || statusCode !== 404) {
                        notifyLoginExpire();
                    }
                } else if (errorFunc) {
                    errorFunc(xhr, statusText, error);
                }
            }
        });
		var newOption = $.extend({}, option);
        var r = $.ajax(newOption);
        return r;
    }

    function notifyLoginExpire() {
        if (!expireNotified) {      // 不重复通知
            expireNotified = true;
            routerService.openPage($rootScope, '/templates/login-expire-warning.html', {}, {hidePrev: false});
        }
    }

    if (loginExpireCheckEnable) {
        window.addEventListener('popstate', function () {
            expireNotified = false;
        });
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
}]);


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

app.controller('BaseGalleryCtrl', ['$scope', '$stateParams', '$timeout', function ($scope, $stateParams, $timeout) {
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
}]);

app.directive('dropDownMenu', function () {
    return {
        restrict: 'E',
        templateUrl: '/templates/site-monitor/dropdown-menu.html',
        scope: {
            id: '=',
            options: '=',
            onSelect: '=',
            modelName: '=',
            defaultValue: '=',
            selected: '=',
            disabled: '='
        },
        replace: true,
        controller:['$scope', '$attrs', function($scope, $attrs){
            $scope.active = false;
            $scope.selected = $scope.selected || {};

            $scope.toggle = function () {
                if ($scope.disabled) {
                    return;
                }
                $scope.active = !$scope.active;
                if ($scope.active) {
                    var mark = $('<div style="position: fixed;background-color: rgba(0,0,0,0.25);width: 100%;height: 100%;top:60px;z-index: 1;left: 0;" ng-click="toggle()"></div>')
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
                        // $scope.onSelect($scope.modelName, $scope.selected.id, $scope.selected.name);
                        $scope.onSelect($scope.modelName, $scope.options[i]);
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
            if (scope.id) {
                scope.domEle[0].id = scope.id;
            }
        }
    };
});
