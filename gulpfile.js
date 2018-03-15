//导入工具包 require('node_modules里对应模块')
var gulp = require('gulp'), //本地安装gulp所用到的地方
    less = require('gulp-less');
var webserver = require('gulp-webserver');

// 源usr
var src = {
    path: './www',
    html: ['./www/templates/*.html'],
    css: ['./www/css/*.less', './www/css/*.css'],
    js: ['./www/js/*.js', './src/script/*.js'],
    images: ['./www/img/*'],
    lib: './node_modules/*'
};

// 生成
var build = {
    path: './build',
    html: './build/',
    css: ['./build/style/', './build/usr/style'],
    js: ['./build/script', './build/script/'],
    images: ['./build/images', './build/usr/images'],
    lib: './build/lib'
};
gulp.src(['www/*', 'node_modules/*']);

gulp.task('js',['jscs', 'jshint'],function(){
    return gulp
        .src('./www/**/*.js', {base:'./www/'})
        .pipe(uglify())
        .pipe(gulp.dest('./build/'));

});

gulp.task('webserver', function(){
    gulp.src(['www', 'node_modules'])
        .pipe(webserver({
            port: 8000,//端口
            host: '0.0.0.0',//域名
            //liveload: true,//实时刷新代码。不用f5刷新
            directoryListing: {
                path: 'index.html',
                enable: true
            }
        }))
});

gulp.task('default',['webserver']); //定义默认任务
//gulp.task(name[, deps], fn) 定义任务  name：任务名称 deps：依赖任务名称 fn：回调函数
//gulp.src(globs[, options]) 执行任务处理的文件  globs：处理的文件路径(字符串或者字符串数组)
//gulp.dest(path[, options]) 处理完后文件生成路径