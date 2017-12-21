"use strict";

/**
 * Created by liucaiyun on 2017/7/23.
 */

var gPublicApiHost = 'http://114.215.90.83:8090';


app.controller('LoginCtrl', function ($scope, $timeout, platformService, userService, $state, $http) {
    $scope.error = '';
    var platform = null;
    $scope.platformCode = platformService.getLatestPlatform() ? platformService.getLatestPlatform().code : null;
    $scope.username = userService.getUsername();
    $scope.password = userService.getPassword();
    $scope.isLogin = false;
    $scope.isAutoLogin = false;
    $scope.login = function () {
        // if (!platform || $scope.platformCode != platform.code){
        queryPlatform(login);
        // }else{
        //     login();
        // }
        // $state.go('index');
    };

    $scope.setAutoLogin = function(isAutoLogin){
        $scope.isAutoLogin = isAutoLogin;
    };

    function getCompany(callback) {
        $.ajax({
            url: platform.url + '/user/' + $scope.username + '/opscompany',
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
                $state.go('index');
            },
            error: function (xhr, status, error) {
                console.log('get company info fail:' + xhr.status);
            }
        });
    }

    function login() {
        $scope.error = '';
        $scope.isLogin = true;

        $.ajax({
            url: platform.url + '/login',
            method:'POST',
            timeout: 10000,
            data: {
                username: $scope.username,
                password: $scope.password
            },
            dataType:"json",
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            success: function (data) {
                userService.saveLoginUser(data, $scope.password);
                platformService.addPlatform($scope.username, platformService.getLatestPlatform());
                if (window.android){
                window.android.loginSuccess(platform.url, $scope.username, $scope.password);
                }else{
                    location.href = '/templates/home.html?finishPage=1';
                }
                // $state.go('index');
                // getCompany();
            },
            error :function () {

                $scope.error = '用户名或密码错误';
                $scope.isLogin = false;
                $scope.$apply();
                if ($scope.isAutoLogin) {
                    userService.setPassword('');
                    location.href = 'login.html';
                }

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
                    $scope.platformError = '平台编码不正确，请重新输入';
                    $scope.$apply();
                }
                return;
            }
            platformService.setLatestPlatform(platform);
            cb && cb();

        }).catch(function () {
            if ($scope.isAutoLogin){
                userService.setPassword('');
                location.href = '/templates/login.html';
            }else{
                $scope.platformError = '查询平台失败，请检查平台编码是否正确';
                $scope.$apply();
            }
        });
    };
    // 平台查询end

});

app.controller('AutoLoginCtrl', function ($scope, $timeout, $state) {

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
                // $state.go('login');
                location.href = '/templates/login.html';
            }, 1500);
        }
    };

    $scope.autoLogin();
});
