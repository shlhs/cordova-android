"use strict";

app.controller('SettingCtrl', function ($scope, platformService, userService, $state, ajax) {
    $scope.pwd1 = '';
    $scope.pwd2 = '';
    $scope.pwdError = '';
    $scope.user = userService.user;
    $scope.company = null;
    $scope.version = GetQueryString('version') || '0.0.0';
    $scope.appName = GetQueryString('appName') || '快控电管家';
    $scope.userRole = userService.getUserRole();

    $scope.logout = function () {
        userService.setPassword('');
        userService.saveCompany('');
        if (window.android){
            window.android.logout();
        }
        // location.href = '/templates/login.html?finishPage=1';
        $state.go('login');
    };

    function getCompany() {
        ajax.get({
            url: '/user/' + $scope.user.account + '/opscompany',
            ignoreAuthExpire: true,
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            success: function (data) {
                if (data && data.length >= 1)
                {
                    $scope.company = data[0];
                    $scope.company.full_address = (data[0].province || '') + (data[0].city || '') + (data[0].detail || '');
                    $scope.$apply();
                }
            }
        });
    }

    setTimeout(getCompany, 1000);
});

app.controller('PasswordCtrl', function ($scope, userService, $timeout, ajax) {

    function check() {
        if (!$scope.pwd1 && !$scope.pwd2){
            $scope.pwdError = '密码不能为空';
            return false;
        }
        if ($scope.pwd1 !== $scope.pwd2){
            $scope.pwdError = '两次输入的密码不一致';
            return false;
        }
        return true;
    }

    $scope.savePassword = function () {
        if (!check()){
            return ;
        }
        $.notify.progressStart();
        ajax.put({
            url: '/user/resetpassword?newpassword=' + $scope.pwd1 + '&oldpassword=' + userService.password,
            cache: false,
            success: function (data) {
                $.notify.progressStop();
                $.notify.info('密码修改成功');
                userService.setPassword($scope.pwd1);
                window.android && window.android.changePassword($scope.pw1);
                // 自动返回上一页
                $timeout(function () {
                    history.back();
                }, 1500);
            },
            error: function (xhr, status, error) {
                $.notify.progressStop();
                $.notify.error('密码修改失败');
                console.log('修改密码发生异常');
            }
        });
    };
});

app.controller('CompanyCtrl', function ($scope, $stateParams) {
    $scope.company = $stateParams.company;
});

app.controller('AccountCtrl', function ($scope, userService) {
    $scope.user = userService.user;
});