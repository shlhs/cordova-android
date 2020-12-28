"use strict";

/**
 * Created by liucaiyun on 2017/7/23.
 */

// var gPublicApiHost = 'http://47.104.75.86:8090';        // 公有云接口
var gPublicApiHost = 'http://47.111.182.35:8090';        // 西电自动化
var defaultActiveEnergyMode = false; // 是否默认使用能效管理模式

app.controller('LoginCtrl', ['$scope', '$timeout', 'platformService', 'userService', '$state', '$http', 'ajax', '$translate', function ($scope, $timeout, platformService, userService, $state, $http, ajax, $translate) {
    $scope.error = '';
    var platform = null;
    $scope.isDark = gTheme === 'dark';
    $scope.platformCodeVisible = !defaultPlatIpAddr;
    $scope.platformCode = platformService.getLatestPlatform() ? platformService.getLatestPlatform().code : null;
    $scope.username = userService.getUsername();
    $scope.password = userService.getPassword();
    $scope.enable = $scope.platformCode && $scope.username && $scope.password;
    $scope.isLogin = false;
    $scope.isAutoLogin = false;
    $scope.passwordVisible = false;
    $scope.appName = appName;

    $scope.togglePasswordVisible = function () {
        $scope.passwordVisible = !$scope.passwordVisible;
    };

    $scope.inputChange = function () {
        if ((!$scope.platformCodeVisible || $scope.platformCode) && $scope.username && $scope.password) {
            $scope.enable = true;
        } else {
            $scope.enable = false;
        }
    };  // 输入更改事件
    $scope.inputChange();

    $scope.login = function () {
        if (!$scope.enable) {
            return;
        }
        $scope.enable = false;
        if (defaultPlatIpAddr) {
            login();
        } else {
            queryPlatform(login);
        }
    };

    $scope.setAutoLogin = function(isAutoLogin){
        $scope.isAutoLogin = isAutoLogin;
        $scope.enable = true;
    };

    function toast(message) {
        var div = $('<div class="toast"><div class="msg">' + message + '</div></div>').appendTo($('body'));
        $timeout(function () {
            div.remove();
        }, 1500);
    }

    function login() {
        $scope.error = '';
        var data = {
            username: $scope.username.trim(),
            password: $scope.password
        };
        var loginUrl = platformService.getAuthHost();
        $scope.isLogin = true;
        $.ajax({
            url: loginUrl + '/auth',
            method:'POST',
            timeout: 10000,
            data: JSON.stringify(data),
            dataType:"json",
            headers: {
                "xhrFields-Type": {
                    withCredentials: true
                },
                'Content-Type': 'application/json;chartset=UTF-8'
            },
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            success: function (data) {
                var result = KJUR.jws.JWS.verify(data.token, 'zjlhstest');
                if (result) {
                    platformService.setLanguage();
                    if (!getStorageItem('latestPlatform')) {
                        platformService.setLatestPlatform({url: defaultPlatIpAddr + ":8099/v1"});
                    }
                    userService.setAccountToken(data.token);
                    getUserInfo();
                } else {
                    toast($translate.instant('login.error'));
                    if ($scope.isAutoLogin) {
                        userService.setPassword('');
                        location.href = 'login.html';
                    }
                }
            },
            error :function () {
                $scope.enable = true;
                $scope.isLogin = false;
                $scope.$apply();
                toast($translate.instant('login.error'));
                if ($scope.isAutoLogin) {
                    userService.setPassword('');
                    location.href = 'login.html';
                }

            }
        });
    }

    function getUserInfo() {
        // 获取平台开关配置
        ajax.get({
            url: '/plat-function-switch',
            async: false,
            success: function (data) {
                platformService.setPlatFuncSwitch(data);
            }
        });
        ajax.get({
            url: '/user/' + $scope.username.trim(),
            ignoreAuthExpire: true,
            success: function (data) {
                userService.saveLoginUser(data, $scope.password);
                // getCompany();
                if (window.android){
                    window.android.loginSuccess();
                } else{
                    location.href = '/templates/home.html?finishPage=1';
                }
            },
            error: function () {
                $scope.enable = true;
                $scope.isLogin = false;
                toast($translate.instant('login.error'));
                $scope.$apply();
            }
        })
    }

    // 平台查询start
    $scope.platformError = '';
    function queryPlatform(cb) {
        $scope.platformError = '';

        $http({
            url: gPublicApiHost + '/v1/sites/' + $scope.platformCode,
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            timeout: 10000
        }).then(function (data) {
            platform = data.data;
            if (!platform){
                if ($scope.isAutoLogin){
                    userService.setPassword('');
                    location.href = 'login.html';
                } else{
                    $scope.enable = true;
                    toast('平台编号错误');
                    $scope.$apply();
                }
                return;
            }
            // platform.url = 'http://127.0.0.1:8099/v1';
            platformService.setLatestPlatform(platform);
            cb && cb();

        }).catch(function () {
            if ($scope.isAutoLogin){
                userService.setPassword('');
                location.href = '/templates/login.html';
                $scope.enable = false;
            }else{
                $scope.enable = true;
                toast('平台编号错误');
                $scope.$apply();
            }
        });
    }
    // 平台查询end
}]);

app.controller('AutoLoginCtrl', ['$scope', '$timeout', function ($scope, $timeout) {
    setSystemLanguage(GetQueryString('language')); // 设置系统语言。 language参数由手机读取系统参数后上传
    loadTranslateFiles(true);
    $scope.autoLogin = function () {
        //先等1.5s
        // 先判断是否可以自动登录
        if ($scope.username && $scope.password && (defaultPlatIpAddr || $scope.platformCode)){
            $scope.setAutoLogin(true);
            $timeout(function () {
                $scope.login();
            }, 500);
        }else{
            $timeout(function () {
                // $state.go('login');
                location.href = '/templates/login.html?finishPage=1';
            }, 1500);
        }
    };
    // if (window.android && window.android.checkWebVersion) {
    //     // 启动时先检测web版本并升级
    //     window.android.checkWebVersion();
    // }
    $scope.autoLogin();
}]);
