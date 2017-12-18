//图片上传
var file = {
    upload: function (e) {
        var self = this;
        var files = e.target.files;
        var type = files[0].type.split('/')[0];
        if (type != 'image') {
            alertMsg('请上传图片');
            return;
        }
        //var size = Math.floor(file.size / 1024 / 1024);
        //if (size > 3) {
        //  alert('图片大小不得超过3M');
        //  return;
        //};
        for (var i = 0; i < files.length; i++) {
            var reader = new FileReader();
            reader.readAsDataURL(files[i]);
            reader.onloadstart = function () {
                //用以在上传前加入一些事件或效果，如载入中...的动画效果
            };
            reader.onloadend = function (e) {
                var imageSrc = '<li class="image-item"><div class="content"><div class="img-file" style="background-image: url(#background)"></div></div></li>';
                var dataURL = this.result;
                imageSrc = imageSrc.replace("#background", dataURL);
                // $(imageSrc).insertBefore($("#imageList .upload-item"));
                /*
                var imaged = new Image();
                imaged.src = dataURL;
                imaged.onload = function () {  //利用canvas对图片进行压缩
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    var w = 0;
                    var h = 0;
                    if (this.width > this.height) {
                        h = 1000;
                        var scale = this.width / this.height;
                        h = h > this.height ? this.height : h;
                        w = h * scale;
                    }
                    else {
                        w = 1000;
                        var scale = this.width / this.height;
                        w = w > this.width ? this.width : w,
                        h = w / scale;
                    }
                    var anw = document.createAttribute("width");
                    var anh = document.createAttribute("height");
                    if (this.width > this.height) {
                        anw.value = h;
                        anh.value = w;
                    }
                    else {
                        anw.value = w;
                        anh.value = h;
                    }
                    canvas.setAttributeNode(anw);
                    canvas.setAttributeNode(anh);
                    if (this.width > this.height) {
                        ctx.translate(h, 0);
                        ctx.rotate(90 * Math.PI / 180)
                        ctx.drawImage(this, 0, 0, w, h);
                        ctx.restore();
                    }
                    else {
                        ctx.drawImage(this, 0, 0, w, h);
                    }
                    dataURL = canvas.toDataURL('image/jpeg');
                    //回调函数用以向数据库提交数据
                    //self.callback(dataURL);

                };*/
            };
        }
    },
    event: function () {
        $("#upload").change(function (e) {
            file.upload(e);
        });
    },
    callback: function (dataURL) {
        $.ajaxSettings.async = false;  //这里必须将ajax的异步改为同步才可以把返回并保存在隐藏域中的图片地址取出同时加在地址栏中作为参数一并传入下一个页面，这样做的目的是因为返回的图片地址不是一个json数组，而是单个的json字符串，所以只能将返回的图片地址json字符串拼接在一起作为参数传到下一个页面
        $.post(url, dataURL, function (res) {  //将base64图片流的图片通过后台转换成普通的图片路径并上传至服务器
            var imgUrl = $("#hiddenImgUrl").val();
            if (res.success) {
                $(".loading").hide();
                if (imgUrl != "") {
                    $("#hiddenImgUrl").val(imgUrl + "|" + res.imgUrl);  //中间加一个 | 是为了到下一个页面便于将传过去的图片地址参数转换为数组
                } else {
                    $("#hiddenImgUrl").val(res.imgUrl);
                }
                var imgUrl = $("#hiddenImgUrl").val();
                window.location.href = "apply.html?imgUrl=" + imgUrl;
            } else {
                alert(res.message);
            }
        }, "json");
    },
    init: function () {
        this.event();
    }
};
//file.init();