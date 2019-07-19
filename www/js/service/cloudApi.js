app.service('cloudApi', function (ajax) {

    this.getOpsCompanyMembers = function (companyId, callback) {
        ajax.get({
            url: '/opscompanies/' + companyId + '/members',
            success: function (result) {
                if (callback) {
                    callback(result);
                }
            },
            error: function () {
                callback(null);
            }
        });
    };

    this.getTasksOfStations = function (stationSns, taskTypes, callback) {
        ajax.get({
            url: '/opstasks?' + stationSns.join(',') + '&task_type=' + taskTypes.join(','),
            data: {
                station: stationSns.join(','),
                task_type: taskTypes.join(','),
                page_size: 100,
                page_index: 0,
                s_echo: 0
            },
            success: function (data) {
                callback(data);
            }
        });
    };

    this.getTaskTodo = function () {

    }
});