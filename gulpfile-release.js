// 导入工具包 require('node_modules里对应模块')
const gulp = require('gulp'), //本地安装gul所用到的地方
    less = require('gulp-less'),
    del = require('del'),
    webserver = require('gulp-webserver'),
    fs = require('fs'),
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
const PipeQueue = require('pipe-queue');

//根据自己开发的实际需求自行设置， src放开发文件， dist是打包压缩后的导出目录
const folder = {
    src: "www/",
    dist: 'dist/',
    tmp: 'dist/tmp/',
    lib: 'www/lib/'
};


const themeType = global.gTheme;

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
    gulp.src(folder.src + "img/**")
        .pipe(imageMin())
        .pipe(gulp.dest(folder.dist + "img/"));
});

gulp.task('clone-less', function () {
    return gulp.src('less/**').pipe(gulp.dest(`${folder.tmp}less`));
});

gulp.task('less-to-css', function () {
    const root = folder.tmp;
    const lessCopy = gulp.src('less/**/*.less').pipe(gulp.dest(`${root}less`));
    const cssCopy = gulp.src('less/**/*.css').pipe(gulp.dest(`${root}css`));
    const $queue = new PipeQueue();
    $queue.when(lessCopy, cssCopy).then(function (next, concat) {
        const text = `@import './${themeType}.less';`;
        fs.writeFileSync(`${root}less/theme/index.less`, text, 'utf-8');

        const stream = gulp.src([`${root}less/**/*.less`, `!${root}less/theme/*.less`])
            .pipe(less())
            .pipe(autoprefixer({
                overrideBrowserslist: ['> 1%', 'last 2 versions', 'Firefox ESR'],
                cascade: false
            }))
            .pipe(gulp.dest(`${folder.tmp}css`));
        stream.on('end', next);
    }).end(function () {
        console.log("end");
    });
    return $queue.promise();
});

gulp.task('compress-css', function () {

    gulp.src(folder.lib + "mui/fonts/**")
        .pipe(gulp.dest(folder.dist + "fonts/"));

    return gulp.src([
        folder.lib + 'mui/css/icons-extra.css',
        folder.tmp + 'css/setting.css',
        folder.tmp + 'css/animate.css',
        folder.lib + 'mui/css/mui.min.css',
        folder.lib + 'mui/css/mui.picker.min.css',
        folder.tmp + 'css/iconfont/iconfont.css',
        folder.tmp + 'css/my.css',
        folder.tmp + 'css/notify.css',
        folder.tmp + 'css/icon.css',
        folder.tmp + 'css/task.css',
        folder.tmp + 'css/energy.css',
        folder.tmp + 'css/login.css'
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
    // 设置echarts主题色: 将对应主题色js文件拷贝到index.js，html引用 theme/echarts/index.js
    gulp.src([`theme/echarts/${themeType}.js`])
        .pipe(concat('echartsTheme.js'))
        .pipe(gulp.dest(`${folder.tmp}/js`));
    const step = gulp.src(folder.src + "js/**/*.js")
        .pipe(connect.reload())
        .pipe(babel({
            presets: ['es2015']
        }));
    step.pipe(removeComments())
        .pipe(uglifyJS());
    return step.pipe(gulp.dest(folder.tmp + "js"));
});

/**
 * 将www/components和www/lib下的文件打包成libv1.0.js。如果后续库文件新增或减少，则升级文件名中的V1.0
 * 将www/js中的文件打包成 xxxx.js。 xxxx为每次编辑时新生成的随机文件名
 */
gulp.task('compress-js', function () {
    console.log('start compress-js');
    gulp.src([
        folder.lib + 'jquery-3.5.0.min.js',
        folder.lib + 'angular/angular.min.js',
        folder.lib + 'angular-ui-router/release/angular-ui-router.min.js',
        folder.lib + 'angular-animate/angular-animate.js',
        folder.lib + 'angular-ui-router/release/stateEvents.min.js',
        folder.lib + 'angular-translate.min.js',
        folder.lib + 'fastclick-master/lib/fastclick.js',
        folder.lib + 'dropload-gh-pages/dist/dropload.min.js',
        folder.lib + 'moment.min.js',
        folder.lib + 'echart/echarts.min-3.x.js',
        folder.lib + 'mui/js/mui.min.js',
        folder.lib + 'mui/js/mui.picker.min.js',
        folder.lib + 'me-lazyimg-master/me-lazyimg.js',
        folder.lib + 'slides-playing/js/jquery.slides.js',
        folder.lib + 'baidu/map/MarkerManager-1.2.min.js',
        folder.lib + 'jwt/jsrsasign-all-min.js',
        folder.lib + 'datatables/jquery.dataTables.min.js',
        folder.lib + 'datatables/dataTables.fixedColumns.min.js',
        folder.lib + 'datatables/dataTables.fixedHeader.min.js',
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
    gulp.src([folder.lib + 'ys7/ezuikit-1.3.min.js']).pipe(gulp.dest(folder.dist + 'lib/ys7'));
    gulp.src([folder.lib + 'easy-player/easy-player-element.min.js']).pipe(gulp.dest(folder.dist + 'lib/easy-player'));
});

gulp.task('html-replace', function () {
    console.log('start html-replace');
    gulp.src(folder.src + 'index.html').pipe(gulp.dest(folder.dist));
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
    gulp.src([folder.lib + 'mui/fonts/**']).pipe(gulp.dest(folder.dist + 'fonts'));

    // 图片
    gulp.src([`theme/img/${themeType}/**`])
        .pipe(gulp.dest(`${folder.dist}img`));
});

gulp.task('clean-before', function () {
    console.log('clean old dist folder');
    return del([folder.dist]);
});

gulp.task('clean-after', function () {
    console.log('clean tmp folder after release');
    return del([folder.tmp]);
});

gulp.task('release', function (callback) {     // 发布: gulp release
    return sequence('clean-before', 'less-to-css', 'compress-css', "build-js", "compress-js", 'compress-img', 'clone-other', 'html-replace', 'clean-after', function () {
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