"use strict";

/**
 * Created by liucaiyun on 2017/7/28.
 */


app.controller('SiteListCtrl', function ($scope, $http, scrollerService, ajax) {
    $scope.sites = [];
    $scope.isLoading = true;

    $scope.getDataList = function () {
        ajax.get({
            url: "/stations/details",
            success: function(result) {
                $scope.isLoading = false;
                $scope.sites = result;
                $scope.$apply();
                scrollerService.initScroll('#sites', $scope.getDataList);
            },
            error: function (a,b,c) {
                $scope.isLoading = false;
                $.notify.error('获取站点列表失败');
                console.log('get fail');
                $scope.$apply();
            }
        });
    };

    // if (!$scope.permission.taskView){
    //     $scope.getDataList();
    // }

    $scope.gotoSite = function (sn, name) {
        location.href = '/templates/site/site-detail.html?sn=' + sn + '&name=' + name;
    };
});

app.controller('SiteDetailCtrl', function ($scope, $location, $stateParams) {
    $scope.sn = GetQueryString('sn');
    $scope.name = GetQueryString("name");
    $scope.siteData = null;
});

app.controller('SiteBaseInfoCtrl', function ($scope, $timeout, $stateParams, ajax) {      //  站点基本信息
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


app.controller('EventListCtrl', function ($scope, $stateParams, scrollerService, ajax) {
    $scope.sn = GetQueryString('sn');
    $scope.events = [];
    $scope.eventLoading = true;
    $scope.unhandledEventCount = 0;

    $scope.getDataList = function(cb) {
        function formatTime(d) {
            return d.substring(5, 10) + ' ' + d.substring(11, 19);
        }
        ajax.get({
            url: "/stations/" + $scope.sn + "/events",
            cache: false,
            success: function(result) {
                $scope.eventLoading = false;
                var cleared = [], newReports=[];
                for (var i in result){
                    result[i].update_time = formatTime(result[i].report_time);
                    if (result[i].status_name !== 'CLEARED'){
                        $scope.unhandledEventCount += 1;
                    }
                }
                result.sort(function (e1, e2) {
                    if (e1.status_name > e2.status_name){
                        return -1;
                    }
                    else if (e1.status_name < e2.status_name){
                        return 1;
                    }
                    return e1.report_time < e2.report_time;
                });
                $scope.events = result;
                cb && cb($scope.events);
                scrollerService.initScroll("#events", $scope.getDataList);
                $scope.$apply();
            },
            error: function (a,b,c) {
                $scope.eventLoading = false;
                $.notify.error('获取事件列表失败');
                $scope.$apply();
                console.log('get var VarRealtimeDatas fail');
            }
        });
    };

    $scope.getDataList();
});


app.controller('SiteDocsCtrl', function ($scope, $stateParams, platformService, ajax) {
    var sn = GetQueryString('sn'), host = platformService.getHost();
    $scope.docList = [];
    $scope.docLoading = true;
    $scope.groups = [];
    $scope.currentImage = null;

    function getDocGroups() {
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
                $.notify.error('获取电子档案失败');
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

    getDocGroups();
});