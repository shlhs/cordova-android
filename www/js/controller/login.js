"use strict";

/**
 * Created by liucaiyun on 2017/7/23.
 */

var gPublicApiHost = 'http://47.104.75.86:8090';     // 公有云
// var gPublicApiHost = 'http://47.97.167.195:8090';

app.controller('LoginCtrl', function ($scope, $timeout, platformService, userService, $state, $http, ajax, cordovaService) {
    $scope.error = '';
    var platform = null;
    $scope.enable = false;
    $scope.platformCode = platformService.getLatestPlatform() ? platformService.getLatestPlatform().code : null;
    $scope.username = userService.getUsername();
    $scope.password = userService.getPassword();
    $scope.isLogin = false;
    $scope.isAutoLogin = false;
    $scope.passwordVisible = false;

    $scope.togglePasswordVisible = function () {
        $scope.passwordVisible = !$scope.passwordVisible;
    };

    $scope.inputChange = function () {
        if ($scope.platformCode && $scope.username && $scope.password) {
            $scope.enable = true;
        } else {
            $scope.enable = false;
        }
    };  // 输入更改事件
    $scope.inputChange();

    $scope.login = function () {
        if (!cordovaService.networkIsValid()){
            mui.toast('网络异常，登录失败');
            if ($scope.isAutoLogin){
                $state.go('login');
            }
            return false;
        }
        $scope.enable = false;
        queryPlatform(login);
    };

    $scope.setAutoLogin = function(isAutoLogin){
        $scope.isAutoLogin = isAutoLogin;
    };

    function toast(message) {
        var div = $('<div class="toast"><div class="msg">' + message + '</div></div>').appendTo($('body'));
        $timeout(function () {
            div.remove();
        }, 2000);

    }

    function login() {
        $scope.error = '';
        var loginUrl = platformService.getAuthHost();
        var data = {
            username: $scope.username,
            password: $scope.password
        };
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
                    userService.setAccountToken(data.token);
                    getUserInfo();
                } else {
                    toast('用户名或密码错误');
                }
            },
            error :function () {
                $scope.enable = true;
                $scope.isLogin = false;
                $scope.$apply();
                toast('用户名或密码错误');
                if ($scope.isAutoLogin) {
                    userService.setPassword('');
                    $state.go('login');
                }

            }
        });
    }

    function getUserInfo() {
        ajax.get({
            url: '/user/' + $scope.username,
            success: function (data) {
                userService.saveLoginUser(data, $scope.password);
                getCompany();
            },
            error: function () {
                $scope.enable = true;
                $scope.isLogin = false;
                toast('用户名或密码错误');
                $scope.$apply();
            }
        })
    }

    function getCompany() {
        ajax.get({
            url: platform.url + '/user/' + $scope.username + '/opscompany',
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            success: function (data) {
                if (data && data.length >= 1)
                {
                    userService.saveCompany(data[0]);
                } else{
                    userService.saveCompany([]);
                }
                if (window.android){
                    window.android.loginSuccess();
                }else{
                    // location.href = '/templates/home.html?finishPage=1';
                    $state.go('index');
                }
            },
            error: function (xhr, status, error) {
                $scope.isLogin = false;
                userService.saveCompany([]);
                console.log('get company info fail:' + xhr.status);
            }
        });
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
                }else{
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
    };
    // 平台查询end

});

app.controller('AutoLoginCtrl', function ($scope, $timeout, $state, userService, platformService) {

    $scope.autoLogin = function () {
        //先等1.5s
        // 先判断是否可以自动登录
        if ($scope.username && $scope.password && $scope.platformCode){
            $scope.setAutoLogin(true);
            $timeout(function () {
                $scope.login();
            }, 500);
        }else{
            $timeout(function () {
                $state.go('login');
            }, 1500);
        }
    };

    $scope.autoLogin();
});
