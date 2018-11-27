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
                if ($scope.categories.length) {
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
                                rowData[1] = value;
                            } else if (n.time === $scope.endDate) {
                                rowData[2] = value;
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
        initDatePicker();
        getConfig(stationSn);
    }

    function getConfig(stationSn) {
        $scope.isLoading = true;
        ajax.get({
            url: '/energy/' + stationSn + '/config',
            success: function (response) {
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
        var startTime = '';
        var endTime = '';
        var queryPeriod = '';
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
        $scope.isLoading = true;
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
                $scope.isLoading = false;
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
                $scope.isLoading = false;
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