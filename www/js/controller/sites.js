"use strict";

/**
 * Created by liucaiyun on 2017/7/28.
 */

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

app.controller('SiteListCtrl', function ($scope, $http, $state, userService, ajax, platformService, routerService, appStoreProvider) {
    $scope.role = userService.getUserRole();
    $scope.selectedApps = [];

    $scope.openAppPage = function (app) {
        routerService.openPage($scope, app.templateUrl, {
            sn: $scope.currentSite.sn,
            name: $scope.currentSite.name
        });
    };

    $scope.gotoAppStore = function () {
        routerService.openPage($scope, '/templates/app-store/app-store.html');
    };

    $scope.openMap = function () {
        // location.href='/templates/map.html?name=' + $scope.currentSite.name + '&stationSn=' + $scope.currentSite.sn;
        routerService.openPage($scope, '/templates/map.html', {
            stationName: $scope.currentSite.name,
            stationSn: $scope.currentSite.sn
        });
    };

    $scope.openEventListPage = function () {
        routerService.openPage($scope, '/templates/site/event-list.html', {
            sn: $scope.currentSite.sn
        });
    };

    var appUpdateListener = $scope.$on('onNotifyAppUpdate', function (event) {
        $scope.selectedApps = appStoreProvider.getSelectedApps();
    });

    var eventCountRefreshListener = $scope.$on('onEventCountRefresh', function ($event, stationSn, eventCount) {      // 事件确认通知
        for (var i=0; i<$scope.sites.length; i++) {
            var s = $scope.sites[i];
            if (s.sn === stationSn) {
                s.unclosed_envet_amount = eventCount;
                s.events_amount = s.unclosed_envet_amount > 99 ? '99+' : s.unclosed_envet_amount;
                break;
            }
        }
    });

    function getMenuDataOfStation() {
        ajax.get({
            url: '/station/' + $scope.currentSite.sn + '/menudata',
            success: function (response) {
                if (response) {
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
                        });
                    }
                    var platFuncs = response.plat_function_switch ? JSON.parse(response.plat_function_switch) : null;
                    appStoreProvider.setMenuSns(menuSns, platFuncs, $scope.role);
                    $scope.$emit('$onMenuUpdate', !platFuncs || platFuncs.opsManagement, menuSns);
                    $scope.selectedApps = appStoreProvider.getSelectedApps();
                    $scope.$apply();
                }
            }
        });
    }

    $scope.$on('onSiteChange', function (event, station) {
        getMenuDataOfStation();
    });

    $scope.$on('$destroy', function (event) {
        appUpdateListener();
        appUpdateListener = null;
        eventCountRefreshListener();
        eventCountRefreshListener = null;
    });

    $scope.$on('onChooseNav', function (event, tabName) {       // 点击菜单事件
        if (tabName === 'sites') {      // 点击"站点监控"菜单，刷新当前站点状态
            if ($scope.currentSite.sn) {
                $scope.refreshStationStatus($scope.currentSite.sn);
            }
        }
    });
});


app.controller('SiteTreeCtrl', function ($scope, $stateParams) {
    // $scope.onSelect = $stateParams.onSelect;
    // $scope.selectedSn = $stateParams.selectedSn;
    $scope.searchText = '';
    $scope.data = JSON.parse(JSON.stringify($scope.sitesTree));
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

    $scope.searchInputChange = function () {
        var value = $scope.searchText.toLowerCase().trim();
        $scope.data.forEach(function (child) {
            search(child, value);
        });
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
});

app.controller('SiteDetailCtrl', function ($scope, $location, $stateParams, routerService) {
    $scope.sn = GetQueryString('sn');
    $scope.name = GetQueryString("name");
    $scope.siteData = null;
});

app.controller('SiteBaseInfoCtrl', function ($scope, $timeout, $stateParams, ajax, platformService) {      //  站点基本信息
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
                    data.site_image = 'img/site-default.png';
                }
                $scope.siteData = data;
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
});

app.controller('EventListCtrl', function ($scope, scrollerService, userService, ajax, routerService, appStoreProvider) {
    $scope.sn = $scope.sn;
    $scope.isDevice = false;   // 是设备还是站点
    $scope.canCreateTask = userService.getUserRole() === UserRole.Normal ? false : true;
    $scope.hasOpsAuth = appStoreProvider.hasOpsAuth();
    var totalEventCount = 0;
    var deviceSn = GetQueryString("deviceSn");
    if (deviceSn){
        $scope.isDevice = true;
        $scope.sn = deviceSn;
    }

    $scope.events = [];
    $scope.eventLoading = true;
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
            status: $scope.status === undefined ? 1 : $scope.status,
            starttime: moment().subtract(3, 'months').format('YYYY-MM-DDTHH:mm:ss.000') + 'Z',
            endtime: moment().format('YYYY-MM-DDTHH:mm:ss.000') + 'Z'
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
                totalEventCount = result.iTotalRecords;
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

    setTimeout($scope.getDataList, 500);

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
                $.notify.info("事件已确认");
                // 将已确认的事件从列表中删除
                var oldIndex = 0;
                for (var i=0; i<$scope.events.length; i++) {
                    if ($scope.events[i].id === data.id) {
                        $scope.events.splice(i, 1);
                        break;
                    }
                }
                // 通知首页数据修改站的事件个数
                totalEventCount -= 1;
                $scope.$emit('onEventCountRefresh', $scope.sn, totalEventCount);
                $scope.$apply();
            },
            error: function (data) {
                $.notify.progressStop();
                console.log('post action fail');
                $.notify.error('确认时发生异常');
            }
        });
    };

    $scope.goToCreateTaskHtml = function($event, eventId, eventInfo) {
        // window.location.href = '/templates/task/add-task.html?eventId=' + eventId + '&eventInfo=' + eventInfo;
        routerService.openPage($scope, '/templates/task/add-task.html', {linkEventId: eventId, linkEventInfo: eventInfo});
    };

    $scope.openEventHistory = function () {
        routerService.openPage($scope, '/templates/site/closed-event-list.html', {
            sn: $scope.sn,
            status: 0
        });
    };

    $scope.gotoEventListPage = function () {
        routerService.openPage($scope, '/templates/site/event-list.html', {
            sn: $scope.sn
        });
    }
});


app.controller('SiteDocsCtrl', function ($scope, routerService, platformService, ajax, cordovaService) {
    var sn = $scope.sn, host = platformService.getCloudHost();
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
                icon = 'icon-doc-picture'
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
        var url = host+doc.src_link;
        if (doc.isImage){
            $scope.currentImage = url;
            routerService.openPage($scope, '/templates/base-gallery.html', {
                images: [$scope.currentImage],
                index: 0
            });
        } else {
            if (window.android){
                window.android.openFile(url);
            } else if (cordova && cordova.InAppBrowser) {
                cordova.InAppBrowser.open(url, '_blank', 'location=false', {
                    hidden: 'yes',
                    enableViewportScale: 'yes',
                    zoom: 'yes'
                });
            } else
            {
                window.open(url, '_blank', 'location=no,enableViewportScale=yes,zoom=yes');
            }
        }
    };

    $scope.getDataList();
});


app.controller('SiteReportsCtrl', function ($scope, $state,ajax, scrollerService, routerService, platformService) {
    var stationSn = $scope.sn;
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
        if (window.android && window.android.saveImageToGallery) {
            window.android.saveImageToGallery(link);
        }
    };

    $scope.openReport = function (name, link) {
        // routerService.openPage($scope, '/pdf-viewer/viewer.html?file=' + link, '_self', 'width:100%;height:100%;top:0;left:0;');
        routerService.openPage($scope, '/pdf-viewer/pdf-container.html', {
            url: link,
        });
    };

    $scope.getDataList();
});