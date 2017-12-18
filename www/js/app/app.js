"use strict";
/**
 * Created by liucaiyun on 2017/5/4.
 */


var app = angular.module('myApp', ['ngAnimate', 'ui.router', 'ui.router.state.events']);

app.run(function ($animate) {
    $animate.enabled(true);
});

app.controller('MainCtrl', function ($scope) {
});


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
        var platform = this.getLatestPlatform();
        return platform ? platform.url : null;
    };
    this.host = this.getHost();
});

app.service('ajax', function ($rootScope, platformService, userService, $http) {
    var host = platformService.host;
    $rootScope.host = host;
    var username = userService.getUsername(), password = userService.getPassword();
    $rootScope.user = null;
    $rootScope.login = function(callback) {

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
                    userService.saveCompany(data);
                }
                callback && callback();
            },
            error: function (xhr, status, error) {
                console.log('get company info fail:' + xhr.status);
                userService.saveCompany([]);
                callback && callback();
            }
        });
    }

    function request(option) {
        if (option.url.indexOf("http://") === 0){
            option.url = "http://114.215.90.83:8099/v1" + option.url;
        }else{
            option.url = platformService.host + option.url;
        }
        option.timeout = 5000;
        option.xhrFields = {withCredentials: true};
        option.crossDomain = true;

		var newOption = $.extend({}, option, {
		    error: function () {
                $rootScope.login(function () {
                    $.ajax(option);
                });
            }
        });
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
});
