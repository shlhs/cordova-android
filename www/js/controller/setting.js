"use strict";

app.controller('SettingCtrl', ['$scope', 'ajax', 'userService', 'routerService', function ($scope,ajax, userService, routerService) {
    $scope.pwd1 = '';
    $scope.pwd2 = '';
    $scope.pwdError = '';
    $scope.user = userService.user;
    $scope.version = GetQueryString('version') || '0.0.0';
    $scope.appName = GetQueryString('appName') || '快控电管家';
    $scope.company = null;

    $scope.logout = function () {
        userService.setPassword('');
        userService.saveCompany('');
        if (window.android){
            window.android.logout();
        }
        location.href = '/templates/login.html?finishPage=1';
    };

    $scope.openUiSwitchModal = function () {
        routerService.openPage($scope, '/templates/setting/uiModeSwitchModal.html', {
            mode: $scope.uiMode
        }, {
            hidePrev: false
        });
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
                    $scope.$apply();
                }
            }
        });
    }

    setTimeout(getCompany, 1000);
}]);

app.controller('UiModeSwitchCtrl', ['$scope', 'platformService', function ($scope, platformService) {

    var oldMode = $scope.mode;

    $scope.confirmModel = function () {
        if ($scope.mode !== oldMode) {
            platformService.setUiMode($scope.mode);
            $scope.$emit('onUiModeChange');
        }
        history.back();
    };
}]);

app.controller('PasswordCtrl', ['$scope', 'userService', '$timeout', 'ajax', function ($scope, userService, $timeout, ajax) {

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
}]);

app.controller('CompanyCtrl', ['$scope', '$stateParams', function ($scope, $stateParams) {
    $scope.company = $stateParams.company;
}]);

app.controller('AccountCtrl', ['$scope', 'userService', function ($scope, userService) {
    $scope.user = userService.user;
}]);