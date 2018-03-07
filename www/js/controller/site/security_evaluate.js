
function bodyScroll(ele) {
    if (ele.scrollTop > 20) {
        $('#transparentHeader').removeClass('bg-transparent');
    } else {
        $('#transparentHeader').addClass('bg-transparent');
    }
    console.log('scroll');
}

app.controller('SecurityBaseCtrl', function ($scope, $compile, $location) {
   function load() {
       var templateUrl = GetQueryString("template");
       var html = "<root-page template=" + templateUrl + "></root-page>";
       var compileFn = $compile(html);
       var $dom = compileFn($scope);
       // 添加到文档中
       $dom.appendTo($('body'));
   }
   load();
});

app.service('SecurityReportService', function (userService, ajax) {
    function _parseSecurityTemplate(template) {

        function evaluateItem(path, item) {
            if (item.items && item.items.length) {
                item.items.forEach(function (n) {
                    evaluateItem(path+'/'+n.name, n);
                });
                // 设置大类的状态
                item.status = 'success';
                item.items.forEach(function (n) {
                    if (item.status === 'warning' || n.status === 'warning') {
                        item.status = 'warning';
                    } else if (item.status === 'disabled' || n.status === 'disabled' || n.status === undefined) {
                        item.status = 'disabled';
                    }
                });
            } else {
                if (item.checkList && item.checkList.length) {
                    var tmpFinish=0, tmpUnqualified=0;
                    item.checkList.forEach(function (n) {
                        total += 1;
                        if (n.value === '0' || n.value === '1') {
                            finish += 1;
                            tmpFinish += 1;
                            if (n.value === '1') {    // 不合格
                                if (unqualified[n.type] === undefined) {
                                    unqualified[n.type] = 1;
                                } else {
                                    unqualified[n.type] += 1;
                                }
                                n.path = path.split('/').join(' -> ');
                                unqualifiedList.push(n);
                                tmpUnqualified += 1;
                            }
                        }
                    });
                    // 每个类别都有自己的状态
                    if (tmpUnqualified > 0) {
                        item.status = 'warning';
                    } else if (tmpFinish === item.checkList.length) {
                        item.status = 'success';
                    } else {
                        item.status = 'disabled';
                    }
                }
            }
        }

        var total=0, finish=0, unqualified={}, unqualifiedList=[], emergency=0, serious=0, normal=0;
        template.forEach(function (item) {
            evaluateItem(item.name, item);
        });
        var result = {total: total, finish: finish};
        result.unqualified = unqualified;
        result.unqualifiedList = unqualifiedList;
        if (finish === 0) {
            result.status = 'disabled';
        }
        else if (!unqualifiedList.length) {
            result.status = 'success';
        } else {
            result.status = 'warning';
        }
        result.unqualifiedList.forEach(function (t) {
            if (t.name === '紧急') {
                emergency += 1;
            } else if (t.name === '重大') {
                serious += 1;
            } else {
                normal += 1;
            }
        });
        result.emergency = emergency;
        result.serious = serious;
        result.normal = normal;
        result.template = template;
        return result;
    }

    this.parseTemplate = function (template) {
        return _parseSecurityTemplate(template);
    };


    this.saveReport = function (scope, id, template, successCallback) {
        var requestData = this.parseTemplate(template);
        requestData.template = JSON.stringify(requestData.template);
        requestData.station_sn = scope.stationSn;
        requestData.station_name = scope.stationName;
        $.notify.progressStart();
        if (id) {
            requestData.id = id;
            requestData.updater_id = userService.getUser().id;
            ajax.patch({
                url: '/security_reports/' + id,
                data: JSON.stringify(requestData),
                contentType:"application/json",
                headers: {
                    Accept: "application/json"
                },
                success: function (data) {
                    $.notify.progressStop();
                    $.notify.info("保存成功");
                    successCallback && successCallback(data);
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error('保存失败');
                }
            });
        } else {
            requestData.creator_account = userService.username;
            requestData.creator_name = userService.getUser().name;
            if (scope.taskId)
            {
                requestData.ops_task_id = scope.taskId;
            }
            ajax.post({
                url: '/security_reports',
                data: JSON.stringify(requestData),
                contentType:"application/json",
                headers: {
                    Accept: "application/json"
                },
                success: function (data) {
                    $.notify.progressStop();
                    $.notify.info("保存成功");

                    // 调用Android接口
                    window.android && window.android.onJsCallbackForPrevPage('setTaskReportId', data.id);
                    successCallback && successCallback(data);
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error('保存失败');
                }
            });
        }
    };
});

app.controller('SecurityHistoryCtrl', function ($scope, routerService, ajax, userService) {
    var sn = GetQueryString('sn');
    $scope.stationName = GetQueryString("name");
    $scope.history = [];
    $scope.isLoading = false;

    $scope.createOneRecord = function () {
        $scope.openPage('/templates/evaluate/security-evaluate-first-classify.html', {isCreate: true, stationSn: sn,
            stationName: $scope.stationName});
    };

    $scope.openPage = function(template, params, config){
        routerService.openPage($scope, template, params, config);
    };

    function getHistory() {
        $scope.isLoading = true;
        ajax.get({
            url: '/security_reports?station_sn=' + sn,
            success: function (data) {
                $scope.isLoading = false;
                $scope.history = data;
                $scope.history.forEach(function (t) {
                    t.finishRate = Math.round(100*t.finish / t.total) + '%';
                    t.unqualifiedCount = t.emergency + t.serious + t.normal;
                });
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $scope.$apply();
            }
        })
    }

    function init() {
        getHistory();
    }

    $scope.refresh = function (data) {
        if (!data){
            return;
        }
        // 更新
        data.finishRate = Math.round(100*data.finish/data.total) + '%';
        data.unqualifiedCount = data.unqualifiedList.length;
        var existed = false;
        for (var i=0; i<$scope.history.length; i++){
            if ($scope.history[i].id === data.id) {
                $scope.history[i] = data;
                existed = true;
                break;
            }
        }
        if (!existed) {
            $scope.history.unshift(data);
        }
    };

    init();
});

app.controller('SecurityEvaluateHome', function ($scope, $http, ajax, routerService, SecurityReportService) {
    var backupData = {};        // 保存原始数据
    $scope.evaluateData = {};
    $scope.total = 0;
    $scope.unqualifiedList = [];
    $scope.unqualified = {};
    $scope.status = 'disabled';
    $scope.editable = false;

    // 画进度
    function drawProgress(progress) {
        if (!progress) {    //
            $("#evaluateChart").circleChart({
                color: "#ffffff",
                backgroundColor: "#e6e6e6",
                widthRatio: 0.1, // 进度条宽度
                size: Math.round($("#evaluateChart").parent().parent().height()*0.8),
                value: 100,
                startAngle: 175,
                speed: 1,
                textSize: 36,
                relativeTextSize: 14,
                animation: "easeInOutCubic",
                text: 0,
                onDraw: function(el, circle) {
                    circle.text("0%"); // 根据value修改text
                }
            });
        } else {
            var color = '#F44336';  // warning的颜色
            if ($scope.evaluateData.status === 'success') {
                color = '#26A69A';
            }
            $("#evaluateChart").circleChart({
                color: color,
                backgroundColor: "rgba(255,255,255,0.5)",
                widthRatio: 0.1, // 进度条宽度
                size: Math.round($("#evaluateChart").parent().parent().height()*0.8),
                value: progress,
                startAngle: 175,
                speed: 2000,
                textSize: 36,
                relativeTextSize: 14,
                animation: "easeInOutCubic",
                text: 0,
                onDraw: function(el, circle) {
                    circle.text(Math.round(circle.value) + "%"); // 根据value修改text
                }
            });
        }
    }

    function getEvaluateData() {        // 获取评估数据
        ajax.get({
            url: '/security_reports/' + $scope.id,
            success: function (data) {
                data.template = JSON.parse(data.template);
                var tmp = SecurityReportService.parseTemplate(data.template);
                $.extend($scope.evaluateData, data, tmp);
                $scope.editable = data.editable;
                $scope.refresh();
                $scope.$apply();
            }
        });
    }
    $scope.openPage = function(template, params, config){
        routerService.openPage($scope, template, params, config);
    };

    $scope.refresh = function() {       // 刷新数据
        var tmp = SecurityReportService.parseTemplate($scope.evaluateData.template);
        $.extend($scope.evaluateData, tmp);
        if ($scope.$parent && $scope.$parent.refresh)
        {
            $scope.$parent.refresh($scope.evaluateData);
        }
        drawProgress(Math.ceil($scope.evaluateData.finish*100/$scope.evaluateData.total));
    };

    $scope.clearChange = function() {   // 还原数据
        $scope.evaluateData = $.extend({}, backupData);
    };

    function init() {
        getEvaluateData();
    }

    $scope.gotoPrevPage = function () {
        if (routerService.hasNoHistory()) {
            pageBack();
        } else {
            history.back();
        }
    };

    init();
});

app.controller('SecurityEvaluateDetailCtrl', function ($scope, $http, ajax, userService, routerService, SecurityReportService) {
    var byWeb = GetQueryString("by") === 'web' ? true : false;      // 是否是从web请求的
    $scope.evaluateData = $scope.$parent.evaluateData;
    $scope.template = (byWeb || !$scope.evaluateData ) ? '' : $scope.evaluateData.template;
    $scope.hasPermission = false;
    $scope.editable = $scope.evaluateData ? $scope.evaluateData.editable : true;

    $scope.goBack = function () {
        if (byWeb) {
            return;
        }
        $scope.gotoPrevPage();
    };

    $scope.gotoPrevPage = function () {     // 提示是否保存
        if ($scope.$parent.refresh) {
            $scope.$parent.refresh();
        }
        if (routerService.hasNoHistory()) {
            pageBack();
        } else {
            history.back();
        }
    };

    $scope.openPage = function(template, params, config){
        routerService.openPage($scope, template, params, config);
    };

    function getEvaluateData() {        // 获取评估数据
        ajax.get({
            url: '/security_reports/template',
            success: function (data) {
                $scope.evaluateData = SecurityReportService.parseTemplate(data);
                $scope.template = $scope.evaluateData.template;
                $scope.$apply();
            }
        });
    }

    function getDefaultTemplate() {
        var templateName = GetQueryString("name"), apiHost=GetQueryString("apiHost");
        ajax.get({
            url: apiHost + '/security_reports/template?name=' + (templateName ? templateName : ''),
            success: function (data) {
                $scope.template=data;
                $scope.$apply();
            },
            error: function (xhr, status, error) {
                $scope.$apply();
            }
        });
    }

    function init() {
        if (byWeb) {
            getDefaultTemplate();
        } else {
            if ($scope.isCreate) {
                getEvaluateData();
                $scope.hasPermission = true;
            } else {
                if ($scope.evaluateData.creator_account === userService.username) {
                    $scope.hasPermission = true;
                }
            }
        }
    }
    $scope.save = function() {
        SecurityReportService.saveReport($scope, $scope.evaluateData.id, $scope.evaluateData.template, function (data) {
            if (data && data.id) {
                $scope.evaluateData = SecurityReportService.parseTemplate(JSON.parse(data.template));
                $scope.evaluateData.id = data.id;
                if ($scope.$parent && $scope.$parent.refresh)
                {
                    $scope.$parent.refresh($scope.evaluateData);
                }
            } else {
                $scope.$parent.refresh && $scope.$parent.refresh();
            }
        });
    };

    init();
});

app.controller('SecurityEvaluateChecklistCtrl', function ($scope, ajax) {
    $scope.items = $scope.group.items;
    $scope.currentIndex = 0;
    $scope.currentItem = null;
    $scope.checklist = [];

    $scope.chooseItem = function (index) {
        $scope.currentIndex = index;
        $scope.currentItem = $scope.items[index];
        $scope.checklist = $scope.currentItem.checkList;
    };

    function init() {
        if ($scope.items && $scope.items.length) {
            $scope.chooseItem(0);
        }
    }


    function setGroupStatus(groupData) {
        if (!groupData || !groupData.items) {
            return;
        }
        // 设置大类的状态
        var status = 'success';
        groupData.items.forEach(function (n) {
            if (status === 'warning' || n.status === 'warning') {
                status = 'warning';
            } else if (status === 'disabled' || n.status === 'disabled' || n.status === undefined) {
                status = 'disabled';
            }
        });
        groupData.status = status;
    }

    function setItemStatus(itemData) {
        var total=0, finish=0, error=0;
        itemData.checkList.forEach(function (n) {
            if (n.value === '0') {
                finish += 1;
            } else if (n.value === '1') {
                finish += 1;
                error += 1;
            }
            total += 1;
        });
        var status = 'success';
        if (error > 0) {
            status = 'warning';
        } else if (finish < total) {
            status = 'disabled';
        }
        itemData.status = status;
    }

    $scope.checkThis = function (checkItem) {
        // 判断当前类别的状态
        setItemStatus($scope.currentItem);
    };

    $scope.save = function() {
        $scope.$parent.save();
    };

    $scope.gotoPrevPage = function () {
        setGroupStatus($scope.group);
        history.back();
    };
    init();
});