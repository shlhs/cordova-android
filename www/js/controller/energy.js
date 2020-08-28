function formatEnergyItems(category, labelName, energyItems) { // 对能源配置项数据进行处理：补充path，aliasName
    if (!energyItems) {
        return;
    }
    // 先组成树，补充path、aliasName，然后再将树的节点变成list
    var tree = formatEnergyTree(category, labelName, energyItems);
    var items = [];

    // 如果节点是is_virtual，则设置deviceVarSns为子节点的并集
    function _getChildren(parent) {
        if (parent) {
            var children = parent.children;
            parent.children = null;
            items.push(parent);
            if (children) {
                children.forEach(function (c) {
                    _getChildren(c);
                });
            }
        }
    }
    tree.forEach(function (item) {
        _getChildren(item);
    });
    return items;
}

function formatEnergyTree(category, labelName, allEnergyItems) { //
    var depthItems = {};    // 按层次存放项目
    var maxDepth = 0;
    allEnergyItems.forEach(function (item) {
        item.path = item.parentPath === '/' ? ('/' + item.name) : (item.parentPath + '/' + item.name);
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
        item.aliasName = item.name;
        treeObj.push(item);
    });
    var firstDepthNum = treeObj.length;
    function _findAndInsert(itemList, toInsertItem) {
        for (var i=0; i<itemList.length; i++) {
            var parent = itemList[i];
            if (parent.path === toInsertItem.parentPath) {
                if (!toInsertItem.isLeaf) {
                    toInsertItem.children = [];
                    tmpParentItems.push(toInsertItem);
                }
                // 创建aliasName
                if (parent.depth === 1 && firstDepthNum === 1) { // 如果一级目录只有一个节点，那么二级目录不需要增加父级节点名称
                    toInsertItem.aliasName = toInsertItem.name;
                } else {
                    toInsertItem.aliasName = parent.name + '/' + toInsertItem.name;
                }
                parent.children.push(toInsertItem);
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

    var treeData = JSON.parse(JSON.stringify(treeObj));
    // 如果是虚拟节点的，设置虚拟节点的deviceVarSns为子节点的deviceVarSns的并集，并设置isVirtual=false
    function _setDeviceVarSns(parent) {
        if (parent) {
            var children = parent.children;
            if (children) {
                children.forEach(function (c) {
                    _setDeviceVarSns(c);
                });
            }
            if (parent.isVirtual) {
                var deviceVars = [];
                children.forEach(function (child) {
                    child.deviceVarSns.forEach(function (sn) {
                        if (deviceVars.indexOf(sn) < 0) {
                            deviceVars.push(sn);
                        }
                    });
                });
                parent.deviceVarSns = deviceVars;
                parent.isVirtual = false;
            }
        }
    }
    treeData.forEach(function (item) {
        _setDeviceVarSns(item);
    });
    return treeData;
}

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

app.service('energyFormatService', ['$myTranslate', function ($myTranslate) {
    this.internationalised = function (config) { // 将配置国际化
        if (!config || !config.categories || !config.categories.length) {
            return config;
        }
        var result = {};
        var categories = [];
        var categoryCostName = {};
        config.categories.forEach(function (name, i) {
            var tmpName = $myTranslate.instant(name);
            categories.push(tmpName);
            if (name === '光伏' || name === '太阳能' || name.indexOf('电') === 1) {
                categoryCostName[tmpName] = $myTranslate.instant('发电');
            } else if (name === '燃气' || name === '天然气') {
                categoryCostName[tmpName] = $myTranslate.instant('用气');
            } else {
                categoryCostName[tmpName] = $myTranslate.instant('用' + name);
            }
        });
        result.categories = categories;
        result.categoryCostName = categoryCostName;
        result.category = $myTranslate.instant(config.category);
        var labelNames = [];
        config.labelNames.forEach(function (name, i) {
            labelNames.push($myTranslate.instant(name));
        });
        result.labelNames = labelNames;
        result.labelName = $myTranslate.instant(config.labelName);
        var labelNamesMap = {};
        Object.keys(config.labelNamesMap).forEach(function (key) {
            var names = [];
            config.labelNamesMap[key].forEach(function (name) {
                names.push($myTranslate.instant(name));
            });
            labelNamesMap[$myTranslate.instant(key)] = names;
        });
        result.labelNamesMap = labelNamesMap;
        var energyItems = [];
        config.energyItems.forEach(function (item, i) {
            var tmpItem = Object.assign({}, item, {
                category: $myTranslate.instant(item.category),
                labelName: $myTranslate.instant(item.labelName)
            });
            energyItems.push(tmpItem);
        });
        result.energyItems = energyItems;
        return result;
    };

    this.formatEnergyItems = function(category, labelName, energyItems) { // 对能源配置项数据进行处理：补充path，aliasName
        if (!energyItems) {
            return;
        }
        // 先组成树，补充path、aliasName，然后再将树的节点变成list
        var tree = formatEnergyTree(category, labelName, energyItems);
        var items = [];

        // 如果节点是is_virtual，则设置deviceVarSns为子节点的并集
        function _getChildren(parent) {
            if (parent) {
                var children = parent.children;
                parent.children = null;
                items.push(parent);
                if (children) {
                    children.forEach(function (c) {
                        _getChildren(c);
                    });
                }
            }
        }
        tree.forEach(function (item) {
            _getChildren(item);
        });
        return items;
    };

    this.formatEnergyTree = function(category, labelName, allEnergyItems) { //
        var depthItems = {};    // 按层次存放项目
        var maxDepth = 0;
        allEnergyItems.forEach(function (item) {
            item.path = item.parentPath === '/' ? ('/' + item.name) : (item.parentPath + '/' + item.name);
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
            item.aliasName = item.name;
            treeObj.push(item);
        });
        var firstDepthNum = treeObj.length;
        function _findAndInsert(itemList, toInsertItem) {
            for (var i=0; i<itemList.length; i++) {
                var parent = itemList[i];
                if (parent.path === toInsertItem.parentPath) {
                    if (!toInsertItem.isLeaf) {
                        toInsertItem.children = [];
                        tmpParentItems.push(toInsertItem);
                    }
                    // 创建aliasName
                    if (parent.depth === 1 && firstDepthNum === 1) { // 如果一级目录只有一个节点，那么二级目录不需要增加父级节点名称
                        toInsertItem.aliasName = toInsertItem.name;
                    } else {
                        toInsertItem.aliasName = parent.name + '/' + toInsertItem.name;
                    }
                    parent.children.push(toInsertItem);
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

        var treeData = JSON.parse(JSON.stringify(treeObj));
        // 如果是虚拟节点的，设置虚拟节点的deviceVarSns为子节点的deviceVarSns的并集，并设置isVirtual=false
        function _setDeviceVarSns(parent) {
            if (parent) {
                var children = parent.children;
                if (children) {
                    children.forEach(function (c) {
                        _setDeviceVarSns(c);
                    });
                }
                if (parent.isVirtual) {
                    var deviceVars = [];
                    children.forEach(function (child) {
                        child.deviceVarSns.forEach(function (sn) {
                            if (deviceVars.indexOf(sn) < 0) {
                                deviceVars.push(sn);
                            }
                        });
                    });
                    parent.deviceVarSns = deviceVars;
                    parent.isVirtual = false;
                }
            }
        }
        treeData.forEach(function (item) {
            _setDeviceVarSns(item);
        });
        return treeData;
    }
}]);
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
            $scope.isEnglish = gIsEnglish;
            $scope.active = false;
            var tmpChecked = {};        // 本次操作中被选中或被取消的选项
            $scope.toggle = function () {
                $scope.active = !$scope.active;
                if (!$scope.active) {
                    // 当收起时，将当前已选通过回调回传
                    $scope.onOk();
                }
                tmpChecked = {};
            };

            // function expandAll(datas) {
            //     if (!datas) {
            //         return;
            //     }
            //     datas.forEach(function (item) {
            //         if (!item.isLeaf) {
            //             item.$$isExpend = true;
            //             expandAll(item.children);
            //         }
            //     })
            // }
            // expandAll($scope.datas);

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
            $scope.onToggleExpand = function($event, item){
                item.$$isExpend = !item.$$isExpend;
            };
            $scope.onCheckAllChildren = function ($event, item) {
                function _checkChildren(children, checked) {
                    if (children) {
                        children.forEach(function (child) {
                            if (!child.isVirtual) {
                                child.checked = checked;
                            }
                            _checkChildren(child.children, checked);
                        });
                    }
                }
                // 选择自身及所有子节点
                if (item.checkAll) {
                    if (!item.isVirtual) {
                        item.checked = false;
                    }
                    item.checkAll = false;
                    _checkChildren(item.children, false);
                } else {
                    if (!item.isVirtual) {
                        item.checked = true;
                    }
                    item.checkAll = true;
                    _checkChildren(item.children, true);
                }
            };

            $scope.onCheckItem = function ($event, item) {
                $event.stopPropagation();
                if (item.isVirtual) {
                    $.notify.toast('未配置变量，无法选择');
                    return false;
                }
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

function distinctVarSns(sns) {      // 变量sn去重
    var tmpSns = [];
    sns.forEach(function (sn) {
        if (tmpSns.indexOf(sn) < 0) {
            tmpSns.push(sn);
        }
    });
    return tmpSns;
}

app.controller('EnergyMeterReadingCtrl', ['$scope', 'ajax', '$compile', 'platformService', 'energyFormatService', '$myTranslate', function ($scope, ajax, $compile, platformService, energyFormatService, $myTranslate) {
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
    $scope.isDataLoading = false;       // 数据加载
    var variableUnits = {};     // 变量sn与单位的对应关系
    var allEnergyItems = [];
    $scope.selectedItems = [];

    function getConfig(stationSn) {
        $scope.isLoading = true;
        ajax.get({
            url: '/energy/' + stationSn + '/config',
            success: function (response) {
                $scope.isLoading = false;
                var labels = [];
                var categories = [];
                response = energyFormatService.internationalised(response);
                response.energyItems.forEach(function (item) {
                    var labelName = item.labelName;
                    if (labels.indexOf(labelName) < 0) {
                        labels.push(labelName);
                    }
                    var category = item.category;
                    if (categories.indexOf(category) < 0) {
                        categories.push(category)
                    }
                });
                $scope.categories = [];
                $scope.labelNames = [];
                response.categories.forEach(function (name) {
                    if (categories.indexOf(name) >= 0) {
                        if (name === response.category) {
                            $scope.currentCategory = {id: name, name: name};
                        }
                        $scope.categories.push({id: name, name: name})
                    }
                });
                response.labelNames.forEach(function (name) {
                    if (labels.indexOf(name) >= 0) {
                        $scope.labelNames.push({id: name, name: name});
                        if (name === response.labelName) {
                            $scope.currentLabel = {id: name, name: name};
                        }
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
                    $dom.prependTo($('.body-content'));
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
                if (sns.indexOf(sn) < 0) {
                    sns.push(sn);
                }
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
        });
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
                datePickerI18n();
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
                datePickerI18n();
            }
        }, false);
    }

    $scope.onSelect = function (key, item) {
        $scope[key] = item;
        $scope.energyItems = formatEnergyTree($scope.currentCategory.name, $scope.currentLabel.name, allEnergyItems);
        // 切换时默认会选中所有
        $scope.selectedItems = [];
        checkAll($scope.energyItems);
        refreshData();
    };

    function checkAll(datas) {
        // 选第一个层的非虚拟节点
        if (!datas || !datas.length) {
            return 0;
        }
        var count = 0;
        // 先查找第一级
        datas.forEach(function (item) {
            if (!item.isVirtual) {
                count += 1;
                item.checked = true;
                $scope.selectedItems.push(item);
            }
        });
        // 再查找第二级
        if (count === 0) {
            datas.forEach(function (item) {
               if (item.children) {
                   item.children.forEach(function (child) {
                       if (!child.isVirtual) {
                           child.checked = true;
                           $scope.selectedItems.push(child);
                       }
                   })
               }
            });
        }

        // 展开所有节点
        expandAll(datas);
    }

    $scope.onSelectItems = function (items) {
        if (JSON.stringify($scope.selectedItems) !== JSON.stringify(items)) {
            $scope.selectedItems = items;
            refreshData();
        }
    };

    function refreshData() {
        var sns = [];
        $scope.selectedItems.forEach(function (item) {
            item.deviceVarSns.forEach(function (sn) {
                if (sns.indexOf(sn) < 0) {
                    sns.push(sn);
                }
            });
        });
        if (!$scope.currentLabel) {
            return;
        }
        $scope.tableHeader = [gIsEnglish ? 'Name' : $scope.currentLabel.name+'名称', $scope.startDate.substring(0, 16), $scope.endDate.substring(0, 16), $myTranslate.instant('value.diff'), $myTranslate.instant('unit')];
        $scope.tableBodyData = [];
        if (!sns.length) {
            refreshTable();
            return;
        }
        $scope.isDataLoading = true;
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/sometime',
            data: {
                sns: sns.join(','),
                querytimes: [$scope.startDate, $scope.endDate].join(',')
            },
            success: function (response) {
                $scope.isDataLoading = false;
                response.forEach(function (item) {
                    item.values = JSON.parse(item.values);
                });
                $scope.selectedItems.forEach(function (item) {
                    var rowData = [item.aliasName, '-', '-', '-', '-'];
                    response.forEach(function (n) {
                        var value = null;
                        distinctVarSns(item.deviceVarSns).forEach(function (sn) {
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
                refreshTable();
                $scope.$apply();
            },
            error: function () {
                $scope.isDataLoading = false;
                $scope.$apply();
                $.notify.error($myTranslate.instant('get data failed'));
            }
        });
    }

    function refreshTable() {
        var table = $("#meterReadingTable").DataTable();
        if (table) {
            table.destroy(true);
            table = null;
            var html = "<energy-meter-reading-table table-header='tableHeader' table-body-data='tableBodyData'></energy-meter-reading-table>";
            var compileFn = $compile(html);
            var $dom = compileFn($scope);
            // 添加到文档中
            $dom.appendTo($('#tableParent'));
        }
    }

    // initDatePicker();
    getConfig(stationSn);
}]);

app.directive('energyMeterReadingTable', [function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/energy/energy-meter-reading-table-template.html',
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


app.directive('energyMeterReadingTableRepeatFinish',function(){
    return {
        link: function(scope,element,attr){
            if(scope.$last == true){
                setTimeout(function () {
                    $.fn.dataTable.ext.errMode = 'none'; //不显示任何错误信息
                    var height = screen.height - 210;
                    var table = $('#meterReadingTable').DataTable( {
                        searching: false,
                        ordering: false,
                        scrollY:        height + 'px',
                        scrollX:        true,
                        scrollCollapse: true,
                        paging:         false,
                        info: false,
                        fixedRows: false,
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

app.controller('EnergyReportCtrl', ['$scope', 'ajax', '$compile', 'platformService', 'energyFormatService', '$myTranslate', function ($scope, ajax, $compile, platformService, energyFormatService, $myTranslate) {
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
        name: $myTranslate.instant('report.daily')
    }, {
        id: 'MONTH',
        name: $myTranslate.instant('report.monthly')
    }, {
        id: 'YEAR',
        name: $myTranslate.instant('report.yearly')
    }];
    $scope.timeType = {id: 'DAY', name: $myTranslate.instant('report.daily')};
    $scope.tableHeader = [];
    $scope.tableBodyData = [];
    $scope.isLoading = false;
    $scope.isDataLoading = false;       // 数据加载状态
    var allEnergyItems = [];
    $scope.selectedItems = [];
    $scope.isEnglish = gIsEnglish;


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
                var labels = [];
                var categories = [];
                response = energyFormatService.internationalised(response);
                response.energyItems.forEach(function (item) {
                    var labelName = item.labelName;
                    if (labels.indexOf(labelName) < 0) {
                        labels.push(labelName);
                    }
                    var category = item.category;
                    if (categories.indexOf(category) < 0) {
                        categories.push(category);
                    }
                });
                $scope.categories = [];
                $scope.labelNames = [];
                response.categories.forEach(function (name) {
                    if (categories.indexOf(name) >= 0) {
                        if (name === response.category) {
                            $scope.currentCategory = {id: name, name: name};
                        }
                        $scope.categories.push({id: name, name: name});
                    }
                });
                response.labelNames.forEach(function (name) {
                    if (labels.indexOf(name) >= 0) {
                        $scope.labelNames.push({id: name, name: name});
                        if (name === response.labelName) {
                            $scope.currentLabel = {id: name, name: name};
                        }
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
                    $dom.prependTo($('.body-content'));
                    refreshData();
                    setTimeout(initDatePicker, 200);
                }
            },
            error: function () {
                $scope.isLoading = false;
                $.notify.error($myTranslate.instant('get data failed'));
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
                datePickerI18n();
            }
        }, false);
    }

    $scope.onSelect = function (key, item) {
        $scope[key] = item;
        if (key === 'timeType') {
            refreshDateShowName();
        } else {
            $scope.energyItems = formatEnergyTree($scope.currentCategory.name, $scope.currentLabel.name, allEnergyItems);
            $scope.selectedItems = [];
            checkAll($scope.energyItems);
        }
        refreshData();
    };

    $scope.onSelectItems = function (items) {
        if (JSON.stringify($scope.selectedItems) !== JSON.stringify(items)) {
            $scope.selectedItems = items;
            refreshData();
        }
    };

    function checkAll(datas) {
        // 选第一个层的非虚拟节点
        if (!datas || !datas.length) {
            return 0;
        }
        var count = 0;
        // 先查找第一级
        datas.forEach(function (item) {
            if (!item.isVirtual) {
                count += 1;
                item.checked = true;
                $scope.selectedItems.push(item);
            }
        });
        // 再查找第二级
        if (count === 0) {
            datas.forEach(function (item) {
                if (item.children) {
                    item.children.forEach(function (child) {
                        if (!child.isVirtual) {
                            child.checked = true;
                            $scope.selectedItems.push(child);
                        }
                    })
                }
            });
        }

        // 展开所有节点
        expandAll(datas);
    }

    function refreshData() {
        var sns = [];
        $scope.selectedItems.forEach(function (item) {
            item.deviceVarSns.forEach(function (sn) {
                if (sns.indexOf(sn) < 0) {
                    sns.push(sn);
                }
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
        $scope.tableHeader = [$scope.isEnglish ? 'Name' : $scope.currentLabel.name+'名称'];
        switch ($scope.timeType.id) {
            case 'DAY':
                startTime = currentDay;
                endTime = startTime.substring(0, 10) + ' 23:59:59.000';
                queryPeriod = 'HOUR';
                for (var i=0; i<24; i++) {
                    // $scope.tableHeader.push(i + '时');
                    $scope.tableHeader.push(getHour(i));
                }
                break;
            case 'MONTH':
                startTime = currentDay.substring(0, 7) + '-01 00:00:00.000';
                endTime = moment(startTime).add(1, 'M').set('date', 1).subtract(1, 'd').format('YYYY-MM-DD 23:59:59.000');
                queryPeriod = 'DAY';
                var lastDate = parseInt(endTime.substring(8, 10));
                for (var i=1; i<=lastDate; i++) {
                    // $scope.tableHeader.push(i + '日');
                    $scope.tableHeader.push(getDay(i));
                }
                break;
            case 'YEAR':
                startTime = currentDay.substring(0, 4) + '-01-01 00:00:00.000';
                endTime = currentDay.substring(0, 4) + '-12-31 23:59:59.000';
                queryPeriod = 'MONTH';
                for (var i=1; i<=12; i++) {
                    // $scope.tableHeader.push(i + '月');
                    $scope.tableHeader.push(getMonth(i-1, true));
                }
                break;
        }
        $scope.tableHeader.push($myTranslate.instant('total'));
        $scope.tableHeader.push($myTranslate.instant('unit'));
        $scope.tableBodyData = [];
        if (!sns.length) {
            $scope.isLoading = false;
            refreshTable();
            return;
        }
        $scope.isDataLoading = true;
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
                $scope.isDataLoading = false;
                // 先对数据进行补空
                data.forEach(function (item) {
                    var result = fillTrendDataVacancy(startTime, endTime, queryPeriod, item.time_keys, item.datas, 'YYYY-MM-DD HH:mm:ss.000');
                    item.time_keys = result.time_keys;
                    item.datas = result.datas;
                });
                $scope.selectedItems.forEach(function (item) {
                    var rowData = [item.aliasName];
                    // 加入默认数据
                    for (var i=1; i<$scope.tableHeader.length-2; i++) {
                        rowData.push('-');
                    }
                    var total = 0;
                    var isNull = true;
                    var unit = 'kWh';
                    distinctVarSns(item.deviceVarSns).forEach(function (sn) {
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
                                unit = dataItem.var.unit;
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
                    rowData.push(unit);
                    $scope.tableBodyData.push(rowData);
                });
                refreshTable();
                $scope.$apply();
            },
            error: function () {
                $scope.isDataLoading = false;
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
}]);

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

app.controller('EnergyStatisticsCtrl', ['$scope', 'ajax', 'platformService', '$compile', '$myTranslate', 'energyFormatService', function ($scope, ajax, platformService, $compile, $myTranslate, energyFormatService) {
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
        name: $myTranslate.instant('select.daily')
    }, {
        id: 'MONTH',
        name: $myTranslate.instant('select.monthly')
    }, {
        id: 'YEAR',
        name: $myTranslate.instant('select.yearly')
    }];
    var categoryUnit = {}; // 不同类别的用能单位
    $scope.unit = 'kWh'; // 当前类别的单位
    $scope.isEnglish = gIsEnglish;
    $scope.timeType = {id: 'DAY', name: $myTranslate.instant('report.daily')};
    var branchCircuitName = $myTranslate.instant('支路');
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
                var labels = [];
                var categories = [];
                response = energyFormatService.internationalised(response);
                response.energyItems.forEach(function (item) {
                    var labelName = item.labelName;
                    if (labels.indexOf(labelName) < 0) {
                        labels.push(labelName);
                    }
                    var category = item.category;
                    if (categories.indexOf(category) < 0) {
                        categories.push(category);
                    }
                });
                $scope.categories = [];
                $scope.labelNames = [];
                response.categories.forEach(function (name) {
                    if (categories.indexOf(name) >= 0) {
                        if (name === response.category) {
                            $scope.currentCategory = {id: name, name: name, costName: response.categoryCostName[name]};
                        }
                        $scope.categories.push({id: name, name: name, costName: response.categoryCostName[name]});
                    }
                });
                response.labelNames.forEach(function (name) {
                    if (labels.indexOf(name) >= 0) {
                        $scope.labelNames.push({id: name, name: name});
                        if (name === response.labelName) {
                            $scope.currentLabel = {id: name, name: name};
                        }
                    }
                });
                allEnergyItems = response.energyItems;
                if ($scope.currentLabel) {
                    getItemsForLabel();
                    var itemStyle1 = $scope.isEnglish ? 'width:50%; float: left;' : 'width:25%; float: left;';
                    var itemStyle2 = $scope.isEnglish ? 'width:100%; float: left;' : 'width:50%; float: left;';
                    var html = "<ul class='selector-group' style='display:block;'>" +
                        "<drop-down-menu options=\"categories\" on-select=\"onSelect\" model-name=\"'currentCategory'\" selected=\"currentCategory\" style=\"" + itemStyle1 + "\"></drop-down-menu>" +
                        "<drop-down-menu options=\"labelNames\" on-select=\"onSelect\" model-name=\"'currentLabel'\" selected=\"currentLabel\" style=\"" + itemStyle1 + "\"></drop-down-menu>" +
                        "<drop-down-menu id='itemSelector' options=\"energyItems\" on-select=\"onSelect\" model-name=\"'labelItem'\" selected=\"currentItem\" style=\"" + itemStyle2 + "\" disabled=\"currentLabel.name !== '" + branchCircuitName + "'\"></drop-down-menu>" +
                        "</ul>";
                    html += "</ul>";
                    var compileFn = $compile(html);
                    var $dom = compileFn($scope);
                    // 添加到文档中
                    $dom.prependTo($('.body-content'));
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
            if (item.category === category && item.labelName === labelName && !item.isVirtual) {
                if (labelName === branchCircuitName) {
                    if (item.level >= 1 && item.level <= 2){
                        items.push(item);
                    }
                } else if (item.level > 0){
                    items.push(item);
                }
            }
        });
        items = formatEnergyItems(category, labelName, allEnergyItems);
        getCategoryUnit(category, items);
        $scope.energyItems = [];
        items.forEach(function (item, i) {
            $scope.energyItems.push($.extend({}, item, {name: item.aliasName, id: i}));
        });
        if (labelName === branchCircuitName) {
            $scope.currentItem = items.length ? items[0] : null;
        } else {
            $scope.currentItem = {name: $scope.isEnglish ? 'ALL' : '所有' + labelName, id: '所有', deviceVarSns: []};
            $scope.energyItems.unshift($scope.currentItem);
        }
    }

    function getCategoryUnit(category, items) { // 切换类别时，读取该类别第一个变量的单位作为该类别单位
        if (categoryUnit[category]) {
            $scope.unit = categoryUnit[category];
            return categoryUnit[category];
        }
        if (!items || !items.length) {
            return 'kWh';
        }
        var sn = items[0].deviceVarSns[0];
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/variables',
            data: {
                sns: sn,
            },
            async: false,
            success: function (res) {
                if (res && res.data.length) {
                    categoryUnit[category] = res.data[0].unit;
                    $scope.unit = res.data[0].unit;
                }
            }
        });
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
                datePickerI18n();
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

    $scope.onSelect = function (key, item) {
        if (key === 'currentLabel') {
            if ($scope.currentLabel.id !== item.id) {
                if (item.name === branchCircuitName) {
                    var html = '';
                    var compileFn = $compile(html);
                    var $dom = compileFn($scope);
                    // 添加到文档中
                    $dom.prependTo($('.body-content'));
                }
            }
            // 如果当前所选不是"支路"，且是英文版，则第三个选项不显示
            if ($scope.isEnglish && item.name !== branchCircuitName) {
                $('#itemSelector').hide();
            } else {
                $('#itemSelector').show();
            }
        }
        $scope[key] = item;
        if (key === 'timeType') {
            refreshDateShowName();
        } else if (key === 'labelItem') {
            $scope.currentItem = $scope.energyItems[item.id];
        } else {
            getItemsForLabel();
        }
        refreshData();
    };

    function refreshData() {
        if ($scope.currentLabel.name === branchCircuitName) {
            $scope.$broadcast('$zhiluRefresh');
        } else {
            $scope.$broadcast('$otherRefresh');
        }
    }

    init();
}]);


app.controller('EnergyStatisticsZhiluCtrl', ['$scope', 'ajax', 'platformService', '$myTranslate', function ($scope, ajax, platformService, $myTranslate) {
    $scope.timeTypes = [$myTranslate.instant('日'), $myTranslate.instant('月'), $myTranslate.instant('年')];
    $scope.timeType = $myTranslate.instant('日');
    var currentItem = null;
    $scope.todayTotalDegree = 0;
    $scope.electricData = {};
    $scope.categoryName = null;
    $scope.labelName = null;
    $scope.hasConfig = false;
    $scope.width = screen.width + 'px';     // 直接用屏幕宽度定义chart宽度
    var varSns = [];
    var queryPeriod = 'QUARTER'; // 趋势图的请求周期，今日用能曲线根据存盘周期来决定queryPeriod

    $scope.$on('$zhiluRefresh', function (event) {
        currentItem = $scope.$parent.currentItem;
        varSns = distinctVarSns(currentItem.deviceVarSns);
        // 获取变量信息
        recordPeriod = null;
        $scope.labelName = $scope.$parent.currentLabel.name;
        if ($scope.categoryName !== $scope.$parent.currentCategory.name) {
            $scope.categoryName = $scope.$parent.currentCategory.name;
            getTotalEnergyDegree(varSns);
        }
        if (currentItem) {
            $scope.hasConfig = true;
            refreshData(varSns);
        } else {
            $scope.hasConfig = false;
        }
    });

    $scope.$on('$otherRefresh', function (event) {      // 显示非支路时，不显示
        $scope.hasConfig = false;
    });

    function getQueryPeriod(sns, callback) { // 根据变量存盘周期决定趋势图的请求周期
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/management/variables',
            data: {
                sns: sns.join(',')
            },
            success: function (res) {
                if (res && res.data && res.data.length) {
                    res.data.forEach(function (v) {
                        if (v.record_period === '30分钟') {
                            queryPeriod = 'HALF_HOUR';
                        } else if (v.record_period === '1小时') {
                            queryPeriod = 'HOUR';
                        }
                    });
                    callback(res.data);
                }
            }
        });
    }


    function getTotalEnergyDegree(sns) {
        // 获取一级支路今日总用能
        $scope.todayTotalDegree = null;
        fetchElectricDegree(sns, moment().format('YYYY-MM-DD 00:00:00.000'), moment().format('YYYY-MM-DD HH:mm:ss.000'), function (data) {
            $scope.todayTotalDegree = data;
            $scope.$apply();
        });
    }

    function refreshData(sns) {
        createElectricStatistics(sns);
        getQueryPeriod(sns, function () {
            createElectricTrendLine(sns);
        });
        createElectricBarTrend(sns);
    }

    $scope.getItemRate = function() {        // 获取支路用能占比
        if (!$scope.todayTotalDegree || $scope.electricData.today === undefined) {
            return '-';
        } else {
            return ($scope.electricData.today/$scope.todayTotalDegree*100).toFixed(1) + '%';
        }
    };

    $scope.onSelectTimeType = function (type) {
        $scope.timeType = type;
        createElectricBarTrend(varSns);
    };

    function fetchElectricDegree(sns, startTime, endTime, callback) {
        // 对sn去重
        var tmpSns = distinctVarSns(sns);
        ajax.get({
            url: platformService.getDeviceMgmtHost() + '/variables/data/summarized',
            data: {
                sns: tmpSns.join(','),
                startTime: startTime,
                endTime: endTime,
                calcmethod: 'DIFF'
            },
            success: function (data) {
                var total = null;
                // 将最大-最小=总电量
                data.forEach(function (item) {
                    if (item.accu_value_data !== null) {
                        if (total === null) {
                            total = item.accu_value_data;
                        } else {
                            total += item.accu_value_data;
                        }
                    }
                });
                if (total !== null) {
                    callback(parseFloat(total.toFixed(2)));
                }
            }
        });
    }

    function fetchElectricTrend(sns, startTime, endTime, queryPeriod, callback) {
        // 对sn去重
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

    function createElectricStatistics(sns) {
        var formatStr = 'YYYY-MM-DD 00:00:00.000';
        var today = [moment().format(formatStr), moment().format('YYYY-MM-DD HH:mm:ss.000')];
        var yesterday = [moment().subtract(1, 'd').format(formatStr), moment().subtract(1, 'd').format('YYYY-MM-DD HH:mm:ss.000')];
        var thisMonth = [moment().format('YYYY-MM-01 00:00:00.000'), moment().format('YYYY-MM-DD HH:mm:ss.000')];
        var lastMonth = [moment().subtract(1, 'month').format('YYYY-MM-01 00:00:00.000'), moment().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss.000')];
        $scope.electricData = {};
        $scope.electricData = {
            today: '-',
            yesterday: '-',
            month: '-',
            lastMonth: '-',
            dayRate: '-',
            monthRate: '-'
        };
        fetchElectricDegree(sns, today[0], today[1], function (data) {
            $scope.electricData.today = data;
            _calcDayRate();
        });
        fetchElectricDegree(sns, yesterday[0], yesterday[1], function (data) {
            $scope.electricData.yesterday = data;
            _calcDayRate();
        });
        fetchElectricDegree(sns, thisMonth[0], thisMonth[1], function (data) {
            $scope.electricData.month = data;
            _calcMonthRate();
        });
        fetchElectricDegree(sns, lastMonth[0], lastMonth[1], function (data) {
            $scope.electricData.lastMonth = data;
            _calcMonthRate();
        });

        function _calcDayRate() {
            var value1 = $scope.electricData.today, value2 = $scope.electricData['yesterday'];
            if (value1 !== '-' && value2 !== '-') {
                if (value2 === 0) {
                    $scope.electricData.dayRate = '-';
                } else {
                    var rate = (value1-value2)/value2 * 100;
                    $scope.electricData.dayRate = (Math.abs(rate)).toFixed(1);
                    $scope.electricData.dayTrend = rate > 0 ? 'up' : 'down';
                }
            }
            $scope.$apply();
        }

        function _calcMonthRate() {
            var value1 = $scope.electricData.month, value2 = $scope.electricData.lastMonth;
            if (value1 !== '-' && value2 !== '-') {
                if (value2 === 0) {
                    $scope.electricData['monthRate'] = '-';
                } else {
                    var rate = (value1-value2)/value2 * 100;
                    $scope.electricData['monthRate'] = (Math.abs(rate)).toFixed(1);
                    $scope.electricData['monthTrend'] = rate > 0 ? 'up' : 'down';
                }
            }
            $scope.$apply();
        }
    }

    function getNextTime(t, period) {
        function _i_to_2_str(i) {
            if (i < 10) {
                return '0' + i;
            }
            return i.toString();
        }
        var h = parseInt(t.substring(0, 2));
        var m = parseInt(t.substring(3, 5));
        if (period === 'HOUR') {
            h += 1;
        } else if (period === 'QUARTER') {
            m += 15;
        } else if (period === 'HALF_HOUR') {
            m += 30;
        }
        if (m >= 60) {
            h += 1;
            m -= 60;
        }
        return _i_to_2_str(h) + ':' + _i_to_2_str(m);
    }
    
    function createElectricTrendLine(sns) {
        var today = [moment().format('YYYY-MM-DD 00:00:00.000'), moment().format('YYYY-MM-DD 23:59:59.000')];
        var yesterday = [moment().subtract(1, 'd').format('YYYY-MM-DD 00:00:00.000'), moment().subtract(1, 'd').format('YYYY-MM-DD 23:59:59.000')];

        var data = {};
        fetchElectricTrend(sns, today[0], today[1], queryPeriod, function (response) {
            data['today'] = response;
            _paint(data);
        });
        fetchElectricTrend(sns, yesterday[0], yesterday[1], queryPeriod, function (response) {
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
                    },
                    confine: true,
                    formatter: function (params) {
                        var p0 = params[0];
                        var xIndex = p0.dataIndex;
                        var thisTime = p0.axisValue;
                        var nextTime = times[xIndex + 1];
                        if (xIndex === times.length - 1) { // 最后一个节点，需要自行生成时间
                            nextTime = getNextTime(thisTime, queryPeriod);
                        }
                        var t = thisTime + '~' + nextTime;
                        var lines = [t];
                        params.forEach(function (p) {
                            lines.push('<br />');
                            lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data) + ' ' + $scope.unit);
                        });
                        return lines.join('');
                    }
                },
                legend: {
                    data: [$myTranslate.instant('today'), $myTranslate.instant('yesterday')],
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
                    name: $scope.unit,
                    nameGap: '5'
                },
                series: [
                    {
                        name: $myTranslate.instant('today'),
                        type: 'line',
                        smooth: true,
                        data: todaySeriesData,
                        areaStyle:  {opacity: 0.25} ,
                    },
                    {
                        name: $myTranslate.instant('yesterday'),
                        type: 'line',
                        smooth: true,
                        data: yesterdaySeriesData,
                    }
                ],
            };

            echarts.init(document.getElementById('zhilu_trend1'), "custom").setOption(config);
        }
    }

    function createElectricBarTrend(sns) {
        var startTime, endTime, queryPeriod, startTime1, endTime1;
        var labels = [];
        switch ($scope.timeType) {
            case $myTranslate.instant('日'):
                startTime = moment().format('YYYY-MM-DD 00:00:00.000');
                endTime = moment().format("YYYY-MM-DD 23:59:59.000");
                startTime1 = moment().subtract(1, 'day').format('YYYY-MM-DD 00:00:00.000');
                endTime1 = moment().subtract(1, 'day').format("YYYY-MM-DD 23:59:59.000");
                queryPeriod = 'HOUR';
                labels = [$myTranslate.instant('today'), $myTranslate.instant('yesterday')];
                break;
            case $myTranslate.instant('月'):
                startTime = moment().format('YYYY-MM-01 00:00:00.000');
                endTime = moment().add(1, 'month').set('date', 1).subtract(1, 'day').format("YYYY-MM-DD 23:59:59.000");
                startTime1 = moment().subtract(1, 'month').format('YYYY-MM-01 00:00:00.000');
                endTime1 = moment().set('date', 1).subtract(1, 'day').format("YYYY-MM-DD 23:59:59.000");
                queryPeriod = 'DAY';
                labels = [$myTranslate.instant('thismonth'), $myTranslate.instant('lastmonth')];
                break;
            case $myTranslate.instant('年'):
                startTime = moment().format('YYYY-01-01 00:00:00.000');
                endTime = moment().format("YYYY-12-31 23:59:59.000");
                startTime1 = moment().subtract(1, 'year').format('YYYY-01-01 00:00:00.000');
                endTime1 = moment().subtract(1, 'year').format("YYYY-12-31 23:59:59.000");
                queryPeriod = 'MONTH';
                labels = [$myTranslate.instant('thisyear'), $myTranslate.instant('lastyear')];
                break;
        }
        var data = {};
        fetchElectricTrend(sns, startTime, endTime, queryPeriod, function (response) {
            data['now'] = response;
            _paint(data);
        });
        fetchElectricTrend(sns, startTime1, endTime1, queryPeriod, function (response) {
            data['history'] = response;
            _paint(data);
        });

        function _paint(data) {
            if (!data['now'] || !data['history']) {
                return;
            }
            var times = [];
            var currentMoment = moment().format('YYYY-MM-DD HH:mm:ss.000');
            var month = moment().get('month') + 1;
            data.now.time_keys.forEach(function (t) {
                // if (t > currentMoment) {
                //     return false;
                // }
               switch ($scope.timeType) {
                   case $myTranslate.instant('日'):
                       // times.push(parseInt(t.substring(11, 13)) + '时');
                       times.push(t.substring(11, 16));
                       break;
                   case $myTranslate.instant('月'):
                       // times.push(parseInt(t.substring(8, 10)) + '日');
                       times.push(getDay(parseInt(t.substring(8, 10))));
                       break;
                   case $myTranslate.instant('年'):
                       // times.push(parseInt(t.substring(5, 7)) + '月');
                       times.push(getMonth(parseInt(t.substring(5, 7)) - 1, true));
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
                    confine: true,
                    formatter: function (params) {
                        if (!params.length) {
                            return null;
                        }
                        var p0 = params[0];
                        if ($scope.timeType === $myTranslate.instant('日')) {
                            var xIndex = p0.dataIndex;
                            var thisTime = p0.axisValue;
                            var nextTime = times[xIndex + 1];
                            if (xIndex === times.length - 1) { // 最后一个节点，需要自行生成时间
                                nextTime = getNextTime(thisTime, queryPeriod);
                            }
                            var t = thisTime + '~' + nextTime;
                            var lines = [t];
                            params.forEach(function (p) {
                                lines.push('<br />');
                                lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data) + ' ' + $scope.unit);
                            });
                            return lines.join('');
                        }
                        var lines = [p0.axisValue];
                        params.forEach(function (p) {
                            lines.push('<br />');
                            lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data) + ' ' + $scope.unit);
                        });
                        return lines.join('');
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
                    nameLocation: 'start',
                    nameGap: '5',
                    data: times,
                },
                yAxis: {
                    name: $scope.unit,
                    type: 'value',
                    nameGap: 25,
                    nameLocation: 'start',
                    nameTextStyle: {
                        // verticalAlign: 'top'
                    }
                },
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
            echarts.init(document.getElementById('zhilu_trend2'), "custom").setOption(config);
        }
    }
    
    
}]);

app.controller('EnergyStatisticsOtherCtrl', ['$scope', 'ajax', 'platformService', '$myTranslate', function ($scope, ajax, platformService, $myTranslate) {
    var timeType = null;
    var energyItems = null;
    var currentDate = null;
    $scope.categoryName = null;
    $scope.labelName = null;
    var timeFormat = 'YYYY-MM-DD HH:mm:ss.000';
    $scope.hasConfig = false;
    $scope.loadingStatus = {
        '1': false,
        2: false,
        3: false,
        4: false,
        5: false
    };
    $scope.width = screen.width + 'px';     // 直接用屏幕宽度定义chart宽度
    $scope.chainRatioName = gIsEnglish ? 'day-on-day' : '用能环比';

    $scope.$on('$otherRefresh', function (event) {
        timeType = $scope.$parent.timeType.id;
        energyItems = $scope.$parent.energyItems;
        currentDate = $scope.$parent.dateName;
        $scope.categoryName = $scope.$parent.currentCategory.name;
        $scope.labelName = $scope.$parent.currentLabel.name;
        if (gIsEnglish) {
            switch (timeType) {
                case 'DAY':
                    $scope.chainRatioName = 'Day-on-Day';
                    break;
                case 'MONTH':
                    $scope.chainRatioName = 'Month-on-Month';
                    break;
                case 'YEAR':
                    $scope.chainRatioName = 'Year-on-Year';
                    break;
            }
        }
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
            end = moment(currentDate, 'YYYY-MM').add(1, 'month').set('date', 1).subtract(1, 'day').format('YYYY-MM-DD 23:59:59.000');
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
            url: platformService.getDeviceMgmtHost() + '/variables/data/summarized',
            data: {
                sns: sns.join(','),
                startTime: startTime,
                endTime: endTime,
                calcmethod: 'DIFF'
            },
            success: function (data) {
                data.forEach(function (item) {
                   if (item.accu_value_data !== null) {
                       item.all_degree = parseFloat(item.accu_value_data);
                   } else {
                       item.all_degree = 0;
                   }
                });
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
        $scope.loadingStatus['1'] = true;
        fetchElectricDegree(sns, times[0], times[1], function (data) {
            $scope.loadingStatus['1'] = false;
            $scope.$apply();
            var total = 0;
            var varValue = {};
            data.forEach(function (item) {
                varValue[item.sn] = item.all_degree;
                total += item.all_degree;
            });
            // 按项统计
            var seriesList = [];
            showItems.forEach(function (item) {
                var total = 0;
                distinctVarSns(item.deviceVarSns).forEach(function (sn) {
                    if (varValue[sn]) {
                        total += varValue[sn];
                    }
                });
                seriesList.push({name: item.aliasName, value: parseFloat(total.toFixed(2))});
            });
            _paint(total.toFixed(2), seriesList);
        });
        function _paint(total, series) {
            var config = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{b} : {c} ' + $scope.unit + '({d}%)',
                    confine: true
                },
                title: [
                    {
                        text: total + '\n' + $scope.unit,
                        textStyle: {
                            fontFamily: 'Microsoft YaHei',
                            fontSize: 12,
                            // color: '#818181',
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
                series: [
                    {
                        avoidLabelOverlap: false,
                        hoverAnimation: true, //设置饼图默认的展开样式
                        radius: ['55%', '75%'],
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
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            },
                        },
                        label: {
                            fontSize: 10
                        },
                        labelLine: {
                            length: 5,
                            length2: 5
                        }
                    },
                ],
            };
            echarts.init(document.getElementById('chart_pie1'), "custom").setOption(config);
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
            varDegreeMap[item.sn] = item.all_degree;
        });
        var itemDegreeMap = [];
        energyItems.forEach(function (item) {
            var total = 0;
            if (item.deviceVarSns.length) {
                distinctVarSns(item.deviceVarSns).forEach(function (sn) {
                    if (varDegreeMap[sn]) {
                        total += varDegreeMap[sn];
                    }
                });
                itemDegreeMap[item.path] = parseFloat(total.toFixed(2));
            }
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
        $scope.loadingStatus['2'] = true;
        fetchElectricDegree(sns, lastTimes[0], lastTimes[1], function (data) {
            $scope.loadingStatus['2'] = false;
            $scope.$apply();
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
                if (nowValue !== null && historyValue !== undefined && historyValue !== undefined && historyValue !== null && nowValue > 0) {
                    value = parseFloat(nowValue/historyValue*100-100).toFixed(2);
                }
                if (value !== null) {
                    values.push({name: item.aliasName, value: value});
                }
            });
            values.sort(function (v1, v2) {
                return Math.abs(v2.value) - Math.abs(v1.value);
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
                    formatter: '{b} : {c}%',
                    confine: true
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
            echarts.init(document.getElementById('chart_bar1'), "custom").setOption(config);
        }
    }
    
    function createFiveDegree() {       // 用能前五名

        var sns = getAllSnsOfItems();
        var currentDegreeMap = null, historyDegreeMap = null;
        var times = getStartAndEndTime();
        $scope.loadingStatus['3'] = true;
        fetchElectricDegree(sns, times[0], times[1], function (data) {
            $scope.loadingStatus['3'] = false;
            $scope.$apply();
            currentDegreeMap = _groupDegrees(data);
            _paint();
        });
        function _paint() {
            var values = [];
            energyItems.forEach(function (item) {
                if (currentDegreeMap[item.path] !== null && currentDegreeMap[item.path] !== undefined) {
                    values.push({name: item.aliasName, value: currentDegreeMap[item.path]});
                }
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
                    formatter: '{b} \r\n: {c} ' + $scope.unit,
                    axisPointer: {
                        type: 'shadow',
                    },
                    confine: true,
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
                    name: $scope.unit,
                    nameGap: '5',
                },
                series: {
                    type:'bar',
                    barMaxWidth: "30px",
                    data: seriesData
                },
            };
            echarts.init(document.getElementById('chart_bar2'), "custom").setOption(config);
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
        $scope.loadingStatus['4'] = true;
        fetchElectricDegree(sns, lastTimes[0], lastTimes[1], function (data) {
            $scope.loadingStatus['4'] = false;
            $scope.$apply();
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
                var nv = currentDegreeMap[item.path]; // 本期值
                var hv = historyDegreeMap[item.path]; // 上期值
                if (nv || hv) {
                    currentValues.push(nv);
                    historyValues.push(hv);
                    labels.push(item.aliasName);
                }
            });
            var config = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow',
                    },
                    confine: true,
                    formatter: function (params) {
                        var p0 = params[0];
                        var lines = [p0.axisValue];
                        params.forEach(function (p) {
                            lines.push('<br />');
                            lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data) + ' ' + $scope.unit);
                        });
                        return lines.join('');
                    }
                },
                legend: {
                    data: [$myTranslate.instant('本期'), $myTranslate.instant('上期')],
                    top: 2,
                    right: 20,
                    itemWidth: 12,
                    itemHeight: 8,
                    textStyle: {
                        fontSize: 11,
                        rich: {
                            fonSize: 11
                        }
                    },
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
                    name: $scope.unit,
                    nameLocation: 'start',
                    nameGap: '5',
                },
                yAxis: {
                    type: 'category',
                    data: labels,
                },
                series: [{
                    name: $myTranslate.instant('本期'),
                    type:'bar',
                    barGap:0,
                    barMaxWidth: "40px",
                    data: currentValues,
                }, {
                    name: $myTranslate.instant('上期'),
                    type:'bar',
                    barGap:0,
                    barMaxWidth: "40px",
                    data: historyValues,
                }],
            };
            echarts.init(document.getElementById('chart_bar3'), "custom").setOption(config);
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
                endTime = moment(currentDate, 'YYYY-MM').add(1, 'month').set('date', 1).subtract(1, 'day').format('YYYY-MM-DD 23:59:59.000');
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
        const month = parseInt(currentDate.substring(5, 7));
        timeKeys.forEach(function (t) {
            switch (timeType) {
                case 'DAY':
                    // times.push(parseInt(t.substring(11, 13)) + '时');
                    times.push(t.substring(11, 16));
                    break;
                case 'MONTH':
                    // times.push(parseInt(t.substring(8, 10) + '日'));
                    // times.push(getDay(parseInt(t.substring(8, 10))));
                    times.push(month + '-' + parseInt(t.substring(8, 10)));
                    break;
                case 'YEAR':
                    // times.push(parseInt(t.substring(5, 7)) + '月');
                    times.push(getMonth(parseInt(t.substring(5, 7)) - 1, true));
                    break;
            }
        });
        $scope.loadingStatus['5'] = true;
        fetchElectricTrend(sns, startTime, endTime, queryPeriod, function (datas) {
            $scope.loadingStatus['5'] = false;
            $scope.$apply();
            _paint(times, datas);
        });

        function _paint(times, datas) {
            var seriesData = [], labels=[];
            showItems.forEach(function (item) {
                var dataList = [];
                distinctVarSns(item.deviceVarSns).forEach(function (sn) {
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
                    confine: true,
                    formatter: function (params) {
                        // if (!params.length) {
                        //     return null;
                        // }
                        // var p0 = params[0];
                        // var lines = [p0.axisValue];
                        // params.forEach(function (p) {
                        //     lines.push('<br />');
                        //     lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data) + ' ' + $scope.unit);
                        // });
                        // return lines.join('');
                        if (!params.length) {
                            return null;
                        }
                        var p0 = params[0];
                        if (timeType === 'DAY') {
                            var xIndex = p0.dataIndex;
                            var thisTime = p0.axisValue;
                            var nextTime = times[xIndex + 1];
                            if (xIndex === times.length - 1) { // 最后一个节点，需要自行生成时间
                                nextTime = "24:00";
                            }
                            var t = thisTime + '~' + nextTime;
                            var lines = [t];
                            params.forEach(function (p) {
                                lines.push('<br />');
                                lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data) + ' ' + $scope.unit);
                            });
                            return lines.join('');
                        }
                        var lines = [p0.axisValue];
                        params.forEach(function (p) {
                            lines.push('<br />');
                            lines.push(p.marker + p.seriesName + '：' + (p.data === null ? '-' : p.data) + ' ' + $scope.unit);
                        });
                        return lines.join('');
                    }
                },
                legend: {
                    data: labels,
                    bottom: 0,
                    itemWidth: 10,
                    itemHeight: 6,
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
                    name: $scope.unit,
                    nameGap: '5'
                },
                series: seriesData,
            };
            if (chart5) {
                chart5.dispose();
            }
            chart5 = echarts.init(document.getElementById('chart_bar4'), "custom");
            chart5.setOption(config);
        }
    }
}]);