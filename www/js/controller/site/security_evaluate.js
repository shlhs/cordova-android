

app.controller('SecurityBaseCtrl', ['$scope', '$compile', function ($scope, $compile) {
   function load() {
       var templateUrl = GetQueryString("template");
       var html = "<root-page template=" + templateUrl + "></root-page>";
       var compileFn = $compile(html);
       var $dom = compileFn($scope);
       // 添加到文档中
       $dom.appendTo($('body'));
   }
   load();
}]);

app.service('SecurityReportService', ['userService', 'ajax', '$myTranslate', function (userService, ajax, $myTranslate) {
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
            if (t.name === $myTranslate.instant('ops.security.level.urgent')) {
                emergency += 1;
            } else if (t.name === $myTranslate.instant('ops.security.level.serious')) {
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
                    $.notify.info($myTranslate.instant('save successful'));
                    successCallback && successCallback(data);
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error($myTranslate.instant('save failed'));
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
                    $.notify.info($myTranslate.instant('save successful'));

                    // 调用Android接口
                    window.android && window.android.onJsCallbackForPrevPage('setTaskReportId', data.id);
                    successCallback && successCallback(data);
                },
                error: function (xhr, status, error) {
                    $.notify.progressStop();
                    $.notify.error($myTranslate.instant('save failed'));
                }
            });
        }
    };
}]);

app.controller('SecurityHistoryCtrl', ['$scope', '$stateParams', 'routerService', 'ajax', function ($scope, $stateParams, routerService, ajax) {
    var sn = $stateParams.sn; // GetQueryString('sn');
    $scope.stationName = $stateParams.name; // GetQueryString("name");
    $scope.history = [];
    $scope.isLoading = false;
    $scope.loadingFailed = false;
    $scope.isEnglish = gIsEnglish;

    $scope.createOneRecord = function () {
        $scope.openPage('/templates/evaluate/security-evaluate-first-classify.html', {isCreate: true, stationSn: sn,
            stationName: $scope.stationName});
    };

    $scope.openPage = function(template, params, config){
        routerService.openPage($scope, template, params, config);
    };

    $scope.getDataList = function() {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
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
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        })
    };

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

    $scope.getDataList();
}]);

app.controller('SecurityEvaluateHome', ['$scope', '$stateParams', '$http', 'ajax', 'routerService', 'SecurityReportService', function ($scope, $stateParams, $http, ajax, routerService, SecurityReportService) {
    var backupData = {};        // 保存原始数据
    $scope.evaluateData = {};
    $scope.total = 0;
    $scope.unqualifiedList = [];
    $scope.unqualified = {};
    $scope.status = 'disabled';
    $scope.editable = false;

    // 画进度
    function drawProgress(progress) {
        var color = $scope.evaluateData.status === 'success' ? ['#0FD781', '#06CFAD'] : ['#fc6076', '#ff9a44'];
        if (!progress) {
            color = ['#ccc', '#ccc'];
        }
        var option = {
            title: [{
                text: '已完成',
                x: 'center',
                top: '25%',
                textStyle: {
                    color: color[0],
                    fontSize: 12,
                }
            }, {
                text: progress + '%',
                x: 'center',
                top: '36%',
                textStyle: {
                    fontSize: 18,
                    color: color[0],
                },
            }],
            polar: {
                radius: ['80%', '90%'],
                center: ['50%', '50%'],
            },
            angleAxis: {
                max: 100,
                show: false,
            },
            radiusAxis: {
                type: 'category',
                show: true,
                axisLabel: {
                    show: false,
                },
                axisLine: {
                    show: false,

                },
                axisTick: {
                    show: false
                },
            },
            series: [
                {
                    name: '',
                    type: 'bar',
                    roundCap: true,
                    barWidth: 6,
                    showBackground: true,
                    backgroundStyle: {
                        // color: 'rgba(66, 66, 66, .3)',
                    },
                    data: [progress],
                    coordinateSystem: 'polar',

                    itemStyle: {
                        normal: {
                            color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [{
                                offset: 0,
                                color: color[0]
                            }, {
                                offset: 1,
                                color: color[1]
                            }]),
                        }
                    }

                },
            ]
        };
        echarts.init(document.getElementById('evaluateChart')).setOption(option);
    }

    function getEvaluateData() {        // 获取评估数据
        var apiHost = GetQueryString("apiHost") || "";
        ajax.get({
            url: apiHost+'/security_reports/' + $stateParams.id,
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
    $scope.openDetail = function(){
        routerService.openPage($scope, '/templates/evaluate/security-evaluate-first-classify.html', null, {
            onClose: function () {
                $scope.refresh();
            }
        });
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
}]);

app.controller('SecurityEvaluateDetailCtrl', ['$scope', '$http', 'ajax', 'userService', 'routerService', 'SecurityReportService',
function ($scope, $http, ajax, userService, routerService, SecurityReportService) {
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
        // if ($scope.$parent.refresh) {
        //     $scope.$parent.refresh();
        // }
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
        var templateName = GetQueryString("name") || "", apiHost=GetQueryString("apiHost") || "";
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
}]);

app.controller('SecurityEvaluateChecklistCtrl', ['$scope', function ($scope) {
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
}]);