"use strict";

/**
 * Created by liucaiyun on 2017/7/28.
 */
// 事件确认后调用该方法，需要
function eventHandled() {
    var scope = $("#siteHome").scope();
    scope.getDataList();
}

app.directive('siteTreeView',[function(){
    return {
        restrict: 'E',
        templateUrl: '/templates/site/site-tree/tree-view.html',
        scope: {
            treeData: '=',
            canChecked: '=',
            textField: '@',
            itemClicked: '&',
            itemCheckedChanged: '&',
            itemTemplateUrl: '@'
        },
        controller:['$scope', '$attrs', function($scope, $attrs){
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
                return !item.is_group;
            };
            $scope.warpCallback = function(callback, item, $event){
                item.$$isExpend = !item.$$isExpend;
                if (!item.is_group) {
                    if (lastSelected) {
                        lastSelected.$$selected = false;
                    }
                    item.$$selected = true;
                    lastSelected = item;
                }
                ($scope[callback] || angular.noop)({
                    $item:item,
                    $event:$event
                });
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

function onAndroidCb_updateAppList() {
    // 更新首页的app列表
    var scope = angular.element('#siteHome').scope();
    if (scope) {
        scope.updateAppList();
    }
}

function formatSiteTree(sites) {

    function _deleteEmptyFolderOfTree(parent) {
        if (parent.children) {
            var newChildren = [];
            parent.children.forEach(function (child) {
                if (child.is_group && child.children.length) {
                    _deleteEmptyFolderOfTree(child);
                    if (child.children.length) {
                        newChildren.push(child);
                    }
                } else if (!child.is_group) {
                    newChildren.push(child);
                }
            });
            parent.children = newChildren;
        }
    }

    var sitesTree = formatToTreeData(sites);
    // 去除没有站点的文件夹
    _deleteEmptyFolderOfTree(sitesTree[0]);
    return sitesTree;
}

function findFirstLeafOfTree(data) {
    if (!data || !data.length) {
        return null;
    }
    for (var i=0; i<data.length; i++) {
        if (!data[i].is_group) {
            return data[i];
        }
        if (data[i].children) {
            var found = findFirstLeafOfTree(data[i].children);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

app.controller('SiteListCtrl', ['$scope', 'ajax', 'userService', 'appStoreProvider', function ($scope, ajax, userService, appStoreProvider) {
    $scope.role = userService.getUserRole();
    $scope.selectedApps = [];

    $scope.openMap = function () {
        location.href='/templates/map.html?name=' + $scope.currentSite.name + '&stationSn=' + $scope.currentSite.sn;
    };

    $scope.$on('onSiteChange', function (event, station) {
        getMenuDataOfStation();
    });

    $scope.$on('onChooseNav', function (event, tabName) {       // 点击菜单事件
        if (tabName === 'sites' && $scope.currentSite && $scope.currentSite.sn) {      // 点击"站点监控"菜单，刷新当前站点状态
            $scope.refreshStationStatus($scope.currentSite.sn);
        }
    });

    function getMenuDataOfStation() {
        ajax.get({
            url: '/station/' + $scope.currentSite.sn + '/menudata',
            success: function (response) {
                if (response) {
                    var opsManagementEnabled = true;
                    var menuData = response.extend_js ? JSON.parse(response.extend_js) : {};
                    var menuSns = {};
                    if (menuData.data) {
                        menuData.data.forEach(function (menuGroup) {
                            var enabled = menuGroup.enabled;
                            if (menuGroup.children) {
                                menuGroup.children.forEach(function (menu) {
                                    menuSns[menu.sn] = enabled && menu.enabled;
                                });
                            }
                            if (menuGroup.sn === 'ops-management') {
                                opsManagementEnabled = enabled;
                            }
                        });
                    }
                    var platFuncs = response.plat_function_switch ? JSON.parse(response.plat_function_switch) : null;
                    appStoreProvider.setMenuSns($scope.role, menuSns, platFuncs);
                    $scope.$emit('$onMenuUpdate', !platFuncs || platFuncs.opsManagement, menuSns);
                    $scope.selectedApps = appStoreProvider.getSelectedApps();
                    $scope.$apply();
                }
            }
        });
    }
}]);

app.controller('SiteTreeCtrl', ['$scope', function ($scope) {
    $scope.showedTreeData = JSON.parse(JSON.stringify($scope.treeData));

    function setSearchKey(data) {
        if (data.is_group) {
            data.children.forEach(function (child) {
                setSearchKey(child);
            });
        } else {
            data.search_key = data.sn.toLowerCase() + ' ' + data.name.toLowerCase();
        }
    }

    $scope.showedTreeData.forEach(function(item){
        setSearchKey(item);
    });

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
            $scope.selectedSn = item.sn;
            ($scope.onSelect || angular.noop)(item);
            $scope.cancel();
        }
    };

    $scope.searchInputChange = function (input) {
        var value = input.value.toLowerCase().trim();
        $scope.showedTreeData.forEach(function (child) {
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

    $scope.cancel = function () {
        history.back();
    }
}]);

app.controller('SiteDetailCtrl', ['$scope', 'ajax', 'platformService', function ($scope, ajax, platformService) {
    $scope.sn = GetQueryString("sn");
    $scope.currentSite = {};
    $scope.isSiteDetail = true;

    $scope.getDataList = function () {
        ajax.get({
            url: "/stations/details",
            success: function(result) {
                $scope.isLoading = false;
                for (var i=0; i<result.length; i++) {
                    if (result[i].station.sn === $scope.sn) {
                        var s = result[i];
                        if (s.status === '') {
                            s.status = 'unknown';
                            s.status_name = '未知';
                        } else if (s.status === '1') {
                            if (s.unclosed_envet_amount > 0) {
                                s.status = 'abnormal';
                                s.status_name = '异常';
                            } else {
                                s.status = 'normal';
                                s.status_name = '正常';
                            }
                        } else {
                            s.status = 'offline';
                            s.status_name = '离线';
                        }
                        if (s.station.photo_src_link) {
                            s.site_image = platformService.getImageUrl(180, 180, platformService.getCloudHost() + s.station.photo_src_link);
                        }
                        else {
                            s.site_image = '/img/site-default.png';
                        }
                        $scope.currentSite = s;
                        break;
                    }
                }
                $scope.$apply();
            },
            error: function (a,b,c) {
                $scope.isLoading = false;
                $.notify.error('获取站点列表失败');
                console.log('get fail');
                $scope.$apply();
            }
        });
    };

    $scope.getDataList();
}]);

app.controller('SiteBaseInfoCtrl', ['$scope', 'ajax', 'platformService', function ($scope, ajax, platformService) {      //  站点基本信息
    var sn = $scope.sn;
    $scope.baseLoading = true;
    $scope.unhandledEventCount = 0;
    $scope.getDataList = function(cb) {
        ajax.get({
            url: '/stations/' + sn,
            success: function (data) {
                $scope.baseLoading = false;
                data.address = (data.address_province?data.address_province:'') + (data.address_city?data.address_city:'')
                    + (data.address_district?data.address_district:'') + data.address;
                // 站点图片
                var width = window.screen.width*3, height=Math.round(width/2);
                if (data.photo_src_link) {
                    data.site_image = platformService.getImageUrl(width, height, platformService.getCloudHost() + data.photo_src_link);
                }
                else {
                    data.site_image = '/img/background/site-default.jpeg';
                }
                $scope.currentSite.station = data;
                getUnhandledEventCount(data);
                $scope.$apply();
            },
            error: function () {
                $scope.baseLoading = false;
                $.notify.error('获取站点信息失败');
            }
        });
    };

    function getUnhandledEventCount(site) {
        ajax.get({
            url: '/stations/events',
            data: {
                stationSn: site.sn,
                status: 1
            },
            success: function (data) {
                $scope.unhandledEventCount = data.length;
                $scope.$apply();
            }
        });
    }

    function drawMap(data) {
        var map = new BMap.Map("map");          // 创建地图实例
        var point = new BMap.Point(data.longitude, data.latitude);
        map.centerAndZoom(point, 15);
        map.enableScrollWheelZoom();
       // 添加标注
       var marker = new BMap.Marker(point);
       var mgr = new BMapLib.MarkerManager(map,{
           maxZoom: 15,
           trackMarkers: true
       });
       mgr.addMarker(marker,1, 15);
       mgr.showMarkers();
       // 添加标注 end
    }

    $scope.getDataList();
}]);


app.controller('EventListCtrl', ['$scope', 'scrollerService', 'userService', 'ajax', 'appStoreProvider', function ($scope, scrollerService, userService, ajax, appStoreProvider) {
    $scope.sn = GetQueryString('sn');
    var checked = GetQueryString('status') === '0' ? 0 : 1;
    $scope.isDevice = false;   // 是设备还是站点
    $scope.canCreateTask = userService.getUserRole() === UserRole.Normal ? false : true;

    $scope.hasOpsAuth = appStoreProvider.hasOpsAuth();

    var deviceSn = GetQueryString("deviceSn");
    if (deviceSn){
        $scope.isDevice = true;
        $scope.sn = deviceSn;
    }

    $scope.events = [];
    $scope.eventLoading = false;
    $scope.loadingFailed = false;
    $scope.unhandledEventCount = 0;

    $scope.getDataList = function(cb) {
        function formatTime(d) {
            return d.substring(0, 10) + ' ' + d.substring(11, 19);
        }
        var url = "/stations/events_with_page";
        var params = {
            page_start:0,
            page_len: 500,
            secho: 1,
            status: checked
        };
        if ($scope.isDevice){
            params.deviceSn = $scope.sn;
        } else {
            params.stationSn = $scope.sn;
        }
        $scope.loadingFailed = false;
        $scope.eventLoading = true;
        ajax.get({
            url: url,
            data: params,
            cache: false,
            success: function(result) {
                $scope.eventLoading = false;
                var cleared = [], newReports=[];
                var events = result.aaData;
                for (var i in events) {
                    events[i].report_time = formatTime(events[i].report_time);
                    if (events[i].closed_time) {
                        events[i].closed_time = formatTime(events[i].closed_time);
                    }
                    var statusName = events[i].status_name;
                    if (statusName !== '告警消除' && statusName !== 'CLEARED') {
                        $scope.unhandledEventCount += 1;
                        newReports.push(events[i]);
                    } else {
                        cleared.push(events[i]);
                    }
                    if (statusName === 'CLEARED') {
                        events[i].status_name = '已确认';
                    } else if (statusName === '告警消除') {
                        events[i].status_name = '自动恢复';
                    }
                }
                $scope.events = newReports.concat(cleared);
                cb && cb($scope.events);
                scrollerService.initScroll("#events", $scope.getDataList);
                $scope.$apply();
            },
            error: function (a,b,c) {
                $scope.eventLoading = false;
                $scope.loadingFailed = true;
                // $.notify.error('获取事件列表失败');
                $scope.$apply();
                console.log('get var VarRealtimeDatas fail');
            }
        });
    };

    $scope.getDataList();

    $scope.postCheckEventAction = function($event, eventId) {
        console.log("To check event: " + eventId);
        var data = {"status": 0};
        var url = "/events/" + eventId;
        ajax.put({
            url: url,
            data: JSON.stringify(data),
            contentType:"application/json",
            headers: {
                Accept: "application/json"
            },
            success: function (data) {
                $.notify.progressStop();
                $.notify.info("事件已确认", 800);
                // 将已确认的事件从列表中删除
                for (var i=0; i<$scope.events.length; i++) {
                    if ($scope.events[i].id === data.id) {
                        $scope.events.splice(i, 1);
                        break;
                    }
                }
                // 确认事件后，需要在首页更新事件信息
                window.android && window.android.onJsCallbackForPrevPage('eventHandled', '');
                $scope.$apply();
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error('确认时发生异常');
            }
        });
    };

    $scope.goToCreateTaskHtml = function($event, eventObj) {
        window.location.href = '/templates/task/add-task.html?eventId=' + eventObj.id + '&station_sn=' + eventObj.station_sn;
    };
}]);


app.controller('SiteDocsCtrl', ['$scope', 'ajax', 'platformService', function ($scope, ajax, platformService) {
    var sn = GetQueryString('sn'), host = platformService.getCloudHost();
    $scope.docList = [];
    $scope.docLoading = false;
    $scope.loadingFailed = false;
    $scope.groups = [];
    $scope.currentImage = null;

    $scope.getDataList = function () {
        $scope.docLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: "/stations/" + sn + "/electronic_file_groups",
            cache: false,
            success: function(result) {
                $scope.docLoading = false;
                $scope.groups = result;
                for (var i=0; i<$scope.groups.length; i++){
                    getDocListOfGroup(i, $scope.groups[i]);
                }
            },
            error: function (a,b,c) {
                $scope.docLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
                console.log('get electric files fail');
            }
        });
    };

    function getDocListOfGroup(index, group) {
        ajax.get({
            url: "/electronic_file_groups/" + group.id + "/files",
            cache: false,
            success: function(result) {
                for(var i=0; i<result.length; i++){
                    formatDoc(result[i]);
                }
                $scope.groups[index].docs = result;
                $scope.$apply();
            },
            error: function (a,b,c) {
                $scope.docLoading = false;
                $.notify.error('获取电子档案失败');
                $scope.$apply();
                console.log('get electric files fail');
            }
        });
    }

    function formatDoc(doc) {
        var icon = 'icon-unknown-file';
        switch (doc.file_type){
            case 'txt':
                icon = 'icon-txt';
                break;
            case 'doc':
            case 'docx':
                icon = 'icon-doc';
                break;
            case 'pdf':
                icon = 'icon-pdf';
                break;
            case 'rar':
            case 'zip':
                icon = 'icon-rar';
                break;
            case 'dwg':
                icon = 'icon-dwg';
                break;
            case 'csv':
                icon = 'icon-csv';
                break;
            case 'png':
            case 'jpg':
            case 'bmp':
                icon = null;
                doc['isImage'] = true;
                break;
        }
        doc['icon'] = icon;
        doc['create_time'] = doc.create_time.substring(0, 10) + ' ' + doc.create_time.substring(11, 19);
        return doc;
    }

    $scope.open = function (doc) {
        function hide() {
            $("#slides").hide();
            window.removeEventListener("popstate", hide);
        }
        if (doc.isImage){
            $scope.currentImage = host + doc.src_link;
            $("#slides").show().on('click', function () {
                $("#slides").off('click');
                history.back();
            });
            history.pushState('dialog', 'dialog', null);
            window.addEventListener("popstate", hide);
        }else {
            if (window.android){
                window.android.openFile(host + doc.src_link);
            }else
            {
                window.location.href = host + doc.src_link;
            }
        }
    };

    $scope.getDataList();
}]);


app.controller('SiteReportsCtrl', ['$scope', 'ajax', 'routerService', 'platformService', function ($scope, ajax, routerService, platformService) {
    var stationSn = GetQueryString('sn');
    $scope.reports = [];
    $scope.isLoading = false;
    $scope.loadingFailed = false;

    $scope.getDataList = function () {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: '/stations/' + stationSn + '/reports',
            success: function (data) {
                $scope.isLoading = false;
                var outputs = [];
                data.forEach(function (d) {
                    if (d.output_src_link) {
                        d.output_src_link = platformService.getCloudHost() + d.output_src_link;
                        outputs.push(d);
                    }
                });
                $scope.reports = outputs;
                $scope.$apply();
            },
            error: function () {
                $scope.isLoading = false;
                $scope.loadingFailed = true;
                $scope.$apply();
            }
        })
    };

    $scope.download = function ($event, link) {
        $event.stopPropagation();
        // if (window.android && window.android.saveImageToGallery) {
        //     window.android.saveImageToGallery(link);
        // }
        if (window.android){
            window.android.openFile(link);
        }else
        {
            window.location.href =link;
        }
    };

    $scope.openReport = function (name, link) {
        // routerService.openPage($scope, '/templates/base-image-zoom.html', {link: link, name: name});
        window.open('/components/pdfjs/web/viewer.html?file=' + link, '_self', 'width:100%;height:100%;top:0;left:0;');
    };

    $scope.getDataList();
}]);