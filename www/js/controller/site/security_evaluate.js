
app.run(function ($animate, $rootScope, routerService) {

    $rootScope.openPage = function(template, params, config){       // 打开一个新页面
        if (template.indexOf('/') === 0){    // 在手机上template不能以/开头，否则会找不到模版
            template = template.substring(1);
        }
        routerService.openPage($scope, template, params, config);
    };
    $animate.enabled(true);
});

app.controller('SecurityEvaluateHome', function ($scope, ajax, $rootScope) {
    // 画进度
    function drawProgress(progress) {
        if (!progress) {    //
            $("#evaluateChart").circleChart({
                color: "#ffffff",
                backgroundColor: "#e6e6e6",
                widthRatio: 0.1, // 进度条宽度
                size: Math.round($("#evaluateChart").parent().parent().height()*0.8),
                value: 100,
                startAngle: 175,
                speed: 1,
                textSize: 36,
                relativeTextSize: 14,
                animation: "easeInOutCubic",
                text: 0,
                onDraw: function(el, circle) {
                    circle.text("0%"); // 根据value修改text
                }
            });
        } else {
            $("#evaluateChart").circleChart({
                widthRatio: 0.1, // 进度条宽度
                size: Math.round($("#evaluateChart").parent().height()*0.8),
                value: 100,
                startAngle: 175,
                speed: 2000,
                textSize: 36,
                relativeTextSize: 14,
                animation: "easeInOutCubic",
                text: 0,
                onDraw: function(el, circle) {
                    circle.text(Math.round(circle.value) + "%"); // 根据value修改text
                }
            });
        }
    }

    drawProgress(0);
});

app.controller('SecurityEvaluateDetail', function ($scope, ajax, $rootScope) {

})