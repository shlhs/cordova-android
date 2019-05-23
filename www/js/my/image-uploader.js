/**
 * Created by l00164778 on 2016/11/8.
 */
var scrollTop = 0;
var jic = {
    /**
     * Receives an Image Object (can be JPG OR PNG) and returns a new Image Object compressed
     * @param {Image} source_img_obj The source Image Object
     * @param {Integer} quality The output quality of Image Object
     * @return {Image} result_image_obj The compressed Image Object
     */

    readFileAsDataURL: function (file, callback) {
        var a = new FileReader();
        a.onload = function(e) {
            callback(e.target.result);
        };
        a.readAsDataURL(file);
    },
    //对图片旋转处理 added by lzk www.bcty365.com
    _rotateImg: function (img, direction, canvas) {
        //alert(img);
        //最小与最大旋转方向，图片旋转4次后回到原方向
        var min_step = 0, max_step = 3;
        //var img = document.getElementById(pid);
        if (img === null)return;
        //img的高度和宽度不能在img元素隐藏后获取，否则会出错
        var originHeight = img.height, originWidth = img.width, width=originWidth, height=originHeight;
        if (originWidth > originHeight){
            if (originHeight > 2048){
                height = 2048;
                width = parseInt((height/originHeight) * originWidth);
            }
        }
        else {
            if (originWidth > 2048){
                width = 2048;
                height = parseInt(width/originWidth*originHeight);
            }
        }
        //var step = img.getAttribute('step');
        var step = 2;
        if (step === null) {
            step = min_step;
        }
        if (direction === 'right') {
            step++;
            //旋转到原位置，即超过最大值
            step > max_step && (step = min_step);
        } else {
            step--;
            step < min_step && (step = max_step);
        }
        //旋转角度以弧度值为参数
        var degree = step * 90 * Math.PI / 180, ctx = canvas.getContext('2d');
        switch (step) {
            case 0:
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0);
                break;
            case 1:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, 0, -height);
                break;
            case 2:
                canvas.width = width;
                canvas.height = height;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, -height);
                break;
            case 3:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, 0);
                break;
        }
    },
    compress: function(source_img_obj, quality, orientation){
        var that = this, mime_type = "image/jpeg", cvs = document.createElement('canvas');
        //naturalWidth真实图片的宽度
        var originWidth = source_img_obj.naturalWidth, originHeight = source_img_obj.naturalHeight, width=originWidth, height=originHeight;
        if (orientation && orientation !== 1){
            switch (orientation){
                case 6://需要顺时针（向左）90度旋转
                    that._rotateImg(source_img_obj,'left',cvs);
                    break;
                case 8://需要逆时针（向右）90度旋转
                    that._rotateImg(source_img_obj,'right',cvs);
                    break;
                case 3://需要180度旋转
                    that._rotateImg(source_img_obj,'right',cvs);//转两次
                    that._rotateImg(source_img_obj,'right',cvs);
                    break;
            }
        }else{
            if (originWidth > originHeight){
                if (originHeight > 2048){
                    height = 2048;
                    width = parseInt((height/originHeight) * originWidth);
                }
            }
            else {
                if (originWidth > 2048){
                    width = 2048;
                    height = parseInt(width/originWidth*originHeight);
                }
            }
            cvs.width = width;
            cvs.height = height;
            cvs.getContext("2d").drawImage(source_img_obj, 0, 0, originWidth, originHeight, 0, 0, width, height);
        }
        var newImageData = cvs.toDataURL(mime_type, quality/100), result_image_obj = new Image();
        result_image_obj.src = newImageData;
        return result_image_obj;
    },
    upload: function(basestr, type, $li, formArray, successCallback){
        var text = window.atob(basestr.split(",")[1]);
        var buffer = new ArrayBuffer(text.length);
        var ubuffer = new Uint8Array(buffer);
        var pecent = 0 , loop = null;

        for (var i = 0; i < text.length; i++) {
            ubuffer[i] = text.charCodeAt(i);
        }

        var Builder = window.WebKitBlobBuilder || window.MozBlobBuilder;
        var blob;

        if (Builder) {
            var builder = new Builder();
            builder.append(buffer);
            blob = builder.getBlob(type);
        } else {
            blob = new window.Blob([buffer], {type: type});
        }

        var xhr = new XMLHttpRequest();
        var formdata = new FormData();
        formdata.append('images', blob);
        $.each(formArray, function(i, n){
            formdata.append(n['name'], n['value']);
        });

        xhr.open('post', '/uploads');

        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                console.log('上传成功：');
                clearInterval(loop);
                //当收到该消息时上传完毕
                $li.find(".js_progress").animate({'width': "100%"}, pecent < 95 ? 200 : 0);
                successCallback && successCallback(xhr.responseText);
            }
        };

        //数据发送进度，前50%展示该进度
        xhr.upload.addEventListener('progress', function (e) {
            if (loop) return;
            //console.log('loaded: ' + e.loaded + ', total: ' + e.total);
            //pecent = ~~(100 * e.loaded / e.total) / 2;
            pecent = parseInt(e.loaded / e.total * 100);
            console.log(pecent);
            $li.find(".js_progress").css('width', pecent + "%");

            // if (pecent > 85) {
            //     mockProgress();
            // }
        }, false);

        //数据后90%用模拟进度
        function mockProgress() {
            if (loop) return;

            loop = setInterval(function () {
                pecent++;
                $li.find(".js_progress").css('width', pecent + "%");

                if (pecent == 99) {
                    clearInterval(loop);
                }
            }, 100)
        }

        xhr.send(formdata);
    }
}

$(function(){
    var postedImages = false;
    $("input[type=file]").on('change', function (event) {
        var $fileInput = $(this);
        postedImages = false;
        fileGroup = [];
        var years = [];
        for (var y=2016; y>=1996; y--){
            years.push(y);
        }
        $("body").children().addClass("hide");
        var templateName = "upload_dialog_template", addFunction=null;
        if (!IsPC()){

            templateName = "weixin/image_upload_template";
            var $modal = $(Handlebars.templates[templateName]({years: years})).appendTo($('body')).show();
            limit_input_check();
            var $uploaderFiles = $("#uploaderFiles"),
                $gallery = $("#gallery"), $galleryImg = $("#galleryImg"),
                $uploaderFiles = $("#uploaderFiles"), $deleteBtn=$(".weui-icon-delete");

            $uploaderFiles.on("click", "span", function(){    // 点击放大
                $galleryImg.attr("style", this.getAttribute("style")).attr("filename", this.parentNode.getAttribute("filename"));
                $gallery.fadeIn(100);
                openNewPagePushHistory('viewGallery', function(){
                    $gallery.fadeOut(100);
                });
            });
            $gallery.on("click", function(){        // 点击大图缩小
                history.back();
            });
            $deleteBtn.on("click", function(){      // 删除当前大图
                var filename = $galleryImg.attr("filename"),
                    $wrapper = $modal.find("div[filename='"+filename+"']");
                removeFile($wrapper.index());
                $wrapper.remove();
            });
            addFunction = addToDialogForMobile;
        }else{
            var $modal = $(Handlebars.templates[templateName]({years: years})).appendTo($('body')).show();
            limit_input_check();
            addFunction = addToDialog;
        }

        $modal.find('[role="cancel"]').on('click', function(){
            history.back();
        });
        $modal.find('input[type=file]').on('change', function(event){
            addFunction(event, $modal);
            $(this).val('');
        });
        $modal.find('[role="save"]').on('click', function(){    // 点击保存，上传图片并保存数据到后台
            var $form = $modal.find('form:first');
            if ($modal.find('#uploaderFiles img').length ==0){
                return;
            }
            if (checkform($form))
            {
                saveAllFileToImages($form);
            }
        });
        addFunction(event, $modal);
    });
    function addToDialogForMobile(e, dialog){
        var src, url = window.URL || window.webkitURL || window.mozURL || window, files = e.target.files;
        var tmpl ='<div class="container">' +
                '<span class="weui-uploader__file" style="background-image:url(#url#)"></span><img style="display: none;" style="background-image:url(#url#);">' +
                '<div class="weui-progress__bar"><div class="weui-progress__inner-bar js_progress" style="width: 0%;"></div></div></div>',  //用span代替img，解决部分Android手机上无法显示缩略图的问题
            $uploaderFiles = $("#uploaderFiles");
        for (var i = 0, len = files.length; i < len; ++i) {
            var file = files[i];

            if (url) {
                src = url.createObjectURL(file);
            } else {
                src = e.target.result;
            }
            addFile(file, src);
            EXIF.getData(file, function () {
                var orientation = EXIF.getTag(this, 'Orientation'), rotate='rotate(0deg)';
                if (orientation && orientation != 1){  // 增加旋转
                    switch(orientation){
                        case 6: // 需要顺时针90度旋转
                            rotate = 'rotate(90deg)';
                            break;
                        case 8: // 需要逆时针90度旋转
                            rotate = 'rotate(-90deg)';
                            break;
                        case 3: // 需要180度旋转
                            rotate = 'rotate(180deg)';
                            break;
                    }
                }
                for (var j=0; j<fileGroup.length; j++){
                    var n = fileGroup[j];
                    if (n.file.name == this.name){
                        var $el = $(tmpl.replace(/#url#/g, n.src)).attr("filename", this.name);
                        $el.find('span').css('transform', rotate).css('-webkit-transform', rotate);
                        $el.appendTo($uploaderFiles);
                        n['orientation'] = orientation;
                        n['el'] = $el;
                        break;
                    }
                }
            });
        }
    }
    function addToDialog(e, dialog){
        var src, url = window.URL || window.webkitURL || window.mozURL, files = e.target.files;
        var tmpl = '<img class="materialboxed z-depth-2" style="padding-bottom: 100%;background-image:url(#url#);" filename="#filename#" title=""  photo_date="" photo_desc=""/><i class="icon close">close</i><i class="icon edit">edit</i><div class="weui-progress__bar"><div class="weui-progress__inner-bar js_progress" style="width: 0%;"></div></div>';
        var str="", $insertPosition = dialog.find('.image-group #add_more');
        for (var i = 0, len = files.length; i < len; ++i) {
            var file = files[i];
            if (url) {
                src = url.createObjectURL(file);
            } else {
                src = e.target.result;
            }
            str += tmpl.replace(/#url#/g, src).replace(/#filename#/, file.name);
            var $el = $(tmpl.replace('#url#', src).replace(/#filename#/, file.name)).insertBefore($insertPosition);
            addFile(file, src, $el);
            $el.find('.close').on('click', function(){     //  点击叉号，删除该图片
                $("#edit_panel").hide().empty();
                var $item = $(this).closest('.s4');
                removeFile($item.index());
                $item.remove();
            })
            $el.find('.edit,img').on('click', function(){     //  点击铅笔，编辑该图片
                var img = $(this).parent().find('img');
                var style = $(this).parent().find('img').attr('style');
                var filename = $(this).parent().find('img').attr('filename');
                var years = [];
                for (var y=2016; y>=1996; y--){
                    years.push(y);
                }
                $("#edit_panel").html(Handlebars.templates['desc_separate_single_photo_template']({'style': style, 'filename': filename, 'years': years, 'title': img.attr('title'), 'photo_date': img.attr('photo_date'), 'photo_desc': img.attr('photo_desc')}));
                $("#edit_panel").show();
                $("#edit_panel").find('.close').on('click', function () {  // 关闭编辑框
                    $("#edit_panel").hide().empty();
                });
                $("#edit_panel").find('.cancel').on('click', function () {   // 点击编辑区的取消，取消编辑内容
                    $("#edit_panel").hide().empty();
                })
                $("#edit_panel").find('.save').on('click', function () {   // 点击编辑区的保存，保存标题，年份，描述
                    var title =  $("#edit_panel").find('input[name=title]').val();
                    var photo_date =  $("#edit_panel").find('select[name=photo_date]').val();
                    var photo_desc =  $("#edit_panel").find('textarea[name=photo_desc]').val();
                    img.attr('title', title);
                    img.attr('photo_date', photo_date);
                    img.attr('photo_desc', photo_desc);
                    $("#edit_panel").hide().empty();
                });
            })
        }
    }
    var fileGroup = [], imageUploadedRecords=[];
    function addFile(file, src, $li, orientation){
        var d = {
            'file': file,
            'src': src,
            'el': $li,
            'orientation': orientation
        };
        fileGroup.push(d);
    }
    function removeFile(index){
        var data = fileGroup[index];
        var url = window.URL || window.webkitURL || window.mozURL || window;
        url.revokeObjectURL(data.src);
        fileGroup.splice(index, 1);
    }
    function readFileAsDataURL(file, callback) {
        var a = new FileReader();
        a.onload = function(e) {
            callback(e.target.result);
        };
        a.readAsDataURL(file);
    }

    function saveAllFileToImages($form){        // 保存所有图片文件到后台
        // 如果是手机端的话，显示loading提示
        $("#loadingToast").fadeIn(100);
        var array = $form.serializeArray(), length=fileGroup.length, index=0, file=fileGroup[index], url=window.URL || window.webkitURL || window.mozURL || window;
        imageUploadedRecords = [];
        if (!IsPC()){
            $("#loadingToast .weui-toast__content").html('正在上传（0/'+fileGroup.length+'）');
        }
        readFileAsDataURL(file.file, readFileCallback);

        function readFileCallback(){
            var $progress = file.el.find('.js_progress');
            $progress.css('width', '10%');
            var img = new Image();
            img.src = event.target.result;
            img.onload = function(){
                var quality =  75;
                var dataUrl = jic.compress(this, quality, file.orientation).src;
                //$(this).remove();
                $progress.css('width', '25%');
                if(file.el.find('img').attr('title') != undefined && file.el.find('img').attr('title') != ""){
                    var title = file.el.find('img').attr('title');
                    var photo_date = file.el.find('img').attr('photo_date');
                    var photo_desc = file.el.find('img').attr('photo_desc');
                    array = [];
                    array.push({'name': 'title', 'value': title});
                    array.push({'name': 'photo_date', 'value': photo_date});
                    array.push({'name': 'photo_desc', 'value': photo_desc});
                }
                jic.upload(dataUrl, file.file.type, file.el, array, oneImageUploadSucceedCallback);
                fileGroup[index++] = null;
                if (index < length){
                    file = fileGroup[index];
                    readFileAsDataURL(file.file, readFileCallback);
                }

            }
        }
        return false;
    }

    function checkform($form){
        var $necessary_inputs=$form.find("textarea[data-necessary='true'],input[data-necessary='true'],select[data-necessary='true']");
        var valid=true;
        $necessary_inputs.each(function(){
            if (this.value == ''){
                if (this.type=='text' || this.type == 'textarea'){
                    $('body').snackbar({
                        alive: 3000,
                        content: '请填写照片描述'
                    });
                    $(this).parent().addClass('control-focus');
                    valid = false;
                    return false;
                }
                else if(this.tagName=='SELECT' && this.value=='')
                {
                    $(this).parent().addClass('control-focus');
                    $('body').snackbar({
                        alive: 3000,
                        content: '请补全拍摄年份'
                    });
                    valid = false;
                    return false;
                }
            }
        });
        return valid;
    }

    function oneImageUploadSucceedCallback(data){
        imageUploadedRecords.push(JSON.parse(data));
        if (imageUploadedRecords.length == fileGroup.length){
            if (IsPC()){
                allUploadedSucceedCallback(imageUploadedRecords);
            }else{
                $("#loadingToast .weui-toast").html('<i class="weui-icon-success-no-circle weui-icon_toast"></i><p class="weui-toast__content">已发布</p>');
                setTimeout(function () {
                    $("#loadingToast").fadeOut(100);
                    allUploadedSucceedCallback(imageUploadedRecords);
                }, 1200);
            }
        }else{
            if (!IsPC()){
                $("#loadingToast .weui-toast__content").html('正在上传（'+imageUploadedRecords.length+'/'+fileGroup.length+'）');
            }
        }
    }

    function allUploadedSucceedCallback(allImagesData){      // 全部图片上传成功后的回调
        // 如果当前页是相册页，则将上传的图片插入到最前面
        //revoke created object url
        var url = window.URL || window.webkitURL || window.mozURL || window;
        $("#uploaderFiles img").each(function(){
            var backgroundImage=this.style.backgroundImage, start=backgroundImage.indexOf('('), end=backgroundImage.lastIndexOf(")");
            var imgUrl = backgroundImage.substring(start+2, end-1);
            url.revokeObjectURL(imgUrl);
        });
        $("body").children().removeClass('hide');
        var $tiles = $("#gallery_wrapper");
        if ($tiles.length){
            var $tiles = $("#gallery_wrapper");
            var $handler = $("li.white-panel", $tiles);
            // 判断当前页是否与图片的一致，一致的话插入， 不一致的话打开图片年份的页面
            var search = location.search, insertToCurrentPage = true;
            if (search){
                search = search.substring(1);
                var param = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}');
                if (param.year && param.year != allImagesData[0].photo_date){
                    //location.href = '/photos?year=' + allImagesData[0].photo_date;
                    insertToCurrentPage = false;
                }
            }
            if (insertToCurrentPage){
                var $newImages = $(Handlebars.templates['pinterest_photo_template']({images: allImagesData})).prependTo($tiles);
                $newImages.find(".lazy").lazyload();
                // 刷新图片布局
                if ($handler.wookmarkInstance) {
                    $handler.wookmarkInstance.clear();
                }              // Create a new layout handler.
                $handler = $('li.white-panel', $tiles);
                var options = {
                    itemWidth: 260, // Optional min width of a grid item
                    autoResize: true, // This will auto-update the layout when the browser window is resized.
                    container: $tiles, // Optional, used for some extra CSS styling
                    resizeDelay:3600000,
                    offset: 15, // Optional, the distance between grid items
                    outerOffset: 15, // Optional the distance from grid to parent
                    flexibleWidth: '50%' // Optional, the maximum width of a grid item
                };
                if (!IsPC()){
                    $.extend(options, {
                        offset: 5, // Optional, the distance between grid items
                        outerOffset: 5, // Optional the distance from grid to parent
                        itemWidth: 140
                    })
                }
                $handler.wookmark(options);
            }
            $("body").scrollTop(0);
        }
        postedImages = true;
        history.back();
    }
});

$("#gallery_wrapper").on('click', 'li.white-panel', function (event) {
    var target = event.target;
    while (target && target.tagName != 'LI'){
        target = target.parentNode;
    }
    if ($(target).hasClass('fav')){
        return;
    }
    viewImage(this);
});

function viewImage(linkObj, img_id){
    var mobile = IsPC() ? '0' : '1';

    if (mobile == '1'){
        if(linkObj){
            new ImageSlider(linkObj, null);
        }
        else{
            $.ajax({
                url: "api/m/photo/"+img_id,
                success:function(data){
                    new ImageSlider(null, data.data);
                }
            })

        }
        return;
    }
    if(img_id == undefined){
        var $this=$(linkObj), $lickItem = $this.closest('li');
        if ($lickItem.data('edit')){
            return;
        }

        var image_id = $this.data('id');
    }
    else{
        var image_id = img_id;
    }

    $.ajax({
        url: "/photo/"+image_id,
        success:function(data){
            // 如果已经打开过，那么只替换中间部分
            update_url(image_id);
            var $dialog = $(data), $existDialog=$(".overlay-content");
            if ($existDialog.length){
                $dialog = $dialog.find(".overlay-content").replaceAll($existDialog);
                $dialog.find('.lazy').lazyload();
            }else{
                openNewPagePushHistory('imageGalery', function(){
                    resume_url();
                    clear_barrager();
                    $dialog.remove();
                });
                $dialog.appendTo($("body"));
                $dialog.on('click', function(event){ //点击关闭
                    if ($(event.target).hasClass("shot-overlay")) {
                        history.back();
                    }
                }).find(".close-overlay").on('click', function(event){
                    history.back();
                    return true;
                });
            }
            var $gallery=$("#gallery-detail"), $galleryImg = $gallery.find("#galleryImg");
            $(".shot-overlay .single-img").on("click", "img", function(){    // 点击放大
                $(".shot-overlay").animate({scrollTop:0}, 'slow');
                var srcUrl = this.src.replace('/thumbnail/', '/');
                $galleryImg.css("background-image", "url("+srcUrl+")");
                $gallery.fadeIn(100);
                function close(event){
                    if (event && event.state && event.state.pageType=='viewGallery'){
                        $gallery.fadeOut(100);
                        window.removeEventListener('popstate', close);
                    }
                }
                history.replaceState({pageType:'viewGallery'}, 'viewGallery');
                history.pushState({pageType:'viewGallery'}, 'viewGallery');
                window.addEventListener('popstate', close);
                $gallery.on("click", function(){        // 点击大图缩小
                    $gallery.unbind('click');
                    history.back();
                });
            });

            //监听enter键
            $dialog.find('textarea').on('keydown', function(event){
                if (event.ctrlKey && event.keyCode == 13){
                    $dialog.find("button[type='submit']").trigger('click');
                }

            });
            // 点赞
            $dialog.find('.icon.favorite').on('click', function(){
                var $this = $(this);
                if (!$this.hasClass('active')){
                    $.ajax({
                        url: "/photo/" + $this.data("img-id") + "/like",
                        type: "POST",
                        success: function(data){
                            $this.html("favorite").addClass("active");
                            $this.next().html(data.like);
                        },
                        error: function(XMLHttpRequest, textStatus, errorThrown){
                            if (XMLHttpRequest.status == 403){  // 需要登录
                                var prev = location.href.substring(location.origin.length);
                                location.href = "/login?prev=" + prev;
                            }
                            alert('未登录，无法操作');
                        }
                    });
                }
            });
            // 判断是否要显示“上一个”“下一个”图标, img_id 存在时，去掉左右翻的箭头
            if(img_id == undefined){
                var $next=$lickItem.next(), $prev=$lickItem.prev();
                if (!$next.length){
                    $dialog.find("li.shot-nav-next").remove();
                }
                if (!$prev.length){
                    $dialog.find("li.shot-nav-prev").remove();
                }
                // 监听上一个，下一个图片动作
                $dialog.find("li[class^='shot-nav']").on('click', function () {
                    if ($(this).is('.shot-nav-prev')){  // 获取前一个
                        $prev.find('img').trigger('click');
                    }else{      // 获取下一个
                        $next.find('img').trigger('click');
                    }
                    clear_barrager();
                    // init_barrager($prev.find('img').attr('href').substring(1));
                });

            }
            else{
                $dialog.find("li.shot-nav-next").remove();
                $dialog.find("li.shot-nav-prev").remove();
            }
            // 弹幕初始化
            init_barrager(image_id, $dialog);
            barrager_switch_event(image_id, $dialog);
        }
    });
    return false;
}

function postComment(form, successCallback){
    if (login_check(true)&&checkform($(form))){
        var $container = $(form).closest('.overlay-content');
        $(form).ajaxSubmit({
            success: function(message){
                successCallback && successCallback(message);
                // 如果是pc端详情页，则增加response数
                var $cmnt=$container.find('.cmnt-count');
                $cmnt.text(parseInt($cmnt.text())+1);
                // 更改主页对应图片的评论数
                var action = $(form).attr('action').substring(1), id = action.substring(action.indexOf('/')+1, action.lastIndexOf('/')),
                    $cmnt=$(".white-panel[data-img='"+id+"'] .cmnt span");
                $cmnt.text(parseInt($cmnt.text())+1);
                if( $container.find(".barrager_switch").prop("checked")){
                    $("#comments").hide();
                    var user_img = $(message).find('.photo').attr('src');
                    var comment = $(message).find('.comment-body').find('p').text();
                    var $singleImage = $container.find('.single-img');
                    var item={
                        img: user_img, //图片
                        info: comment, //文字
                        right: $(window).width() - $singleImage.offset().left - $singleImage.width(),
                        left: $singleImage.offset().left ,
                        href:'#', //链接
                        close:false, //显示关闭按钮
                        speed: 6, //延迟,单位秒,默认6
                        bottom:$(window).height() -$singleImage.offset().top -$singleImage.height(), //距离底部高度,单位px,默认随机
                        color:'#fff', //颜色,默认白色
                        old_ie_color:'#000000', //ie低版兼容色,不能与网页背景相同,默认黑色
                    };
                    send_barrager(item, $container);
                }
                $(message).prependTo($("#comments"));
                form.reset();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
                if (XMLHttpRequest.status == 403){  // 需要登录

                    var prev = location.href.substring(location.origin.length);
                    $("#loginConfirmDialog").modal('show').find("#login").on('click', function(){
                        location.href = "/login?prev=" + prev;
                    });

                }
            }
        });
    }
    return false;
}

function setLiked(item, id) {
    if (login_check(false)) {

        var $item = $(item);
        if ($item.hasClass("marked")) {
            return;
        }
        $.ajax({
            url: "/photo/" + id + "/like",
            type: "POST",
            success: function (data) {
                $item.addClass("marked")
                    .find("span").html(data.like);
                // 设置主页的点赞
                $(".white-panel[data-img=" + id + "] .fav").addClass("marked")
                    .find("span").html(data.like);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                if (XMLHttpRequest.status == 403) {  // 需要登录
                    var prev = location.href.substring(location.origin.length);
                    location.href = "/login?prev=" + prev;
                }
                alert('未登录，无法操作');
            }
        });
        return false;
    }
}
function clear_barrager() {
    $.fn.barrager.removeAll();
    clearInterval(store.get('barrager_interval'));
}
function barrager_switch_event(id, $container) {
    $container.find(".barrager_switch").click(function () {
        if( $(this).prop("checked")){
            $("#comments").hide();
            init_barrager(id, $container);
        }
        else
        {
            clear_barrager();
            $("#comments").show();
        }
    });
}
function send_barrager(item, $container){
    $container.find(".single-img").barrager(item);
}
function init_barrager(id, $container) {
    var $singleImage = $container.find(".single-img");
    $.ajax({
        url: "/api/photo/comments/"+ id,
        type: 'get',
        dataType: 'json',
        success: function(data){
            var items = data.comments;
            if (items.length > 0){
                var currentIndex = 0;
                var barInterval = setInterval(function () {
                    var item = items[currentIndex];
                    item['height'] = $singleImage.height();
                    item['bottom'] = $(window).height() - $singleImage.offset().top - $singleImage.height();
                    item['right'] = $(window).width() - $singleImage.offset().left - $singleImage.width();
                    if (IsPC()){
                        item['left'] = $singleImage.offset().left ;
                    }else{
                        item['left'] = 0;
                    }

                    item['speed'] = 6, //延迟,单位秒,默认6
                        send_barrager(items[currentIndex], $container);
                    currentIndex += 1;
                    if (currentIndex >= items.length){
                        clearInterval(barInterval);
                    }
                }, 2000);
                store.set('barrager_interval', barInterval);
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.status == 403) {  // 需要登录
                var prev = location.href.substring(location.origin.length);
                location.href = "/login?prev=" + prev;
            }
            alert('fail');
        }
    });

}
function checkform($form){
    var $necessary_inputs=$form.find("textarea[data-necessary='true'],input[data-necessary='true'],select[data-necessary='true']");
    var valid=true;
    $necessary_inputs.each(function(){
        if (this.value == ''){
            if (this.type=='text'){
                $("body").snackbar({
                    alive: 3000,
                    content: '请补全标题'
                });
                $(this).parent().addClass('control-focus');
                valid = false;
            }
            else if(this.tagName=='SELECT')
            {
                $(this).parent().addClass('control-focus');
                $("body").snackbar({
                    alive: 3000,
                    content: '请补全年份信息'
                });
                valid = false;
            }
            else if(this.type=='textarea'){
                $(this).parent().addClass('control-focus');
                $("body").snackbar({
                    alive: 3000,
                    content: '评论不得为空'
                });
                valid = false;
            }
        }
    });
    return valid;
}

// 获取当前的日期时间 格式“yyyy-MM-dd HH:MM:SS”
function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
        + " " + date.getHours() + seperator2 + date.getMinutes()
        + seperator2 + date.getSeconds();
    return currentdate;
}

function limit_input_check() {
    var $description = $(".word-num-limit");
    $description.bind('input propertychange', function () {
        var Max_limit = $(this).attr('limit-word-number');
        var word_left_num = Max_limit - $(this).val().length;
        if (word_left_num < 0) {
            word_left_num = 0;
            $(this).val($(this).val().substr(0, Max_limit));
        }
        var s = $(this).prev('label').text();
        if (s.indexOf('【') != -1) {
            var info = s.substring(0, s.indexOf('【'));
        }
        else {
            var info = s;
        }
        var new_info = info + "【还剩" + word_left_num + "个字】";
        $(this).prev('label').text(new_info);
    });
}

// 视图tab 在手机上的显隐控制
function mobile_band_auto_display(band_el) {
    $(window).scroll( function (){
        var  h_num=$(window).scrollTop();
        if (h_num>44){
            band_el.removeClass('view-bar-fixer-pc').addClass('view-bar-fixer-mobile');

        } else {
            band_el.removeClass( 'view-bar-fixer-mobile' );
            band_el.removeClass( 'view-bar-fixer-pc' );
        }
    });
    var $nav = $('.nav');
    var $result = $('.result');

    //页面滚动监听事件
    window.onscroll = function(e){
        $result.html('swipeDown');
        scrollFunc();
        if(scrollDirection == 'down'){
            var  h_num=$(window).scrollTop();
            if (h_num>0) {
                band_el.addClass( 'view-bar-fixer-mobile' );
            }
            else{
                band_el.removeClass( 'view-bar-fixer-mobile' );
            }
        }
        else if(scrollDirection == 'up'){
            var  h_num=$(window).scrollTop();
            if (h_num<=10) {
                band_el.removeClass( 'view-bar-fixer-mobile' );
            }
        }
    }
    var scrollAction = {x: 'undefined', y: 'undefined'}, scrollDirection;

    //判断页面滚动方向
    function scrollFunc() {
        if (typeof scrollAction.x == 'undefined') {
            scrollAction.x = window.pageXOffset;
            scrollAction.y = window.pageYOffset;
        }
        var diffX = scrollAction.x - window.pageXOffset;
        var diffY = scrollAction.y - window.pageYOffset;
        if (diffX < 0) {
            // Scroll right
            scrollDirection = 'right';
        } else if (diffX > 0) {
            // Scroll left
            scrollDirection = 'left';
        } else if (diffY < 0) {
            // Scroll down
            scrollDirection = 'down';

        } else if (diffY > 0) {
            // Scroll up
            scrollDirection = 'up';

        } else {
            // First scroll event
        }
        scrollAction.x = window.pageXOffset;
        scrollAction.y = window.pageYOffset;
    }
}
// 视图tab 在pc上的显隐控制
function pc_band_auto_display(band_el, height) {
    function set_position(band_el, height) {
        var  h_num=$(window).scrollTop();
        if (h_num>height){
            band_el.addClass( 'view-bar-fixer-pc' );

        } else {
            band_el.removeClass( 'view-bar-fixer-pc' );
        }
    }
    $(window).scroll( function (){
        set_position(band_el, height)
    });

    var scrollFunc = function (e) {
        e = e || window.event;
        if (e.wheelDelta) {  //判断浏览器IE，谷歌滑轮事件
            if (e.wheelDelta > 0) { //当滑轮向上滚动时
                // alert("滑轮向上滚动");
                set_position(band_el, height);
            }
            if (e.wheelDelta < 0) { //当滑轮向下滚动时
                // alert("滑轮向下滚动");
                set_position(band_el, height);
            }
        } else if (e.detail) {  //Firefox滑轮事件
            if (e.detail> 0) { //当滑轮向上滚动时
                // alert("滑轮向上滚动");
                set_position(band_el, height);
            }
            if (e.detail< 0) { //当滑轮向下滚动时
                // alert("滑轮向下滚动");
                set_position(band_el, height);
            }
        }
    }
    //给页面绑定滑轮滚动事件
    if (document.addEventListener) {//firefox
        document.addEventListener('DOMMouseScroll', scrollFunc, false);
    }
    //滚动滑轮触发scrollFunc方法  //ie 谷歌
    window.onmousewheel = document.onmousewheel = scrollFunc;
}
function GetRequest() {
    var url = location.search; //获取url中"?"符后的字串
    var theRequest = new Object();
    if (url.indexOf("?") != -1) {
        var str = url.substr(1);
        strs = str.split("&");
        for(var i = 0; i < strs.length; i ++) {
            theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]);
        }
    }
    return theRequest;
}
function encodeDictToRestParam(data){   // 将dict数据转成rest的get接口的参数
    var params = "";
    for(var key in data){
        params += key + "=" + data[key] + "&";
    }
    return params;
}
function check_url() {    // 保存url到缓存
    var Request = new Object();
    Request = GetRequest();
    var search = window.location.search;
    store.set('search', search);
    var path = window.location.pathname;
    store.set('path', path);
    if (Request.hasOwnProperty('photo')){  //img_id 存在时打开该图片
        viewImage(null, Request['photo']);
    }
}
function update_url(image_id) {
    history.replaceState(null, null, "/?"+"photo="+image_id);
}
function resume_url() {
    var search = store.get('search');
    var path = store.get('path');
    if(path == '/'){
        history.replaceState(null, null, "/");
    }
    else{
        history.replaceState(null, null, path+search);
    }

}