"use strict";

/**
 * @param scope  调用该接口的scope
 * @param templateUrl  页面链接
 * @param dataParam    页面使用的数据参数，在打开的页面中使用$scope调用
 * @param config       调用时可配置的参数
 *              1）finish: 打开新页面时是否删除上一页，default: false
 *              2）hidePrev：打开新页面时是否隐藏上一页，default: true
 *              3）addHistory: 新页面是否可使用返回键关闭，default：true
 */
app.service('routerService', function ($timeout, $compile) {
    var pages = [], pageLength=0, currentIndex=0, scopeList=[];
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
        scopeList.splice(scopeList.length-1, 1);
        pageLength -= 1;
        currentIndex = pageLength - 1;
        element[0].addEventListener('webkitAnimationEnd', _animateEnd);
        function _animateEnd() {
            element.remove();
        }
    });

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
                scopeList[currentIndex] = data.scope;
                addNewHistory = false;
            }else{
                pages.push(data);
                scopeList.push(data.scope);
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
                history.pushState(null, null, null);
            }
            element[0].removeEventListener('webkitAnimationEnd', _animationEnd);
        }
        element[0].addEventListener('webkitAnimationEnd', _animationEnd);
    };

    this.openPage = function (scope, templateUrl, params, config) {
        if (templateUrl.startsWith('/')) {
            templateUrl = templateUrl.substring(1);
        }
        var html = "<route-page template=" + templateUrl;
        this._setNextPage(templateUrl, params, config);
        html += '></route-page>';
        var compileFn = $compile(html);
        var $dom = compileFn(scope);
        // 首次打开时将页面加到body中，其他时候打开时将页面加到上一级的文档中。 如果设置了config.finish=true，那么将页面加到上上级文档中
        // if (scopeList.length && (!config || !config.finish)) {
        //     $dom.appendTo(scopeList[scopeList.length-1].domEle);
        // } else if (scopeList.length > 1 && config.finish) {
        //     $dom.appendTo(scopeList[scopeList.length-2].domEle);
        // } else {
        //     $dom.appendTo($('body'));
        // }
        $dom.appendTo($('body'));
    };

    this._setNextPage = function (templateUrl, params, config) {
        config = $.extend({}, {
            hidePrev: true,      // 默认打开新页面时会隐藏前一页
            addHistory: true,    // 是否加到history中
            finish: false
        }, config);
        nextPage = {
            templateUrl: templateUrl,
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
            if (config.addHistory)
            {
                routerService.addHistory($scope, $element);
            }
        },
        templateUrl: function (ele, attr) {
            return attr.template;
        },
        scope: true,     // scope隔离,
        link: function (scope, element, attrs) {
            scope.domEle = element;
        }

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
        },
        link: function (scope, element, attrs) {
            scope.domEle = element;
        }
    };
}]);