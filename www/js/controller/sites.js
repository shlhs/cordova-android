"use strict";

/**
 * Created by liucaiyun on 2017/7/28.
 */


app.controller('SiteListCtrl', function ($scope, $http, scrollerService, ajax, platformService) {
    $scope.sites = [];
    $scope.currentSite = {};
    $scope.isLoading = true;
    $scope.popup_visible = false;

    $scope.getDataList = function () {
        scrollerService.initScroll('#sites', $scope.getDataList);
        ajax.get({
            url: "/stations/details",
            success: function(result) {
                $scope.isLoading = false;
                result.forEach(function (s) {
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
                        s.site_image = platformService.getImageUrl(180, 180, platformService.host + s.station.photo_src_link);
                    }
                    else {
                        s.site_image = '/img/site-default.png';
                    }
                });
                $scope.sites = result;
                getCurrentSite();
                $scope.isLoading = false;
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
    $scope.showPopover = function () {
        $scope.popup_visible=true;
    };
    $scope.closePopover = function () {
        $scope.popup_visible=false;
    };
    $scope.chooseSite = function (site) {
        $scope.currentSite = site;
        localStorage.setItem("currentSite", JSON.stringify(site));
        $scope.closePopover();d
    };

    function getCurrentSite() {
        var siteStr = localStorage.getItem("currentSite");
        if (siteStr){
            // 检查站点是否在当前站点中
            var site = JSON.parse(siteStr);
            for (var i=0; i<$scope.sites.length; i++) {
                if ($scope.sites[i].station.sn === site.station.sn) {
                    $scope.currentSite = $scope.sites[i];
                    return;
                }
            }
        }
        $scope.currentSite = $scope.sites[0];
        localStorage.setItem("currentSite", JSON.stringify($scope.currentSite));
    }

    $scope.gotoSite = function (sn, name) {
        location.href = '/templates/site/site-detail.html?sn=' + sn + '&name=' + name;
    };
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
                    data.site_image = platformService.getImageUrl(width, height, platformService.host + data.photo_src_link);
                }
                else {
                    data.site_image = '/img/background/site-default.png';
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


app.controller('EventListCtrl', function ($scope, $stateParams, scrollerService, ajax) {
    $scope.sn = GetQueryString('sn');
    $scope.isDevice = false;   // 是设备还是站点
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
        var url = "/stations/" + $scope.sn + "/events";
        if ($scope.isDevice){
            url = "/stations/events?deviceSn=" + $scope.sn;
        }
        $scope.loadingFailed = false;
        $scope.eventLoading = true;
        ajax.get({
            url: url,
            cache: false,
            success: function(result) {
                $scope.eventLoading = false;
                var cleared = [], newReports=[];
                for (var i in result) {
                    result[i].report_time = formatTime(result[i].report_time);
                    if (result[i].status_name !== 'CLEARED') {
                        $scope.unhandledEventCount += 1;
                        newReports.push(result[i]);
                    } else {
                        cleared.push(result[i]);
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
                $.notify.info("事件已确认");
                // 将已确认的事件移至后面
                var oldIndex = 0;
                for (var i=0; i<$scope.events.length; i++) {
                    if ($scope.events[i].id === data.id) {
                        $scope.events.splice(i, 1);
                        oldIndex = i > 0 ? i-1 :0;
                        break;
                    }
                }
                var inserted = false;
                for (var i=oldIndex; i<$scope.events.length; i++) {
                    if ($scope.events[i].status_name === 'CLEARED') {
                        // 插到前面
                        $scope.events.splice(i, 0, data);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) {
                    $scope.events.push(data);
                }
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
        window.location.href = '/templates/task/add-task.html?eventId=' + eventId + '&eventInfo=' + eventInfo;
    };
});


app.controller('SiteDocsCtrl', function ($scope, $stateParams, platformService, ajax) {
    var sn = GetQueryString('sn'), host = platformService.getHost();
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
});


app.controller('SiteReportsCtrl', function ($scope, ajax, scrollerService, routerService, platformService) {
    var stationSn = GetQueryString('sn');
    $scope.reports = [];
    $scope.isLoading = false;
    $scope.loadingFailed = false;

    $scope.getDataList = function () {
        $scope.isLoading = true;
        $scope.loadingFailed = false;
        ajax.get({
            url: '/stations/' + stationSn + '/reports1',
            success: function (data) {
                $scope.isLoading = false;
                var outputs = [];
                data.forEach(function (d) {
                    if (d.output_src_link) {
                        d.output_src_link = platformService.host + d.output_src_link;
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
        routerService.openPage($scope, '/templates/base-image-zoom.html', {link: link, name: name});
    };

    $scope.getDataList();
});