
app.directive('energyConfigTree',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/energy/tree-view.html',
        scope: {
            category: '=',
            labelName: '=',
            datas: '=',
            canChecked: '=',
            textField: '@',
            itemClicked: '&',
            itemCheckedChanged: '&',
            itemTemplateUrl: '@'
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
            $scope.treeData = formatEnergyTree($scope.category, $scope.labelName, $scope.datas);
            var lastSelected = null;

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
        }]
    };
}]);

app.controller('EnergyMeterReadingCtrl', function ($scope, ajax, routerService) {
    var stationSn = GetQueryString("sn");
    $scope.categories = [];
    $scope.labelNames = [];
    $scope.currentCategory = null;
    $scope.currentLabel = null;
    var allEnergyItems = [];

    function getConfig(stationSn) {
        ajax.get({
            url: '/energy/' + stationSn + '/config',
            success: function (response) {
                $scope.categories = response.categories;
                $scope.labelNames = response.labelNames;
                $scope.currentCategory = response.category;
                $scope.currentLabel = response.labelName;
                allEnergyItems = response.energyItems;
                formatEnergyTree();
                $scope.$apply();
            },
            error: function () {
                $.notify.error('获取配置信息失败');
            }
        });
    }

    function formatEnergyTree() {
        var category = $scope.currentCategory, labelName = $scope.currentLabel;
        var filteredItems = [];
        // 过滤出需要显示的项，并根据path解析出树结构
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


    getConfig(stationSn);
});