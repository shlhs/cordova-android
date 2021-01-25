"use strict";

app.controller('SettingCtrl', ['$scope', 'ajax', 'userService', 'routerService', '$myTranslate', function ($scope,ajax, userService, routerService, $myTranslate) {
    $scope.pwd1 = '';
    $scope.pwd2 = '';
    $scope.pwdError = '';
    $scope.user = userService.user;
    $scope.version = GetQueryString('version') || '0.0.0';
    $scope.appName = GetQueryString('appName') || '快控电管家';
    $scope.company = null;

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

app.controller('PasswordCtrl', ['$scope', 'userService', '$timeout', 'ajax', '$myTranslate', function ($scope, userService, $timeout, ajax, $myTranslate) {

    function check() {
        if (!$scope.pwd1 && !$scope.pwd2){
            $scope.pwdError = $myTranslate.instant('setting.pwd.tip.required');
            return false;
        }
        if ($scope.pwd1 !== $scope.pwd2){
            $scope.pwdError = $myTranslate.instant('setting.pwd.error.notmatch');
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
                $.notify.info($myTranslate.instant('setting.pwd.set.success'));
                userService.setPassword($scope.pwd1);
                window.android && window.android.changePassword($scope.pw1);
                // 自动返回上一页
                $timeout(function () {
                    history.back();
                }, 1500);
            },
            error: function (xhr, status, error) {
                $.notify.progressStop();
                $.notify.error($myTranslate.instant('setting.pwd.set.failed'));
            }
        });
    };

    $scope.onBlur = function () {
        if ($scope.pwd1 && $scope.pwd2 && $scope.pwd1 !== $scope.pwd2) {
            $scope.pwdError = $myTranslate.instant('setting.pwd.error.notmatch');
        } else {
            $scope.pwdError = '';
        }
    };
}]);

app.controller('CompanyCtrl', ['$scope', '$stateParams', function ($scope, $stateParams) {
    $scope.company = $stateParams.company;
}]);

app.controller('AccountCtrl', ['$scope', 'userService', '$myTranslate', function ($scope, userService, $myTranslate) {
    $scope.user = userService.user;

    $scope.logout = function () {
        var btnArray = [$myTranslate.instant('cancel'), $myTranslate.instant('logout')];
        mui.confirm("", $myTranslate.instant('logout.confirm'), btnArray, function(e) {
            if (e.index === 1) {     // 是
                userService.setPassword('');
                userService.saveCompany('');
                if (window.android){
                    window.android.logout();
                }
                location.href = '/templates/login.html?finishPage=1';
            }
        });

    };
}]);

app.controller('AppShareCtrl', ['$scope', function ($scope) {
    $scope.src = gQrDownloadUrl + "?t=" + new Date().getTime();
}]);