var gulp = require('gulp');

// 在命令行设置为生产环境或者开发环境
//开发环境不要使用压缩，会影响找错
// windows: set NODE_ENV = development 或 production
//（可能会有问题， 建议使用 :var environment=process.env.NODE_ENV || 'development';）
// mac  linux : export NODE_ENV=development 或 production 或 build

var environment = process.env.NODE_ENV || 'production';
console.log(environment);

//根据自己开发的实际需求自行设置， src放开发文件， dist是打包压缩后的导出目录
const folder = {
    src: "www/",
    dist: 'dist/',
    build: 'build/',
    componentSrc: 'www/components/'
};

// 压缩html代码
const htmlClean = require('gulp-htmlclean');

// 图片类： 压缩PNG, JPEG, GIF and SVG
const imageMin = require('gulp-imagemin');

// uglify 不支持压缩 es6 ， 需要先使用babel降级才行 */
const uglifyJS = require('gulp-uglify');
//es6 降级到es5    请使用  "gulp-babel": "^7.0.1",
//切记不要用 8版本， 会出现无法输出的情况
const babel = require('gulp-babel');
//去除掉 注释， console 和 debugger
const removeComments = require('gulp-strip-debug');

//less 转 css
const less = require('gulp-less');
//css3 兼容各类浏览器脚本
const postCss = require('gulp-postcss');
const autoPrefixer = require('autoprefixer');
//css代码压缩
const cleanCss = require('gulp-clean-css');
const concat = require('gulp-concat');
const htmlReplace = require('gulp-html-replace');
const htmlMin = require('gulp-htmlmin');
const sequence = require('run-sequence');
const webserver = require('gulp-webserver');

const timeStamp = new Date().getTime();
const jsFileName = 'all-' + timeStamp + '.min.js';
const cssFileName = ' all-' + timeStamp + '.min.css';

//创建服务器环境插件 支持热更新
const connect = require("gulp-connect");

gulp.task('html', function () {
    console.log('html');
    const step = gulp.src(folder.src + "templates/**")
        .pipe(connect.reload());
    if (environment === 'build') {
        step.pipe(htmlClean())
    }
    return step.pipe(gulp.dest(folder.dist + "templates/"))
});

gulp.task('htmlReplace', function () {
    console.log('htmlReplace');
    return gulp.src(folder.src + 'templates/**')
        .pipe(htmlReplace({
            js: ['/js/config.js', '/js/' + jsFileName],
            css: '/css/' + cssFileName
        }))
        .pipe(htmlClean())
        .pipe(htmlMin())
        .pipe(gulp.dest(folder.dist + 'templates'));
});

gulp.task('img', function () {
    gulp.src(folder.src + "img/**")
        .pipe(imageMin())
        .pipe(gulp.dest(folder.dist + "img/"))
});

gulp.task('css', function () {
    console.log('css');
    // const step = gulp.src([folder.src + "css/**"])
    //     .pipe(connect.reload())
    //     .pipe(less())
    //     .pipe(postCss([autoPrefixer()]));
    // if (environment === 'build') {
    //     step.pipe(cleanCss())
    // }
    // step.pipe(gulp.dest(folder.dist + "css/"));
    // gulp.src(folder.src + "components/**/*.css")
    //     .pipe(less())
    //     .pipe(postCss([autoPrefixer()]))
    //     .pipe(cleanCss())
    //     .pipe(gulp.dest(folder.dist + "components/"));

    gulp.src(folder.src + "components/mui/fonts/**")
        .pipe(gulp.dest(folder.dist + "fonts/"))
        .pipe(gulp.dest(folder.dist + "components/mui/fonts/"));
    gulp.src([folder.src + "components/mui/css/icons-extra.css", folder.src + "components/mui/css/mui.min.css"])
        .pipe(postCss([autoPrefixer()]))
        .pipe(cleanCss())
        .pipe(gulp.dest(folder.dist + "components/mui/css/"));
    gulp.src([folder.src + "css/setting.css"])
        .pipe(postCss([autoPrefixer()]))
        .pipe(cleanCss())
        .pipe(gulp.dest(folder.dist + "css/"));
});

gulp.task('compressAllCss', function () {
    console.log('compress components css');
    return gulp.src([
        folder.componentSrc + 'mui/css/icons-extra.css',
        folder.componentSrc + 'mui/css/mui.min.css',
        folder.componentSrc + 'mui/css/mui.picker.min.css',
        folder.componentSrc + 'libs/font-awesome-4.7.0/css/font-awesome.min.css',
        folder.src + 'css/iconfont/iconfont.css',
        folder.src + 'css/setting.css',
        folder.src + 'css/animate.css',
        folder.src + 'css/my.css',
        folder.src + 'css/notify.css',
        folder.src + 'css/icon.css',
        folder.src + 'css/task.css',
        folder.src + 'css/energy.css'
    ])
        .pipe(cleanCss())
        .pipe(concat(cssFileName))
        // .pipe(gulp.dest('build/css'))
        // .pipe(less())
        // .pipe(postCss([autoPrefixer()]))
        // .pipe(cleanCss())
        .pipe(gulp.dest(folder.dist + 'css'))
        // .pipe(connect.reload());
});

gulp.task('js', function () {
    gulp.src(folder.src + "js/config.js")
        .pipe(gulp.dest(folder.dist + "js/"));
    const step = gulp.src(folder.src + "js/**/*.js")
        .pipe(connect.reload())
        .pipe(babel({
            presets: ['es2015']
        }));
    if (environment === 'build') {
        step.pipe(removeComments())
            .pipe(uglifyJS())
    }
    return step.pipe(gulp.dest(folder.build + "js/"));
});

gulp.task('compressAllJs', function () {
    console.log('compress components js');
    gulp.src([
        folder.componentSrc + 'libs/jquery-2.1.4.min.js',
        folder.componentSrc + 'angular/angular.min.js',
        folder.componentSrc + 'angular-ui-router/release/angular-ui-router.min.js',
        folder.componentSrc + 'angular-animate/angular-animate.js',
        folder.componentSrc + 'angular-ui-router/release/stateEvents.min.js',
        folder.componentSrc + 'fastclick-master/lib/fastclick.js',
        folder.componentSrc + 'dropload-gh-pages/dist/dropload.min.js',
        folder.componentSrc + 'moment.min.js',
        folder.componentSrc + 'echart/echarts.min-3.x.js',
        folder.componentSrc + 'mui/js/mui.min.js',
        folder.componentSrc + 'mui/js/mui.picker.min.js',
        folder.componentSrc + 'me-lazyimg-master/me-lazyimg.js',
        folder.componentSrc + 'slides-playing/js/jquery.slides.js',
        folder.componentSrc + 'pinch-zoom-js/dist/underscore.js',
        folder.componentSrc + 'pinch-zoom-js/dist/pinch-zoom.js',
        folder.componentSrc + 'baidu/map/MarkerManager-1.2.min.js',
        folder.build + 'js/lib/jwt/jsrsasign-all-min.js',
        folder.build + 'js/lib/datatables/jquery.dataTables.min.js',
        folder.build + 'js/lib/datatables/dataTables.fixedColumns.min.js',
        folder.build + 'js/lib/datatables/dataTables.fixedHeader.min.js',
        folder.build + 'js/lib/circleChart.es5.min.js',
        folder.build + 'js/lib/imagesloaded-master/imagesloaded.pkgd.min.js',

        folder.build + 'js/app/**',
        folder.build + 'js/service/**',
        folder.build + 'js/router/**',
        folder.build + 'js/controller/**',
        folder.build + 'js/my/**'
    ])
        .pipe(concat(jsFileName))
        .pipe(gulp.dest('build/js'))
        .pipe(removeComments())
        .pipe(uglifyJS())
        .pipe(gulp.dest(folder.dist + 'js'))
        .pipe(connect.reload());
});


//自动刷新页面
gulp.task('watch', function () {
    gulp.watch(folder.src + "templates/**", ['html']);
    gulp.watch(folder.src + "css/**", ['css']);
    gulp.watch(folder.src + "js/**", ['js'])
});

gulp.task('runsequence', function (callback) {
    // sequence('html', 'htmlReplace', "js", "compressAllJs", "compressAllCss", callback);      // 同步运行
    sequence('html', 'htmlReplace', "js", "compressAllJs", function () {
        console.log('runsequence finish');
    });      // 同步运行
});

// 发布时，先运行： gulp release，  将资源文件进行打包
// 再运行： gulp run-release     启动webserver，根目录为 dist
gulp.task("release", ['img', 'css', 'compressAllCss', 'runsequence']);      // 发布: gulp release
gulp.task("run-release", function () {
    gulp.src(['dist'])
    .pipe(webserver({
        port: 8001,//端口
        host: '0.0.0.0',//域名
        //liveload: true,//实时刷新代码。不用f5刷新
        directoryListing: {
            path: 'index.html',
            enable: true
        }
    }));
});

// 开发时运行： gulp   启动webserver，根目录为 www
gulp.task('webserver', function(){
    gulp.src(['www'])
        .pipe(webserver({
            port: 8001,//端口
            host: '0.0.0.0',//域名
            //liveload: true,//实时刷新代码。不用f5刷新
            directoryListing: {
                path: 'index.html',
                enable: true
            }
        }))
});
gulp.task("default", ['webserver']);

// default任务一定要写，不然会报警告： Task 'default' is not in your gulpfile
// 数组中写哪一个执行哪一个任务， 从左到右执行