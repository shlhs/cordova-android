"use strict";


app.service('routerService', function ($timeout, $compile) {
    var pages = [],         // 当前的所有页面
        pageLength=0,       // 当前页面的个数
        currentIndex=0;     // 当前页面索引值
    var nextPage = {};      // 保存下一个页面的数据
    window.addEventListener('popstate', function () {
        if (!pageLength){
            return;
        }
        // 显示前一个页面
        if (pageLength>1){
            pages[pageLength - 2].ele.show();
        }else{
            pages[0].ele.prevAll().show();
        }
        var item = pages[currentIndex], element=item.ele;
        element.addClass('ng-leave');
        item.scope.$broadcast('$destroy');
        pages.splice(pageLength-1, 1);
        pageLength -= 1;
        currentIndex = pageLength - 1;
        element[0].addEventListener('webkitAnimationEnd', _animateEnd);
        function _animateEnd() {
            element.nextAll('.mui-poppicker,.mui-dtpicker').remove();  // 创建任务页面会在所有元素后面默认生成几个mui-poppicker元素，需要一起删除
            element.remove();
        }
    });

    this.finishPage = function () {
        pages[currentIndex].ele.remove();
        pages.splice(currentIndex, 1);
    };

    this.addHistory = function (scope, element) {
        var pageData = this.getNextPage();
        var config = pageData.config;
        var data = {
            ele: element,
            scope: scope,
            config: config
        };
        var toFinishPage = null, addNewHistory=true;
        element.addClass('ng-enter');

        function _animationEnd(event) {

            if (config && config.finish){   // 打开这个页面时，需要关闭前一个页面
                toFinishPage = pages[currentIndex].ele;
                pages[currentIndex] = data;
                addNewHistory = false;
            }else{
                pages.push(data);
                pageLength += 1;
                currentIndex = pageLength - 1;
            }
            element.removeClass('ng-enter');
            if (config.hidePrev)        // 如果配置
            {
                element.prevAll().hide();
            }

            if (toFinishPage){
                toFinishPage.remove();
            }
            if (addNewHistory){
                history.pushState('routerpage', null, null);
            }
            element[0].removeEventListener('webkitAnimationEnd', _animationEnd);
        }
        element[0].addEventListener('webkitAnimationEnd', _animationEnd);
    };

    this.openPage = function (scope, templateUrl, params, config) {
        var html = "<route-page template=" + templateUrl;
        this._setNextPage(params, config);
        html += '></route-page>';
        var compileFn = $compile(html);
        var $dom = compileFn(scope);
        // 添加到文档中
        $dom.appendTo($('body'));
    };

    this._setNextPage = function (params, config) {
        config = $.extend({}, {
            hidePrev: true,      // 默认打开新页面时会隐藏前一页
            addHistory: true,    // 是否加到history中
            finishPage: false    // 是否结束前一个页面
        }, config);
        nextPage = {
            params: params,
            config: config
        };
    };

    this.getNextPage = function () {
        return nextPage;
    };

    this.hasNoHistory = function () {       // 当前是否已经是第一集页面
        if (pageLength === 0) {
            return true;
        } else {
            return false;
        }
    };
});

app.directive('routePage', ['$log', 'routerService', function($log, routerService){
    return {
        restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
        // templateUrl: '/templates/site/site-detail.html',
        replace: true,
        controller: function($scope, $element){
            var pageData = routerService.getNextPage();
            var params = pageData.params, config=pageData.config;
            if (params){
                for (var key in params){
                    $scope[key] = params[key];
                }
            }
            if (config.finishPage) {
                // 如果设置结束前一个页面，那么打开新页面后，前一个页面会被删除
                routerService.finishPage();
            }
            else if (config.addHistory)
            {
                routerService.addHistory($scope, $element);
            }
        },
        templateUrl: function (ele, attr) {
            return attr.template;
        },
        scope: true     // scope隔离

        // compile: function(element, attributes) {
        //     return {
        //         pre: function preLink(scope, element, attributes) {
        //             scope.sn = attributes.sn;
        //         },
        //         post: function postLink(scope, element, attributes) {
        //             element.prevAll().hide();
        //         }
        //     };
        // }
    };
}]);

app.directive('rootPage', ['$log', 'routerService', function($log, routerService){
    return {
        restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
        replace: true,
        templateUrl: function (ele, attr) {
            return attr.template;
        },
        scope: true,     // scope隔离
        controller: function ($scope, $element) {
            var search = window.location.search.substring(1), params = search.split('&');
            var index, param;
            for (var i=0; i<params.length; i++){
                param = params[i];
                index = param.indexOf('=');
                var key = param.substring(0, index), value = param.substring(index+1);
                if (key !== 'template') {
                    $scope[key] = decodeURIComponent(value);
                }
            }
        }
    };
}]);