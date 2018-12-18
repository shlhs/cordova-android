function formatEnergyTree(category, labelName, allEnergyItems) {
    var depthItems = {};    // 按层次存放项目
    var maxDepth = 0;
    allEnergyItems.forEach(function (item) {
        if (item.category === category && item.labelName === labelName && item.path.length > 1) {
            if (depthItems[item.depth]) {
                depthItems[item.depth].push(item);
            } else {
                depthItems[item.depth] = [item];
            }
            if (maxDepth < item.depth) {
                maxDepth = item.depth;
            }
        }
    });

    // 按层次组成树
    if (maxDepth === 0) {
        return [];
    }
    var treeObj = [];
    // 先读取第一层
    depthItems[1].forEach(function (item) {
        if (!item.isLeaf) {
            item.children = [];
        }
        treeObj.push(item);
    });
    function _findAndInsert(itemList, toInsertItem) {
        for (var i=0; i<itemList.length; i++) {
            if (itemList[i].path === toInsertItem.parentPath) {
                if (!toInsertItem.isLeaf) {
                    toInsertItem.children = [];
                    tmpParentItems.push(toInsertItem);
                }
                itemList[i].children.push(toInsertItem);
            }
        }
    }
    var tmpParentItems = treeObj;
    for (var depth=2; depth<=maxDepth; depth++) {
        var itemList = tmpParentItems;
        tmpParentItems = [];
        depthItems[depth].forEach(function (item) {
            _findAndInsert(itemList, item);
        });
    }

    return treeObj;
}

app.directive('energyConfigTree',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/energy/tree-view.html',
        scope: {
            category: '=',
            labelName: '=',
            datas: '=',
            onSelect: '='
        },
        replace: true,
        controller:['$scope', '$attrs', function($scope, $attrs){
            $scope.active = false;
            var tmpChecked = {};        // 本次操作中被选中或被取消的选项
            $scope.toggle = function () {
                $scope.active = !$scope.active;
                if ($scope.active) {
                    // 每次显示时默认展开所有
                    expandAll($scope.datas);
                }
                else {
                    // 当收起时，将当前已选通过回调回传
                    $scope.onOk();
                }
                tmpChecked = {};
            };

            function expandAll(datas) {
                if (!datas) {
                    return;
                }
                datas.forEach(function (item) {
                    if (!item.isLeaf) {
                        item.$$isExpend = true;
                        expandAll(item.children);
                    }
                })
            }
            expandAll($scope.datas);

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
                return item.isLeaf;
            };
            $scope.warpCallback = function(item, $event){
                item.$$isExpend = !item.$$isExpend;
            };

            $scope.onCheckItem = function ($event, item) {
                $event.stopPropagation();
                item.checked = !item.checked;
                if (tmpChecked[item.path] !== undefined) {
                    // 如果上一次记录过，则本次删除
                    delete tmpChecked[item.path];
                } else {
                    tmpChecked[item.path] = item.checked;
                }
            };

            $scope.onOk = function () {
                var checkedList = [];

                function _getChecked(item) {

                    if (item.checked) {
                        checkedList.push(item);
                    }
                    if (item.children) {
                        item.children.forEach(function (t) {
                            _getChecked(t);
                        });
                    }
                }
                $scope.datas.forEach(function (item) {
                    _getChecked(item);
                });
                $scope.onSelect && $scope.onSelect(checkedList);
            };

            $scope.onCancel = function () {
                function _restore(items) {
                    items.forEach(function (item) {
                        if (tmpChecked[item.path] !== undefined) {
                            item.checked = !tmpChecked[item.path];
                            delete tmpChecked[item.path];
                        }
                        if (item.children) {
                            _restore(item.children);
                        }
                    });
                }
                // 取消，需要将本次勾选或取消的恢复
                _restore($scope.datas);
                tmpChecked = {};
                $scope.active = false;
            }
        }],
        link: function (scope, element, attrs) {
            console.log(element);
            scope.domEle = element;
        }
    };
}]);

app.directive('energyTable', [function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/energy/meter-reading-table.html',
        replace: true,
        scope: {
            tableHeader: '=',
            tableBodyData: '='
        }
    };
}]);

app.controller('EnergyMeterReadingCtrl', function ($scope, ajax, $compile, platformService) {
    var stationSn = GetQueryString("sn");
    $scope.categories = [];
    $scope.labelNames = [];
    $scope.currentCategory = null;
    $scope.currentLabel = null;
    $scope.energyItems = [];
    $scope.treeDatas = [];
    $scope.endDate = moment().set('minute', 0).set('second', 0).set('millisecond', 0).format('YYYY-MM-DD HH:mm:ss.000');
    $scope.startDate = moment().set('minute', 0).set('second', 0).set('millisecond', 0).subtract('d', 1).format('YYYY-MM-DD HH:mm:ss.000');
    $scope.tableHeader = [];
    $scope.tableBodyData = [];
    $scope.isLoading = false;
    var variableUnits = {};     // 变量sn与单位的对应关系
    var allEnergyItems = [];
    var selectedItems = [];


    function getConfig(stationSn) {
        $scope.isLoading = true;
        ajax.get({
            url: '/energy/' + stationSn + '/config',
            success: function (response) {
                $scope.isLoading = false;
                $scope.categories = [];
                $scope.labelNames = [];
                response.categories.forEach(function (name) {
                    if (name === response.category) {
                        $scope.currentCategory = {id: name, name: name};
                    }
                    $scope.categories.push({id: name, name: name})
                });
                response.labelNames.forEach(function (name) {
                   $scope.labelNames.push({id: name, name: name});
                   if (name === response.labelName) {
                       $scope.currentLabel = {id: name, name: name};
                   }
                });
                allEnergyItems = response.energyItems;
                $scope.energyItems = formatEnergyTree(response.category, response.labelName, allEnergyItems);
                checkAll($scope.energyItems);
                getVariableUnits(response.energyItems);
                $scope.$apply();
                if ($scope.categories.length) {
                    var html = "<ul class='selector-group' style='border-bottom: #ececec 1px solid;'>" +
                        "<drop-down-menu options=\"categories\" on-select=\"onSelect\" model-name=\"'currentCategory'\" selected=\"currentCategory\"></drop-down-menu>" +
                        "<drop-down-menu options=\"labelNames\" on-select=\"onSelect\" model-name=\"'currentLabel'\" selected=\"currentLabel\"></drop-down-menu>" +
                        "<energy-config-tree category=\"currentCategory.name\" label-name=\"currentLabel.name\" datas=\"energyItems\" on-select=\"onSelectItems\"></energy-config-tree>" +
                        "</ul>";
                    var compileFn = $compile(html);
                    var $dom = compileFn($scope);
                    // 添加到文档中
                    $dom.prependTo($('.mui-content'));
                    refreshData();
                    initDatePicker();
                }
            },
            error: function () {
                $scope.isLoading = false;
                $.notify.error('获取配置信息失败');
            }
        });
    }

    function getVariableUnits(items) {
        // 获取所有变量的单位
        var sns = [];
        items.forEach(function (item) {
            item.deviceVarSns.forEach(function (sn) {
                sns.push(sn);
            });
        });
        if (!sns.length) {
            return;
        }
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/variables',
            data: {
                sns: sns.join(',')
            },
            async: false,
            success: function (response) {
                if (response.data && response.data.length) {
                    response.data.forEach(function (item) {
                        if (item.unit) {
                            variableUnits[item.sn] = item.unit;
                        }
                    });
                    // 如果抄表数据已请求完成，那么需要更新数据的单位信息

                }
            }
        })
    }

    function initDatePicker() {

        document.getElementById('startDatePicker').addEventListener('tap', function() {
            var _self = $scope;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    $scope.startDate = rs.text + ':00.000';
                    refreshData();
                    $scope.$apply();
                });
            } else {
                var options = {type: 'datetime'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    $scope.startDate = rs.text + ':00.000';
                    refreshData();
                    $scope.$apply();
                });
            }
        }, false);
        document.getElementById('endDatePicker').addEventListener('tap', function() {
            var _self = $scope;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    $scope.endDate = rs.text + ':00.000';
                    refreshData();
                    $scope.$apply();
                });
            } else {
                var options = {type: 'datetime'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    $scope.endDate = rs.text + ':00.000';
                    refreshData();
                    $scope.$apply();
                });
            }
        }, false);
    }

    $scope.onSelect = function (key, id, name) {
        $scope[key] = {id: id, name: name};
        $scope.energyItems = formatEnergyTree($scope.currentCategory.name, $scope.currentLabel.name, allEnergyItems);
        // 切换时默认会选中所有
        selectedItems = [];
        checkAll($scope.energyItems);
        refreshData();
    };

    function checkAll(datas) {
        datas.forEach(function (item) {
            item.checked = true;
            selectedItems.push(item);
            if (item.children) {
                checkAll(item.children);
            }
        });
    }

    $scope.onSelectItems = function (items) {
        if (JSON.stringify(selectedItems) !== JSON.stringify(items)) {
            selectedItems = items;
            refreshData();
        }
    };

    function refreshData() {
        var sns = [];
        selectedItems.forEach(function (item) {
            item.deviceVarSns.forEach(function (sn) {
                sns.push(sn);
            });
        });
        if (!$scope.currentLabel) {
            return;
        }
        $scope.tableHeader = [$scope.currentLabel.name+'名称', $scope.startDate.substring(0, 16), $scope.endDate.substring(0, 16), '差值', '单位'];
        $scope.tableBodyData = [];
        if (!sns.length) {
            return;
        }
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/sometime',
            data: {
                sns: sns.join(','),
                querytimes: [$scope.startDate, $scope.endDate].join(',')
            },
            success: function (response) {
                response.forEach(function (item) {
                    item.values = JSON.parse(item.values);
                });
                selectedItems.forEach(function (item) {
                    var rowData = [item.aliasName, '-', '-', '-', '-'];
                    response.forEach(function (n) {
                        var value = null;
                        item.deviceVarSns.forEach(function (sn) {
                            if (n.values[sn] !== null && n.values[sn] !== undefined) {
                                if (value === null) {
                                    value = n.values[sn];
                                } else {
                                    value += n.values[sn];
                                }
                            }
                            if (variableUnits[sn]) {
                                rowData[4] = variableUnits[sn];
                            }
                        });
                        if (value !== null) {
                            if (n.time === $scope.startDate) {
                                rowData[1] = value.toFixed(3);
                            } else if (n.time === $scope.endDate) {
                                rowData[2] = value.toFixed(3);
                            }
                        }
                    });
                    if (rowData[1] !== '-' && rowData[2] !== '-') {
                        rowData[3] = (rowData[2] - rowData[1]).toFixed(3);
                    }
                    $scope.tableBodyData.push(rowData);
                });
                $scope.$apply();
            },
            error: function () {
                $.notify.error('获取数据失败');
            }
        });
    }

    // initDatePicker();
    getConfig(stationSn);
});

app.controller('EnergyReportCtrl', function ($scope, ajax, $compile, platformService) {
    var stationSn = GetQueryString("sn");
    $scope.categories = [];
    $scope.labelNames = [];
    $scope.currentCategory = null;
    $scope.currentLabel = null;
    $scope.energyItems = [];
    $scope.treeDatas = [];
    var currentDay = moment().format('YYYY-MM-DD 00:00:00.000');
    $scope.timeTypeList = [{
        id: 'DAY',
        name: '日报表'
    }, {
        id: 'MONTH',
        name: '月报表'
    }, {
        id: 'YEAR',
        name: '年报表'
    }];
    $scope.timeType = {id: 'DAY', name: '日报表'};
    $scope.tableHeader = [];
    $scope.tableBodyData = [];
    $scope.isLoading = false;
    var allEnergyItems = [];
    var selectedItems = [];


    function init() {
        refreshDateShowName();
        getConfig(stationSn);
    }

    function getConfig(stationSn) {
        $scope.isLoading = true;
        ajax.get({
            url: '/energy/' + stationSn + '/config',
            success: function (response) {
                $scope.isLoading = false;
                $scope.categories = [];
                $scope.labelNames = [];
                response.categories.forEach(function (name) {
                    if (name === response.category) {
                        $scope.currentCategory = {id: name, name: name};
                    }
                    $scope.categories.push({id: name, name: name})
                });
                response.labelNames.forEach(function (name) {
                    $scope.labelNames.push({id: name, name: name});
                    if (name === response.labelName) {
                        $scope.currentLabel = {id: name, name: name};
                    }
                });
                allEnergyItems = response.energyItems;
                $scope.energyItems = formatEnergyTree(response.category, response.labelName, allEnergyItems);
                checkAll($scope.energyItems);
                $scope.$apply();
                if ($scope.currentLabel) {
                    var html = "<ul class='selector-group' style='border-bottom: #ececec 1px solid;'>" +
                        "<drop-down-menu options=\"categories\" on-select=\"onSelect\" model-name=\"'currentCategory'\" selected=\"currentCategory\"></drop-down-menu>" +
                        "<drop-down-menu options=\"labelNames\" on-select=\"onSelect\" model-name=\"'currentLabel'\" selected=\"currentLabel\"></drop-down-menu>" +
                        "<energy-config-tree category=\"currentCategory.name\" label-name=\"currentLabel.name\" datas=\"energyItems\" on-select=\"onSelectItems\"></energy-config-tree>" +
                        "</ul>";
                    var compileFn = $compile(html);
                    var $dom = compileFn($scope);
                    // 添加到文档中
                    $dom.prependTo($('.mui-content'));
                    refreshData();
                    setTimeout(initDatePicker, 200);
                }
            },
            error: function () {
                $scope.isLoading = false;
                $.notify.error('获取配置信息失败');
            }
        });
    }

    function refreshDateShowName() {
        // 根据按日、按月、按年，显示当前时间的格式
        switch ($scope.timeType.id) {
            case 'DAY':
                $scope.dateName = currentDay.substring(0, 10);
                break;
            case 'MONTH':
                $scope.dateName = currentDay.substring(0, 7);
                break;
            case 'YEAR':
                $scope.dateName = currentDay.substring(0, 4);
        }
    }

    function initDatePicker() {

        document.getElementById('datePicker').addEventListener('tap', function() {
            var _self = $scope;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    currentDay = rs.text + ' 00:00:00.000';
                    refreshDateShowName();
                    refreshData();
                    // _self.picker.dispose();
                    // _self.picker = null;
                    $scope.$apply();
                });
            } else {
                var options = {type: 'date'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    currentDay = rs.text + ' 00:00:00.000';
                    refreshDateShowName();
                    refreshData();
                    // _self.picker.dispose();
                    // _self.picker = null;
                    $scope.$apply();
                });
            }
        }, false);
    }

    $scope.onSelect = function (key, id, name) {
        $scope[key] = {id: id, name: name};
        if (key === 'timeType') {
            refreshDateShowName();
        } else {
            $scope.energyItems = formatEnergyTree($scope.currentCategory.name, $scope.currentLabel.name, allEnergyItems);
            selectedItems = [];
            checkAll($scope.energyItems);
        }
        refreshData();
    };

    $scope.onSelectItems = function (items) {
        if (JSON.stringify(selectedItems) !== JSON.stringify(items)) {
            selectedItems = items;
            refreshData();
        }
    };

    function checkAll(datas) {
        datas.forEach(function (item) {
            item.checked = true;
            selectedItems.push(item);
            if (item.children) {
                checkAll(item.children);
            }
        });
    }

    function refreshData() {
        var sns = [];
        selectedItems.forEach(function (item) {
            item.deviceVarSns.forEach(function (sn) {
                sns.push(sn);
            });
        });
        var startTime = '';
        var endTime = '';
        var queryPeriod = '';
        if (!$scope.currentLabel) {
            $scope.tableHeader = [];
            $scope.tableBodyData = [];
            return;
        }
        $scope.tableHeader = [$scope.currentLabel.name+'名称'];
        switch ($scope.timeType.id) {
            case 'DAY':
                startTime = currentDay;
                endTime = startTime.substring(0, 10) + ' 23:59:59.000';
                queryPeriod = 'HOUR';
                for (var i=0; i<24; i++) {
                    $scope.tableHeader.push(i + '时');
                }
                break;
            case 'MONTH':
                startTime = currentDay.substring(0, 7) + '-01 00:00:00.000';
                endTime = moment(startTime).add(1, 'M').set('date', 1).subtract(1, 'd').format('YYYY-MM-DD 23:59:59.000');
                queryPeriod = 'DAY';
                var lastDate = parseInt(endTime.substring(8, 10));
                for (var i=1; i<=lastDate; i++) {
                    $scope.tableHeader.push(i + '日');
                }
                break;
            case 'YEAR':
                startTime = currentDay.substring(0, 4) + '-01-01 00:00:00.000';
                endTime = currentDay.substring(0, 4) + '-12-31 23:59:59.000';
                queryPeriod = 'MONTH';
                for (var i=1; i<=12; i++) {
                    $scope.tableHeader.push(i + '月');
                }
                break;
        }
        $scope.tableHeader.push('总计');
        $scope.tableBodyData = [];
        if (!sns.length) {
            $scope.isLoading = false;
            refreshTable();
            return;
        }
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/historytrend',
            data: {
                sns: sns.join(','),
                calcmethod: 'DIFF',
                startTime: startTime,
                endTime: endTime,
                queryPeriod: queryPeriod
            },
            success: function (data) {
                // 先对数据进行补空
                data.forEach(function (item) {
                    var result = fillTrendDataVacancy(startTime, endTime, queryPeriod, item.time_keys, item.datas, 'YYYY-MM-DD HH:mm:ss.000');
                    item.time_keys = result.time_keys;
                    item.datas = result.datas;
                });
                selectedItems.forEach(function (item) {
                    var rowData = [item.aliasName];
                    // 加入默认数据
                    for (var i=1; i<$scope.tableHeader.length-1; i++) {
                        rowData.push('-');
                    }
                    var total = 0;
                    var isNull = true;
                    item.deviceVarSns.forEach(function (sn) {
                        data.forEach(function (dataItem) {
                            if (dataItem.var.sn === sn) {
                                for (var j=0; j<dataItem.datas.length; j++) {
                                    if (dataItem.datas[j] !== null) {
                                        if (rowData[j+1] !== '-') {
                                            rowData[j+1] += dataItem.datas[j];
                                            isNull = false;
                                            total += dataItem.datas[j];
                                        } else {
                                            rowData[j+1] = dataItem.datas[j];
                                            isNull = false;
                                            total += dataItem.datas[j];
                                        }
                                    }
                                }
                            }
                        });
                    });
                    // 对数据进行小数点格式化
                    for (var j=1; j<rowData.length; j++) {
                        if (rowData[j] !== '-' && rowData[j]) {
                            rowData[j] = parseFloat(rowData[j].toFixed(3));
                        }
                    }
                    if (isNull) {
                        rowData.push('-');
                    } else {
                        rowData.push(parseFloat(total.toFixed(3)));
                    }
                    $scope.tableBodyData.push(rowData);
                });
                $scope.$apply();
                refreshTable();
            },
            error: function () {
                $.notify.error('获取数据失败');
                $scope.$apply();
            }
        })
    }

    function refreshTable() {
        var table = $("#energyReportTable").DataTable();
        if (table) {
            table.destroy(true);
            table = null;
            var html = "<energy-report-table table-header='tableHeader' table-body-data='tableBodyData'></energy-report-table>";
            var compileFn = $compile(html);
            var $dom = compileFn($scope);
            // 添加到文档中
            $dom.appendTo($('#tableParent'));
        }
    }

    init();
});

app.directive('energyReportTable', [function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/energy/energy-report-table-template.html',
        replace: true,
        scope: {
            tableHeader: '=',
            tableBodyData: '='
        },
        controller: ['$scope', '$attrs', function($scope, $attrs){
            console.log('finish');
        }]
    };
}]);

app.directive('energyReportTableRepeatFinish',function(){
    return {
        link: function(scope,element,attr){
            if(scope.$last == true){
                setTimeout(function () {
                    $.fn.dataTable.ext.errMode = 'none'; //不显示任何错误信息
                    var height = screen.height - 173;
                    var table = $('#energyReportTable').DataTable( {
                        searching: false,
                        ordering: false,
                        scrollY:        height + 'px',
                        scrollX:        true,
                        scrollCollapse: true,
                        paging:         false,
                        info: false,
                        fixedColumns: {
                            leftColumns: 1
                        }
                    } );
                    // scope.$parent.table = table;
                }, 100);
            }
        }
    }
});

app.controller('EnergyOverviewCtrl', function ($scope, ajax, platformService, $compile) {
    var stationSn = GetQueryString("sn");
    $scope.categories = [];
    $scope.labelNames = [];
    $scope.currentCategory = null;
    $scope.currentLabel = null;
    $scope.energyItems = [];
    $scope.currentItem = null;
    $scope.isLoading = false;
    var currentDay = moment().format('YYYY-MM-DD 00:00:00.000');
    $scope.timeTypeList = [{
        id: 'DAY',
        name: '按日'
    }, {
        id: 'MONTH',
        name: '按月'
    }, {
        id: 'YEAR',
        name: '按年'
    }];
    $scope.timeType = {id: 'DAY', name: '日报表'};
    var allEnergyItems = [];

    function init() {
        refreshDateShowName();
        initDatePicker();
        getConfig(stationSn);
    }

    function getConfig(stationSn) {
        $scope.isLoading = true;
        ajax.get({
            url: '/energy/' + stationSn + '/config',
            success: function (response) {
                $scope.isLoading = false;
                $scope.categories = [];
                $scope.labelNames = [];
                response.categories.forEach(function (name) {
                    if (name === response.category) {
                        $scope.currentCategory = {id: name, name: name};
                    }
                    $scope.categories.push({id: name, name: name})
                });
                response.labelNames.forEach(function (name) {
                    $scope.labelNames.push({id: name, name: name});
                    if (name === response.labelName) {
                        $scope.currentLabel = {id: name, name: name};
                    }
                });
                allEnergyItems = response.energyItems;
                if ($scope.currentLabel) {
                    getItemsForLabel();
                    var html = "<ul class='selector-group' style='border-bottom: #ececec 1px solid;'>" +
                        "<drop-down-menu options=\"categories\" on-select=\"onSelect\" model-name=\"'currentCategory'\" selected=\"currentCategory\"></drop-down-menu>" +
                        "<drop-down-menu options=\"labelNames\" on-select=\"onSelect\" model-name=\"'currentLabel'\" selected=\"currentLabel\"></drop-down-menu>" +
                        "<drop-down-menu options=\"energyItems\" on-select=\"onSelect\" model-name=\"'labelItem'\" selected=\"currentItem\" ng-if=\"currentLabel.name==='支路'\"></drop-down-menu>" +
                        "</ul>";
                    var compileFn = $compile(html);
                    var $dom = compileFn($scope);
                    // 添加到文档中
                    $dom.prependTo($('.mui-content'));
                    refreshData();
                }
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $.notify.error('获取配置信息失败');
            }
        });
    }
    
    function getItemsForLabel() {
        var items = [];
        var category = $scope.currentCategory.name, labelName = $scope.currentLabel.name;
        allEnergyItems.forEach(function (item) {
            if (item.category === category && item.labelName === labelName && item.path.length > 1 && !item.isVirtual) {
                if (labelName === '支路') {
                    if (item.level >= 1 && item.level <= 2){
                        items.push(item);
                    }
                } else if (item.level > 0){
                    items.push(item);
                }
            }
        });
        $scope.energyItems = [];
        items.forEach(function (item, i) {
            $scope.energyItems.push($.extend({}, item, {name: item.aliasName, id: i}));
        });
        $scope.currentItem = items.length ? items[0] : null;
    }

    function initDatePicker() {

        document.getElementById('datePicker').addEventListener('tap', function() {
            var _self = $scope;
            if(_self.picker) {
                _self.picker.show(function (rs) {
                    currentDay = rs.text + ' 00:00:00.000';
                    refreshDateShowName();
                    refreshData();
                    // _self.picker.dispose();
                    // _self.picker = null;
                    $scope.$apply();
                });
            } else {
                var options = {type: 'date'};
                _self.picker = new mui.DtPicker(options);
                _self.picker.show(function(rs) {
                    currentDay = rs.text + ' 00:00:00.000';
                    refreshDateShowName();
                    refreshData();
                    // _self.picker.dispose();
                    // _self.picker = null;
                    $scope.$apply();
                });
            }
        }, false);
    }

    function refreshDateShowName() {
        // 根据按日、按月、按年，显示当前时间的格式
        switch ($scope.timeType.id) {
            case 'DAY':
                $scope.dateName = currentDay.substring(0, 10);
                break;
            case 'MONTH':
                $scope.dateName = currentDay.substring(0, 7);
                break;
            case 'YEAR':
                $scope.dateName = currentDay.substring(0, 4);
        }
    }

    $scope.onSelect = function (key, id, name) {
        if (key === 'currentLabel') {
            if ($scope.currentLabel.name !== name) {
                if (name === '支路') {

                    var html = '';
                    var compileFn = $compile(html);
                    var $dom = compileFn($scope);
                    // 添加到文档中
                    $dom.prependTo($('.mui-content'));
                }
            }
        }
        $scope[key] = {id: id, name: name};
        if (key === 'timeType') {
            refreshDateShowName();
        } else if (key === 'labelItem') {
            $scope.currentItem = $scope.energyItems[id];
        } else {
            getItemsForLabel();
        }
        refreshData();
    };

    function refreshData() {
        if ($scope.currentLabel.name === '支路') {
            $scope.$broadcast('$zhiluRefresh');
        } else {
            $scope.$broadcast('$otherRefresh');
        }
    }


    init();
});

const ENERGY_LINE_COLORS = ['#41bed8','#fde664','#9283ea','#3cd3cb','#fe7979','#f9b344','#46be8a','#579fe4','#f37c54','#3995ea'];

app.controller('EnergyOverviewZhiluCtrl', function ($scope, ajax, platformService) {
    $scope.timeTypes = ['日', '月', '年'];
    $scope.timeType = '日';
    var currentItem = null;
    $scope.todayTotalDegree = 0;
    $scope.electricData = {};
    $scope.categoryName = null;
    $scope.labelName = null;
    $scope.hasConfig = false;

    $scope.$on('$zhiluRefresh', function (event) {
        currentItem = $scope.$parent.currentItem;
        $scope.labelName = $scope.$parent.currentLabel.name;
        if ($scope.categoryName !== $scope.$parent.currentCategory.name) {
            $scope.categoryName = $scope.$parent.currentCategory.name;
            getTotalEnergyDegree();
        }
        if (currentItem) {
            $scope.hasConfig = true;
            refreshData();
        } else {
            $scope.hasConfig = false;
        }
    });
    $scope.$on('$otherRefresh', function (event) {      // 显示非支路时，不显示
        $scope.hasConfig = false;
    });


    function getTotalEnergyDegree() {
        // 获取一级支路今日总用能
        var sns = [];
        $scope.$parent.energyItems.forEach(function (item) {
           if (item.level === 1) {
               item.deviceVarSns.forEach(function (sn) {
                   sns.push(sn);
               });
           }
        });
        fetchElectricDegree(sns, moment().format('YYYY-MM-DD 00:00:00.000'), moment().format('YYYY-MM-DD 23:59:59.000'), function (data) {
            $scope.todayTotalDegree = data;
            $scope.$apply();
        });
    }

    $scope.getItemRate = function() {        // 获取支路用能占比
        if (!$scope.todayTotalDegree || $scope.electricData.today === undefined) {
            return '-';
        } else {
            return ($scope.electricData.today/$scope.todayTotalDegree*100).toFixed(1) + '%';
        }
    };

    function refreshData() {
        createElectricStatistics(currentItem);
        createElectricTrendLine();
        createElectricBarTrend();
    }

    $scope.onSelectTimeType = function (type) {
        $scope.timeType = type;
        createElectricBarTrend();
    };

    function fetchElectricDegree(sns, startTime, endTime, callback) {
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/summarized',
            data: {
                sns: sns.join(','),
                startTime: startTime,
                endTime: endTime,
                calcmethod: 'MAX,MIN'
            },
            success: function (data) {
                var total = 0;
                // 将最大-最小=总电量
                data.forEach(function (item) {
                    if (item.max_value_data !== null && item.min_value_data !== null) {
                        total += (item.max_value_data - item.min_value_data);
                    }
                });
                callback(parseFloat(total.toFixed(2)));
            }
        });
    }

    function fetchElectricTrend(sns, startTime, endTime, queryPeriod, callback) {
        ajax.get({
            url:  platformService.getDeviceMgmtHost() + '/variables/data/historytrend',
            data: {
                sns: sns.join(','),
                startTime: startTime,
                endTime: endTime,
                calcmethod: 'DIFF',
                queryPeriod: queryPeriod
            },
            success: function (data) {
                var result = fillVacancyAndSumTrendData(startTime, endTime, queryPeriod, data, 'YYYY-MM-DD HH:mm:ss.000');
                callback(result);
            }
        });
    }

    function createElectricStatistics(item) {
        var formatStr = 'YYYY-MM-DD 00:00:00.000';
        var today = [moment().format(formatStr), moment().format('YYYY-MM-DD HH:mm:ss.000')];
        var yesterday = [moment().subtract(1, 'd').format(formatStr), moment().subtract(1, 'd').format('YYYY-MM-DD HH:mm:ss.000')];
        var thisMonth = [moment().format('YYYY-MM-01 00:00:00.000'), moment().format('YYYY-MM-DD HH:mm:ss.000')];
        var lastMonth = [moment().subtract(1, 'month').format('YYYY-MM-01 00:00:00.000'), moment().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss.000')];
        $scope.electricData = {};
        var sns = item.deviceVarSns;
        fetchElectricDegree(sns, today[0], today[1], function (data) {
            $scope.electricData['today'] = data;
            _calcDayRate();
        });
        fetchElectricDegree(sns, yesterday[0], yesterday[1], function (data) {
            $scope.electricData['yesterday'] = data;
            _calcDayRate();
        });
        fetchElectricDegree(sns, thisMonth[0], thisMonth[1], function (data) {
            $scope.electricData['month'] = data;
            _calcMonthRate();
        });
        fetchElectricDegree(sns, lastMonth[0], lastMonth[1], function (data) {
            $scope.electricData['lastMonth'] = data;
            _calcMonthRate();
        });

        function _calcDayRate() {
            var value1 = $scope.electricData['today'], value2 = $scope.electricData['yesterday'];
            if (value1 !== undefined && value2 !== undefined) {
                if (value2 === 0) {
                    $scope.electricData['dayRate'] = '-';
                } else {
                    var rate = (value1-value2)/value2 * 100;
                    $scope.electricData['dayRate'] = (Math.abs(rate)).toFixed(1);
                    $scope.electricData['dayTrend'] = rate > 0 ? 'up' : 'down';
                }
                $scope.$apply();
            }
        }

        function _calcMonthRate() {
            var value1 = $scope.electricData['month'], value2 = $scope.electricData['lastMonth'];
            if (value1 !== undefined && value2 !== undefined) {
                if (value2 === 0) {
                    $scope.electricData['monthRate'] = '-';
                } else {
                    var rate = (value1-value2)/value2 * 100;
                    $scope.electricData['monthRate'] = (Math.abs(rate)).toFixed(1);
                    $scope.electricData['monthTrend'] = rate > 0 ? 'up' : 'down';
                }
                $scope.$apply();
            }
        }
    }
    
    function createElectricTrendLine() {
        var item = currentItem;
        var today = [moment().format('YYYY-MM-DD 00:00:00.000'), moment().format('YYYY-MM-DD 23:59:59.000')];
        var yesterday = [moment().subtract(1, 'd').format('YYYY-MM-DD 00:00:00.000'), moment().subtract(1, 'd').format('YYYY-MM-DD 23:59:59.000')];

        var sns = item.deviceVarSns;
        var data = {};
        fetchElectricTrend(sns, today[0], today[1], 'QUARTER', function (response) {
            data['today'] = response;
            _paint(data);
        });
        fetchElectricTrend(sns, yesterday[0], yesterday[1], 'QUARTER', function (response) {
            data['yesterday'] = response;
            _paint(data);
        });

        function _paint(data) {
            if (!data['today'] || !data['yesterday']) {
                return;
            }
            var todayData = data['today'].datas;
            var yesterdayData = data['yesterday'].datas;
            var timeKeys = data['today'].time_keys;
            _paintTrendLine(timeKeys, todayData, yesterdayData);
        }

        function _paintTrendLine(timeKeys, today, yesterday) {
            var times = [];
            var now = moment().format('YYYY-MM-DD HH:mm:ss.000');
            timeKeys.forEach(function (t) {
                // 时间不能超过当前时间
                if (t > now) {
                    return false;
                }
                times.push(t.substring(11, 16));
            });
            // 比实际少一个点
            times.splice(times.length-1, 1);
            // 根据times长度截取数据长度
            var todaySeriesData = [], yesterdaySeriesData=[];
            for (var i=0; i<times.length; i++) {
                todaySeriesData.push(today[i]);
                yesterdaySeriesData.push(yesterday[i]);
            }
            var config = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    }
                },
                legend: {
                    data: ['今日', '昨日'],
                    bottom: 5,
                    textStyle: {
                        fontSize: 9,
                        rich: {
                            fonSize: 9
                        }
                    }
                },
                grid: {
                    top: 20,
                    left: 10,
                    right: 20,
                    bottom: 35,
                    containLabel: true,
                },
                toolbox: {
                    feature: {
                        saveAsImage: false,
                    },
                },
                xAxis: {
                    type: 'category',
                    data: times,
                    boundaryGap: false,
                },
                yAxis: {
                    type: 'value',
                    name: 'kWh',
                    nameGap: '5'
                },
                color: ENERGY_LINE_COLORS,
                series: [
                    {
                        name: '今日',
                        type: 'line',
                        smooth: true,
                        data: todaySeriesData,
                        areaStyle:  {opacity: 0.25} ,
                    },
                    {
                        name: '昨日',
                        type: 'line',
                        smooth: true,
                        data: yesterdaySeriesData,
                    }
                ],
            };

            echarts.init(document.getElementById('zhilu_trend1')).setOption(config);
        }
    }

    function createElectricBarTrend() {
        var item = currentItem;
        var startTime, endTime, queryPeriod, startTime1, endTime1;
        var labels = [];
        switch ($scope.timeType) {
            case '日':
                startTime = moment().format('YYYY-MM-DD 00:00:00.000');
                endTime = moment().format("YYYY-MM-DD 23:59:59.000");
                startTime1 = moment().subtract(1, 'day').format('YYYY-MM-DD 00:00:00.000');
                endTime1 = moment().subtract(1, 'day').format("YYYY-MM-DD 23:59:59.000");
                queryPeriod = 'HOUR';
                labels = ['今日', '昨日'];
                break;
            case '月':
                startTime = moment().format('YYYY-MM-01 00:00:00.000');
                endTime = moment().add(1, 'month').set('day', 1).subtract(1, 'day').format("YYYY-MM-DD 23:59:59.000");
                startTime1 = moment().subtract(1, 'month').format('YYYY-MM-01 00:00:00.000');
                endTime1 = moment().set('day', 1).subtract(1, 'day').format("YYYY-MM-DD 23:59:59.000");
                queryPeriod = 'DAY';
                labels = ['本月', '上月'];
                break;
            case '年':
                startTime = moment().format('YYYY-01-01 00:00:00.000');
                endTime = moment().format("YYYY-12-31 23:59:59.000");
                startTime1 = moment().subtract(1, 'year').format('YYYY-01-01 00:00:00.000');
                endTime1 = moment().subtract(1, 'year').format("YYYY-12-31 23:59:59.000");
                queryPeriod = 'MONTH';
                labels = ['今年', '去年'];
                break;
        }
        var data = {};
        fetchElectricTrend(item.deviceVarSns, startTime, endTime, queryPeriod, function (response) {
            data['now'] = response;
            _paint(data);
        });
        fetchElectricTrend(item.deviceVarSns, startTime1, endTime1, queryPeriod, function (response) {
            data['history'] = response;
            _paint(data);
        });

        function _paint(data) {
            if (!data['now'] || !data['history']) {
                return;
            }
            var times = [];
            var currentMoment = moment().format('YYYY-MM-DD HH:mm:ss.000');
            data.now.time_keys.forEach(function (t) {
                if (t > currentMoment) {
                    return false;
                }
               switch ($scope.timeType) {
                   case '日':
                       times.push(parseInt(t.substring(11, 13)) + '时');
                       break;
                   case '月':
                       times.push(parseInt(t.substring(8, 10)) + '日');
                       break;
                   case '年':
                       times.push(parseInt(t.substring(5, 7) + '月'));
                       break;
               }
            });
            var nowData = [], historyData = [];
            for (var i=0; i<times.length; i++) {
                nowData.push(data.now.datas[i]);
                historyData.push(data.history.datas[i]);
            }
            var config = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow',
                    },
                },
                legend: {
                    data: labels,
                    bottom: 5,
                    textStyle: {
                        fontSize: 9,
                        rich: {
                            fonSize: 9
                        }
                    }
                },
                grid: {
                    top: 20,
                    left: 10,
                    right: 20,
                    bottom: 35,
                    containLabel: true,
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: [0, 0.01],
                    name: 'kWh',
                    nameLocation: 'start',
                    nameGap: '5',
                    data: times,
                },
                yAxis: {
                    type: 'value',
                    nameGap: '5',
                    nameLocation: 'start',
                    nameTextStyle: {
                        verticalAlign: 'top'
                    }
                },
                color: ENERGY_LINE_COLORS,
                series: [{
                    name: labels[0],
                    type:'bar',
                    barGap:0,
                    barMaxWidth: "40px",
                    data: nowData,
                }, {
                    name: labels[1],
                    type:'bar',
                    barGap:0,
                    barMaxWidth: "40px",
                    data: historyData,
                },
                ],
            };
            echarts.init(document.getElementById('zhilu_trend2')).setOption(config);
        }
    }
    
    
});

app.controller('EnergyOverviewOtherCtrl', function ($scope, ajax, platformService) {
    var timeType = null;
    var energyItems = null;
    var currentDate = null;
    $scope.categoryName = null;
    $scope.labelName = null;
    var timeFormat = 'YYYY-MM-DD HH:mm:ss.000';
    $scope.hasConfig = false;

    $scope.$on('$otherRefresh', function (event) {
        timeType = $scope.$parent.timeType.id;
        energyItems = $scope.$parent.energyItems;
        currentDate = $scope.$parent.dateName;
        $scope.categoryName = $scope.$parent.currentCategory.name;
        $scope.labelName = $scope.$parent.currentLabel.name;
        if (energyItems.length) {
            $scope.hasConfig = true;
            createElectricDegreesPie();
            createFiveAmplif();
            createFiveDegree();
            createLinkRelativeRadio();
            createDegreeTrend();
        } else {
            $scope.hasConfig = false;
        }
    });
    $scope.$on('$zhiluRefresh', function (event) {
        $scope.hasConfig = false;
    });
    function getStartAndEndTime() {      // 获取日/月/年的当前时间
        var now=moment().format(timeFormat), start, end;
        if (timeType === 'DAY') {
            start = currentDate + ' 00:00:00.000';
            end = currentDate + ' 23:59:59.000';
        } else if (timeType === 'MONTH') {
            start = currentDate + '-01 00:00:00.000';
            end = moment(currentDate, 'YYYY-MM').add(1, 'month').set('day', 1).subtract(1, 'day').format('YYYY-MM-DD 23:59:59.000');
        } else if (timeType === 'YEAR') {
            start = currentDate + '-01-01 00:00:00.000';
            end = currentDate + '-12-31 23:59:59.000';
        }
        if (end > now) {
            end = now;
        }
        return [start, end];
    }

    function getLinkRelativeStartAndEndTime() {     // 获取环比的时间
        var currentTimes = getStartAndEndTime();
        var startMoment = moment(currentTimes[0], timeFormat), endMoment = moment(currentTimes[1], timeFormat);
        return [startMoment.subtract(1, timeType.toLowerCase()).format(timeFormat), endMoment.subtract(1, timeType.toLowerCase()).format(timeFormat)];
    }

    function fetchElectricDegree(sns, startTime, endTime, callback) {
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/electricaldegreeandcharge',
            data: {
                sns: sns.join(','),
                startTime: startTime,
                endTime: endTime
            },
            success: function (data) {
                callback(data);
            }
        });
    }

    function fetchElectricTrend(sns, startTime, endTime, queryPeriod, callback) {
        ajax.get({
            url:  platformService.getDeviceMgmtHost() + '/variables/data/historytrend',
            data: {
                sns: sns.join(','),
                startTime: startTime,
                endTime: endTime,
                calcmethod: 'DIFF',
                queryPeriod: queryPeriod
            },
            success: function (data) {
                data.forEach(function (item) {
                    var result = fillTrendDataVacancy(startTime, endTime, queryPeriod, item.time_keys, item.datas, 'YYYY-MM-DD HH:mm:ss.000');
                    item.time_keys = result.time_keys;
                    item.datas = result.datas;
                });
                callback(data);
            }
        });
    }
    
    function createElectricDegreesPie() {
        // 只取level=1的项进行请求
        var sns = [], showItems = [];
        energyItems.forEach(function (item) {
            if (item.level === 1) {
                item.deviceVarSns.forEach(function (sn) {
                    if (sns.indexOf(sn) < 0) {
                        sns.push(sn);
                    }
                });
                showItems.push(item);
            }
        });
        var times = getStartAndEndTime();
        fetchElectricDegree(sns, times[0], times[1], function (data) {
            var total = 0;
            var varValue = {};
            data.forEach(function (item) {
                varValue[item.device_var_sn] = item.all_degree;
                total += item.all_degree;
            });
            // 按项统计
            var seriesList = [];
            showItems.forEach(function (item) {
                var total = 0;
                item.deviceVarSns.forEach(function (sn) {
                    if (varValue[sn]) {
                        total += varValue[sn];
                    }
                });
                seriesList.push({name: item.aliasName, value: total.toFixed(2)});
            });
            _paint(total.toFixed(2), seriesList);
        });
        function _paint(total, series) {
            var config = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{b} : {c} ({d}%)',
                },
                backgroundColor:'#ffffff',
                title: [
                    {
                        text: total + '\nkWh',
                        textStyle: {
                            fontFamily: 'Microsoft YaHei',
                            fontSize: 14,
                            color: '#666666',
                        },
                        x: 'center',
                        y: 'center',
                    },
                ],
                legend: {
                    bottom: 5,
                    left: 'center',
                    show: false
                },
                color: ENERGY_LINE_COLORS,
                series: [
                    {
                        avoidLabelOverlap: false,
                        hoverAnimation: true, //设置饼图默认的展开样式
                        radius: ['55%', '80%'],
                        name: 'pie',
                        type: 'pie',
                        selectedMode: 'single',
                        clockwise: true,
                        startAngle: 90,
                        data: series,
                        itemStyle: {
                            emphasis: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)',
                            },
                        },
                    },
                ],
            };
            echarts.init(document.getElementById('chart_pie1')).setOption(config);
        }
    }

    function getAllSnsOfItems() {
        var sns = [];
        energyItems.forEach(function (item) {
            item.deviceVarSns.forEach(function (sn) {
                if (sns.indexOf(sn) < 0) {
                    sns.push(sn);
                }
            });
        });
        return sns;
    }

    function _groupDegrees(data) {
        var varDegreeMap = {};
        data.forEach(function (item) {
            varDegreeMap[item.device_var_sn] = item.all_degree;
        });
        var itemDegreeMap = [];
        energyItems.forEach(function (item) {
            var total = 0;
            item.deviceVarSns.forEach(function (sn) {
                if (varDegreeMap[sn]) {
                    total += varDegreeMap[sn];
                }
            });
            itemDegreeMap[item.path] = total.toFixed(2);
        });
        return itemDegreeMap;
    }
    
    function createFiveAmplif() {       // 增幅前五名
        // 请求所有项的数据，然后分析出前5名
        var sns = getAllSnsOfItems();
        var currentDegreeMap = null, historyDegreeMap = null;
        var times = getStartAndEndTime(), lastTimes=getLinkRelativeStartAndEndTime();
        fetchElectricDegree(sns, times[0], times[1], function (data) {
            currentDegreeMap = _groupDegrees(data);
            _paint();
        });
        fetchElectricDegree(sns, lastTimes[0], lastTimes[1], function (data) {
            historyDegreeMap = _groupDegrees(data);
            _paint();
        });

        function _paint() {
            if (!currentDegreeMap || !historyDegreeMap) {
                return;
            }
            var values = [];
            energyItems.forEach(function (item) {
                // 计算增幅
                var nowValue = currentDegreeMap[item.path];
                var historyValue = historyDegreeMap[item.path];
                var value = null;
                if (nowValue !== null && historyValue !== undefined && historyValue !== undefined && historyValue !== null) {
                    value = parseFloat(nowValue/historyValue*100-100).toFixed(2);
                }
                values.push({name: item.aliasName, value: value});
            });
            values.sort(function (v1, v2) {
                return v2.value - v1.value;
            });
            // 取前5名
            var seriesData = [], labels=[];
            values.forEach(function (item, i) {
                if (i < 5) {
                    seriesData.push(item.value);
                    labels.push(item.name);
                }
            });
            var config = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow',
                    },
                },
                legend: {
                    show: false,
                    data: [],
                    bottom: 0,
                },
                grid: {
                    top: 5,
                    left: 20,
                    right: 30,
                    bottom: 0,
                    containLabel: true,
                },
                xAxis: {
                    type: 'value',
                    boundaryGap: [0, 0.01],
                    name: '%' || '',
                    nameGap: '5',
                    position: 'top',
                    splitLine: {lineStyle:{type:'dashed'}},
                    axisLabel: {
                        formatter: '{value}%'
                    }
                },
                yAxis: {
                    type: 'category',
                    data: labels,
                    inverse: true,
                },
                color: ENERGY_LINE_COLORS,
                series: [{
                    type:'bar',
                    barGap:0,
                    barMaxWidth: "40px",
                    label: {
                        normal: {
                            formatter: '{c}%',
                            show: true,
                            position: 'inside'
                        }
                    },
                    data: seriesData,
                }],
            };
            echarts.init(document.getElementById('chart_bar1')).setOption(config);
        }
    }
    
    function createFiveDegree() {       // 用能前五名

        var sns = getAllSnsOfItems();
        var currentDegreeMap = null, historyDegreeMap = null;
        var times = getStartAndEndTime();
        fetchElectricDegree(sns, times[0], times[1], function (data) {
            currentDegreeMap = _groupDegrees(data);
            _paint();
        });
        function _paint() {
            var values = [];
            energyItems.forEach(function (item) {
                values.push({name: item.aliasName, value: currentDegreeMap[item.path]});
            });
            values.sort(function (v1, v2) {
                return v2.value - v1.value;
            });
            // 取前5名
            var seriesData = [], labels=[];
            values.forEach(function (item, i) {
                if (i < 5) {
                    seriesData.push(item.value);
                    labels.push(item.name);
                }
            });
            var config = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    }
                },
                legend: {
                    data: [],
                    bottom: 5,
                },
                grid: {
                    top: 20,
                    left: 20,
                    right: 30,
                    bottom: 0,
                    containLabel: true,
                },
                xAxis: {
                    type: 'category',
                    data: labels,
                },
                yAxis: {
                    type: 'value',
                    boundaryGap: [0, 0.01],
                    name: 'kWh',
                    nameGap: '5',
                },
                color: ENERGY_LINE_COLORS,
                series: {
                    type:'bar',
                    barMaxWidth: "30px",
                    data: seriesData
                },
            };
            echarts.init(document.getElementById('chart_bar2')).setOption(config);
        }
    }

    function createLinkRelativeRadio() {    // 用能环比，只显示level=1的

        var sns = [], showItems = [];
        energyItems.forEach(function (item) {
            if (item.level === 1) {
                item.deviceVarSns.forEach(function (sn) {
                    if (sns.indexOf(sn) < 0) {
                        sns.push(sn);
                    }
                });
                showItems.push(item);
            }
        });

        var currentDegreeMap = null, historyDegreeMap = null;
        var times = getStartAndEndTime(), lastTimes=getLinkRelativeStartAndEndTime();
        fetchElectricDegree(sns, times[0], times[1], function (data) {
            currentDegreeMap = _groupDegrees(data);
            _paint();
        });
        fetchElectricDegree(sns, lastTimes[0], lastTimes[1], function (data) {
            historyDegreeMap = _groupDegrees(data);
            _paint();
        });

        function _paint() {
            if (!currentDegreeMap || !historyDegreeMap) {
                return;
            }
            var labels = [], currentValues=[], historyValues=[];
            showItems.forEach(function (item) {
                // 计算增幅
                labels.push(item.aliasName);
                currentValues.push(currentDegreeMap[item.path]);
                historyValues.push(historyDegreeMap[item.path]);
            });
            var config = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow',
                    },
                },
                legend: {
                    data: ['本期', '上期'],
                    top: 2,
                    right: 20,
                    x: 'right'
                },
                grid: {
                    top: 30,
                    left: 20,
                    right: 30,
                    bottom: 5,
                    containLabel: true,
                },
                xAxis: {
                    type: 'value',
                    boundaryGap: [0, 0.01],
                    name: 'kWh',
                    nameLocation: 'start',
                    nameGap: '5',
                },
                yAxis: {
                    type: 'category',
                    data: labels,
                },
                color: ENERGY_LINE_COLORS,
                series: [{
                    name: '本期',
                    type:'bar',
                    barGap:0,
                    barMaxWidth: "40px",
                    data: currentValues,
                }, {
                    name: '上期',
                    type:'bar',
                    barGap:0,
                    barMaxWidth: "40px",
                    data: historyValues,
                }],
            };
            echarts.init(document.getElementById('chart_bar3')).setOption(config);
        }
    }

    function _sumMultiTrendDatas(dataList) {    // 将多个趋势的值进行求和
        if (!dataList.length) {
            return [];
        }
        var values = [];
        var len = dataList[0].length;
        for(var i=0; i<len; i++) {
            var total = null;
            dataList.forEach(function (datas) {
                if (total === null && datas[i] !== null) {
                    total = datas[i];
                } else if (total !== null && datas[i] !== null) {
                    total += datas[i];
                }
            });
            if (total === null) {
                values.push(total);
            } else {
                values.push(parseFloat(total.toFixed(2)));
            }
        }
        return values;
    }

    var chart5 = null;
    function createDegreeTrend() {      // 用能趋势
        var sns = [], showItems = [];
        energyItems.forEach(function (item) {
            if (item.level === 1) {
                item.deviceVarSns.forEach(function (sn) {
                    if (sns.indexOf(sn) < 0) {
                        sns.push(sn);
                    }
                });
                showItems.push(item);
            }
        });
        var queryPeriod='', startTime, endTime;
        switch (timeType) {
            case 'DAY':
                startTime = currentDate + ' 00:00:00.000';
                endTime = currentDate + ' 23:59:59.000';
                queryPeriod = 'HOUR';
                break;
            case 'MONTH':
                startTime = currentDate + '-01 00:00:00.000';
                endTime = moment(currentDate, 'YYYY-MM').add(1, 'month').set('day', 1).subtract(1, 'day').format('YYYY-MM-DD 23:59:59.000');
                queryPeriod = 'DAY';
                break;
            case 'YEAR':
                startTime = currentDate + '-01-01 00:00:00.000';
                endTime = currentDate + '-12-31 23:59:59.000';
                queryPeriod = 'MONTH';
                break;
        }
        var timeKeys = createTimeList(startTime, endTime, queryPeriod, 'YYYY-MM-DD HH:mm:ss.000');
        var times = [];
        timeKeys.forEach(function (t) {
            switch (timeType) {
                case 'DAY':
                    times.push(parseInt(t.substring(11, 13)) + '时');
                    break;
                case 'MONTH':
                    times.push(parseInt(t.substring(8, 10) + '日'));
                    break;
                case 'YEAR':
                    times.push(parseInt(t.substring(5, 7)) + '月');
                    break;
            }
        });
        fetchElectricTrend(sns, startTime, endTime, queryPeriod, function (datas) {
            _paint(times, datas);
        });

        function _paint(times, datas) {
            var seriesData = [], labels=[];
            showItems.forEach(function (item) {
                var dataList = [];
                item.deviceVarSns.forEach(function (sn) {
                    datas.forEach(function (data) {
                        if (data.var.sn === sn) {
                            dataList.push(data.datas);
                            return false;
                        }
                    })
                });
                var sumedDatas = _sumMultiTrendDatas(dataList);
                seriesData.push({
                    name: item.aliasName,
                    type: 'bar',
                    stack: '总量',
                    barMaxWidth: "40px",
                    data: sumedDatas
                });
                labels.push(item.aliasName);
            });
            if (!seriesData.length) {
                seriesData.push({
                    name: '',
                    type: 'bar',
                    stack: '总量',
                    data: []
                });
            }
            var config = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow',
                    },
                },
                legend: {
                    data: labels,
                    bottom: 0,
                    textStyle: {
                        fontSize: 9,
                        rich: {
                            fonSize: 9
                        }
                    }
                },
                grid: {
                    top: 20,
                    left: 20,
                    right: 10,
                    bottom: 30,
                    containLabel: true,
                },
                toolbox: {
                    feature: {
                        saveAsImage: false,
                    },
                },
                xAxis: {
                    type: 'category',
                    data: times,
                },
                yAxis: {
                    type: 'value',
                    name: 'kWh',
                    nameGap: '5'
                },
                color: ENERGY_LINE_COLORS,
                series: seriesData,
            };
            if (chart5) {
                chart5.dispose();
            }
            chart5 = echarts.init(document.getElementById('chart_bar4'));
            chart5.setOption(config);
        }
    }
});