"use strict";

app.service('scrollerService', function ($timeout) {

    this.initScroll = function(elementQuery, upFn) {
        var element = angular.element(elementQuery);
        if (!element.data('scrollInited') && element.hasClass("scroll-wrapper")){
            var dropload = element.dropload({
                domUp : {
                    domClass   : 'dropload-up',
                    domRefresh : '<div class="dropload-refresh">↓下拉刷新</div>',
                    domUpdate  : '<div class="dropload-update">↑释放更新</div>',
                    domLoad    : '<div class="dropload-load"><span class="loading"></span>加载中...</div>'
                },
                loadUpFn : function(me){
                    upFn.call();
                    dropload.resetload();
                }
            });
            element.data('scrollInited', true);
        }
    };

});

app.directive('deviceTreeView',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/site/device-tree/tree-view.html',
        scope: {
            deviceList: '=',
            clickCallback: '=',
            showStatus: '=',        // 是否显示 运维/缺陷 状态
            checkbox: '=',        // 是否能多选
            // textField: '@',
            itemClicked: '&',
            itemCheckedChanged: '&',
            itemTemplateUrl: '@'
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
            var formatted = formatToTreeData($scope.deviceList);
            $scope.treeData = formatted.length ? formatToTreeData($scope.deviceList)[0].children : [];
            var lastSelected = null;

            function calcDeviceStatus() {
                function _calcItem(item) {
                    var taskCount = item.unclosed_task_count ? parseInt(item.unclosed_task_count) : 0;
                    var dtsCount = item.unclosed_defect_count ? parseInt(item.unclosed_defect_count) : 0;
                    if (item.is_group && item.children) {
                        item.children.forEach(function (child) {
                            var counts = _calcItem(child);
                            taskCount += counts[0];
                            dtsCount += counts[1];
                        });
                    }
                    if (taskCount) {
                        item.hasTask = true;
                    }
                    if (dtsCount) {
                        item.hasDts = true;
                    }
                    return [taskCount, dtsCount];
                }

                // 计算设备是否有运维、是否有缺陷
                $scope.treeData.forEach(function (item) {
                    var count = _calcItem(item);
                });
            }
            calcDeviceStatus();
            $scope.itemExpended = function(item, $event){
                item.$$isExpend = ! item.$$isExpend;
                ($scope[itemClicked] || angular.noop)({
                    $item:item,
                    $event:$event
                });
                $event.stopPropagation();
            };
            $scope.getItemIcon = function(item){
                var isLeaf = $scope.isLeaf(item);
                if(isLeaf){
                    return 'fa fa-leaf';
                }
                return item.$$isExpend ? 'fa fa-minus': 'fa fa-plus';
            };
            $scope.isLeaf = function(item){
                return !item.is_group;
            };
            $scope.warpCallback = function(item, $event){
                item.$$isExpend = !item.$$isExpend;
                if (!item.is_group) {
                    if (lastSelected) {
                        lastSelected.$$selected = false;
                    }
                    item.$$selected = true;
                    lastSelected = item;
                    if ($scope.clickCallback) {
                        $scope.clickCallback(item);
                    }
                }
            };

            $scope.searchInputChange = function (input) {
                var value = input.value.toLowerCase().trim();
                $scope.treeData.forEach(function (child) {
                    search(child, value);
                });
                $scope.$apply();
            };

            function search(data, input) {
                if (!data.is_group) {
                    if (!input || data.search_key.indexOf(input) >= 0) {
                        data.unvisible = false;
                        return true;
                    }
                    data.unvisible = true;
                    return false;
                }
                var found = false;
                data.children.forEach(function (child) {
                    if (search(child, input)) {
                        found = true;
                    }
                });
                data.unvisible = !found;
                return found;
            }
        }]
    };
}]);


/* 运维班组选择 */
app.directive('operatorTeamSelector',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/task/selector/team-selector.html',
        scope: {
            teams: '=',
            callback: '=',
            visible: '=',
            multiple: '=',
            onHide: '='
        },
        controller:['$scope', '$attrs', function($scope, $attrs){

            var selected = null;           // 当点击了"确定"后，所选项就是最终选择的

            $scope.hide = function () {
                if ($scope.onHide) {
                    $scope.onHide();
                } else {
                    $scope.visible = false;
                }
            };

            $scope.confirm = function () {
                $scope.callback(selected);
                $scope.hide();
            };

            $scope.onToggleCheck = function(team) {
                if (!selected || selected.id !== team.id ) {
                    selected = team;
                    $scope.callback(team);
                }
                $scope.hide();
            };

            $scope.isSelected = function (id) {
                return selected && selected.id === id;
            };
        }]
    };
}]);

/* 用户选择，多选 */
app.directive('handlersSelector',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/task/selector/handler-selector.html',
        scope: {
            title: '=',     // 选择框的标题，默认为：请选择运维工
            defaultUsers: '=',       // 默认选中的账号
            users: '=',
            callback: '=',
            visible: '=',
            multiple: '=',
            onHide: '='
        },
        controller:['$scope', '$attrs', function($scope, $attrs){

            var selected = [];           // 当点击了"确定"后，所选项就是最终选择的
            $scope.tmpSelected = [];        // 保存未点击"确定"前的选项

            if ($scope.defaultUsers && $scope.defaultUsers.length) {
                var defaultAccounts = [];
                $scope.defaultUsers.forEach(function (user) {
                    defaultAccounts.push(user.account);
                });
                $scope.users.forEach(function (user) {
                    if (defaultAccounts.indexOf(user.account) >= 0) {
                        selected.push(user.account);
                        $scope.tmpSelected.push(user.account);
                    }
                });
            }

            $scope.getNameAndPhone = function (user) {
                return user.name + (user.phone ? '/' + user.phone : '');
            };

            $scope.hide = function () {
                $scope.tmpSelected = selected;
                if ($scope.onHide) {
                    $scope.onHide();
                } else {
                    $scope.visible = false;
                }
            };

            $scope.confirm = function () {
                selected = $scope.tmpSelected;
                var users = [];
                $scope.users.forEach(function (user) {
                    if (selected.indexOf(user.account) >= 0) {
                        users.push(user);
                    }
                });
                $scope.callback(users);
            };

            $scope.onToggleCheck = function(account) {
                if ($scope.tmpSelected.indexOf(account) >= 0) {
                    $scope.tmpSelected.splice($scope.tmpSelected.indexOf(account), 1);
                } else {
                    $scope.tmpSelected.push(account);
                }
            };

            $scope.isSelected = function (account) {
                return $scope.tmpSelected.indexOf(account) >= 0;
            };
        }]
    };
}]);

/* 班组、用户选择 */
app.directive('teamAndHandlerSelector',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/task/selector/team-and-user-selector.html',
        scope: {
            teams: '=',
            callback: '=',
            visible: '=',
            onHide: '='
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
            $scope.selectedTeam = null;
            $scope.isTeamSelector = true;   // true：选择班组，false：选择维修工
            var selected = [];           // 当点击了"确定"后，所选项就是最终选择的
            $scope.selectedAccounts = [];        // 保存未点击"确定"前的选项

            $scope.getNameAndPhone = function (user) {
                return user.name + (user.phone ? '/' + user.phone : '');
            };

            $scope.hide = function () {
                $scope.selectedAccounts = selected;
                if ($scope.onHide) {
                    $scope.onHide();
                } else {
                    $scope.visible = false;
                }
            };

            $scope.confirm = function () {
                const users = [];
                $scope.selectedTeam.users.forEach(function (user) {
                    if ($scope.isUserSelected(user.account)) {
                        users.push(user);
                    }
                });
                $scope.callback($scope.selectedTeam, users);
            };

            $scope.onToggleCheckTeam = function(team) {
                $scope.isTeamSelector = false;
                if (!$scope.selectedTeam || team.id !== $scope.selectedTeam.id) {
                    $scope.selectedTeam = team;
                    // 跳转到维修工选择页
                    $scope.selectedAccounts = [];
                }
            };

            $scope.isTeamSelected = function (teamId) {
                return $scope.selectedTeam && $scope.selectedTeam.id === teamId;
            };

            $scope.onToggleCheckUser = function(account) {
                if ($scope.selectedAccounts.indexOf(account) >= 0) {
                    $scope.selectedAccounts.splice($scope.selectedAccounts.indexOf(account), 1);
                } else {
                    $scope.selectedAccounts.push(account);
                }
            };

            $scope.isUserSelected = function (account) {
                return $scope.selectedAccounts.indexOf(account) >= 0;
            };

            $scope.reSelectTeam = function () {
                $scope.isTeamSelector = true;
            };
        }]
    };
}]);