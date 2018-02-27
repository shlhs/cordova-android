/**
 * Created by liucaiyun on 2017/7/23.
 */


app.factory('serviceFactory', function ($rootScope) {
    var services = {};
    services.login = function () {
        return host + '/login/';
    };
    return services;
});