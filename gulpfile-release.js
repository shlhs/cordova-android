// 导入工具包 require('node_modules里对应模块')
const gulp = require('gulp'), //本地安装gul所用到的地方
    less = require('gulp-less'),
    del = require('del'),
    webserver = require('gulp-webserver'),
    autoprefixer = require('gulp-autoprefixer'); //补全浏览器前缀
const concat = require('gulp-concat');
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

//css3 兼容各类浏览器脚本
const postCss = require('gulp-postcss');
const autoPrefixer = require('autoprefixer');
//css代码压缩
const cleanCss = require('gulp-clean-css');
const htmlReplace = require('gulp-html-replace');
const htmlMin = require('gulp-htmlmin');
const sequence = require('run-sequence');

//根据自己开发的实际需求自行设置， src放开发文件， dist是打包压缩后的导出目录
const folder = {
    src: "www/",
    dist: 'dist/',
    tmp: 'dist/tmp/',
    componentSrc: 'www/components/'
};

function getFileName() {
    const chars = '01234567890abcdefghijklmnopqrstuvwxyz';
    const charLen = chars.length;
    const res = [];
    const tt = new Date().getTime();
    for (let i=0; i<8; i++) {
        const randomIndex = Math.floor(Math.random(tt) * charLen) % charLen;
        res.push(chars[randomIndex]);
    }
    return res.join('');
}

const randomFileName = getFileName();

const libFileName = 'libv1.0.min.js'; // 将所有第三方js插件打包成lib.js，如果没有新增或删除js，则文件名不变
const jsFileName = randomFileName + '.min.js';
const cssFileName = randomFileName + '.min.css';

//创建服务器环境插件 支持热更新
const connect = require("gulp-connect");

gulp.task('compress-img', function () {
    console.log('start compress-img');
    gulp.src(folder.src + "img/**")
        .pipe(imageMin())
        .pipe(gulp.dest(folder.dist + "img/"));
});

gulp.task('compress-css', function () {
    console.log('start components-css');

    gulp.src(folder.src + "components/mui/fonts/**")
        .pipe(gulp.dest(folder.dist + "fonts/"));

    return gulp.src([
        folder.componentSrc + 'mui/css/icons-extra.css',
        folder.src + 'css/setting.css',
        folder.src + 'css/animate.css',
        folder.componentSrc + 'mui/css/mui.min.css',
        folder.componentSrc + 'mui/css/mui.picker.min.css',
        folder.src + 'css/iconfont/iconfont.css',
        folder.src + 'css/my.css',
        folder.src + 'css/notify.css',
        folder.src + 'css/icon.css',
        folder.src + 'css/task.css',
        folder.src + 'css/energy.css',
        folder.src + 'css/login.css'
    ])
        .pipe(cleanCss())
        .pipe(concat(cssFileName))
        // .pipe(gulp.dest('dist/tmp'))
        // .pipe(less())
        // .pipe(postCss([autoPrefixer()]))
        // .pipe(cleanCss())
        .pipe(gulp.dest(folder.dist + 'css'))
        .pipe(connect.reload());
});

gulp.task('build-js', function () {
    console.log('start build-js');
    gulp.src(folder.src + "config/config.js")
        .pipe(gulp.dest(folder.dist + "config/"));
    const step = gulp.src(folder.src + "js/**/*.js")
        .pipe(connect.reload())
        .pipe(babel({
            presets: ['es2015']
        }));
    step.pipe(removeComments())
        .pipe(uglifyJS());
    return step.pipe(gulp.dest(folder.tmp + "js"));
});

gulp.task('compress-js', function () {
    console.log('start compress-js');
    gulp.src([
        folder.componentSrc + 'libs/jquery-2.1.4.min.js',
        folder.componentSrc + 'angular/angular.min.js',
        folder.componentSrc + 'angular-ui-router/release/angular-ui-router.min.js',
        folder.componentSrc + 'angular-animate/angular-animate.js',
        folder.componentSrc + 'angular-ui-router/release/stateEvents.min.js',
        folder.src + 'lib/angular-translate.min.js',
        folder.componentSrc + 'fastclick-master/lib/fastclick.js',
        folder.componentSrc + 'dropload-gh-pages/dist/dropload.min.js',
        folder.componentSrc + 'moment.min.js',
        folder.componentSrc + 'echart/echarts.min-3.x.js',
        folder.componentSrc + 'mui/js/mui.min.js',
        folder.componentSrc + 'mui/js/mui.picker.min.js',
        folder.componentSrc + 'me-lazyimg-master/me-lazyimg.js',
        folder.componentSrc + 'slides-playing/js/jquery.slides.js',
        // folder.componentSrc + 'pinch-zoom-js/dist/underscore.js',
        // folder.componentSrc + 'pinch-zoom-js/dist/pinch-zoom.js',
        folder.componentSrc + 'baidu/map/MarkerManager-1.2.min.js',
        folder.src + 'lib/jwt/jsrsasign-all-min.js',
        folder.src + 'lib/datatables/jquery.dataTables.min.js',
        folder.src + 'lib/datatables/dataTables.fixedColumns.min.js',
        folder.src + 'lib/datatables/dataTables.fixedHeader.min.js',
        folder.src + 'lib/imagesloaded-master/imagesloaded.pkgd.min.js'
    ])
        .pipe(concat(libFileName))
        // .pipe(gulp.dest('build/tmp'))
        // .pipe(removeComments())
        // .pipe(uglifyJS())
        .pipe(gulp.dest(folder.dist + 'js'))
        .pipe(connect.reload());

    gulp.src([
        folder.tmp + 'js/app/**',
        folder.tmp + 'js/service/**',
        // folder.tmp + 'js/router/**',
        folder.tmp + 'js/controller/**',
        folder.tmp + 'js/my/**',
        folder.tmp + 'js/echartsTheme.js'
    ])
        .pipe(concat(jsFileName))
        .pipe(gulp.dest(folder.tmp))
        .pipe(removeComments())
        .pipe(uglifyJS())
        .pipe(gulp.dest(folder.dist + 'js'))
        .pipe(connect.reload());

    gulp.src([folder.tmp + 'js/router/router.js']).pipe(gulp.dest(folder.dist + 'js/router'));
    gulp.src([folder.src + 'lib/ys7/ezuikit-1.3.min.js']).pipe(gulp.dest(folder.dist + 'lib/ys7'));
    gulp.src([folder.tmp + 'js/app/utils.js']).pipe(gulp.dest(folder.dist + 'js/app'));
});

gulp.task('html-replace', function () {
    console.log('start html-replace');
    return gulp.src(folder.src + 'templates/**')
        .pipe(htmlReplace({
            lib: ['/js/' + libFileName],
            js: ['/config/config.js?t=' + randomFileName, '/js/' + jsFileName],
            css: '/css/' + cssFileName
        }))
        .pipe(htmlClean())
        .pipe(htmlMin())
        .pipe(gulp.dest(folder.dist + 'templates'));
});

gulp.task('clone-other', function () {
    console.log('start clone other');
    gulp.src([folder.src + 'pdf-viewer/**']).pipe(gulp.dest(folder.dist + 'pdf-viewer'));
    gulp.src([folder.src + 'version/**']).pipe(gulp.dest(folder.dist + 'version'));
    gulp.src([folder.src + 'i18n/**']).pipe(gulp.dest(folder.dist + 'i18n'));
    gulp.src([folder.componentSrc + 'mui/fonts/**']).pipe(gulp.dest(folder.dist + 'fonts'));
});

gulp.task('clean-before', function () {
    console.log('clean old dist folder');
    del([folder.dist]);
});

gulp.task('clean-after', function () {
    console.log('clean tmp folder after release');
    del([folder.tmp]);
});

gulp.task('release', function (callback) {     // 发布: gulp release
    // sequence('html', 'htmlReplace', "js", "compressAllJs", "compressAllCss", callback);      // 同步运行
    sequence('clean-before', 'compress-css', "build-js", "compress-js", 'compress-img', 'clone-other', 'html-replace', 'clean-after', function () {
        console.log('runsequence finish');
    });      // 同步运行
});

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

// 发布时，先运行： gulp release，  将资源文件进行打包
// 再运行： gulp run-release  启动webserver进行测试，根目录为 dist



