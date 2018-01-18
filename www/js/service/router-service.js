"use strict";

app.service('routerService', function ($timeout, $compile) {
    var pages = [], pageLength=0, currentIndex=0;
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
                addNewHistory = false;
            }else{
                pages.push(data);
                pageLength += 1;
                currentIndex = pageLength - 1;
            }
            element.removeClass('ng-enter');
            if (config.hidePrev)        // 如果配置
            {
                element.prevAll('div').hide();
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
        var html = '<route-page template=' + templateUrl;
        this._setNextPage(params, config);
        html += '></route-page>';
        var compileFn = $compile(html);
        var $dom = compileFn(scope);
        // 添加到文档中
        $dom.appendTo('body');
    };

    this._setNextPage = function (params, config) {
        config = $.extend({}, {
            hidePrev: true,      // 默认打开新页面时会隐藏前一页
            addHistory: true    // 是否加到history中
        }, config);
        nextPage = {
            params: params,
            config: config
        };
    };

    this.getNextPage = function () {
        return nextPage;
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
        scope: true     // scope隔离
        /*
        compile: function(element, attributes) {
            return {
                pre: function preLink(scope, element, attributes) {
                    // scope.sn = attributes.sn;
                },
                post: function postLink(scope, element, attributes) {
                    // element.prevAll().hide();
                }
            };
        }*/
    };
}]);