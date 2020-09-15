const fs = require('fs');
// 导入工具包 require('node_modules里对应模块')
const gulp = require('gulp'), //本地安装gul所用到的地方
    less = require('gulp-less'),
    del = require('del'),
    webserver = require('gulp-webserver'),
    autoprefixer = require('gulp-autoprefixer'); //补全浏览器前缀
const concat = require('gulp-concat');
var environment = 'build'; //  process.env.NODE_ENV || 'production';

// 配置主题色： light/dark
const themeType = 'dark';

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

//css3 兼容各类浏览器脚本
const postCss = require('gulp-postcss');
const autoPrefixer = require('autoprefixer');
//css代码压缩
const cleanCss = require('gulp-clean-css');
const htmlReplace = require('gulp-html-replace');
const htmlMin = require('gulp-htmlmin');
const sequence = require('run-sequence');

const timeStamp = new Date().getTime();
const libFileName = 'lib-' + timeStamp + '.min.js';
const jsFileName = 'all-' + timeStamp + '.min.js';
const cssFileName = 'all-' + timeStamp + '.min.css';

//创建服务器环境插件 支持热更新
const connect = require("gulp-connect");


const root = 'www';

gulp.task('js', function () {
    return gulp
        .src('./www/**/*.js', { base: './www/' })
        .pipe(uglify())
        .pipe(gulp.dest('./build/'));

});

gulp.task('compress-img', function () {
    gulp.src(folder.src + "img/**")
        .pipe(imageMin())
        .pipe(gulp.dest(folder.dist + "img/"));
});

gulp.task('compress-css', function () {
    console.log('compress components css');

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
        // .pipe(gulp.dest('build/tmp'))
        // .pipe(less())
        // .pipe(postCss([autoPrefixer()]))
        // .pipe(cleanCss())
        .pipe(gulp.dest(folder.dist + 'css'))
        .pipe(connect.reload());
});

gulp.task('build-js', function () {
    gulp.src(folder.src + "config/config.js")
        .pipe(gulp.dest(folder.dist + "config/"));
    const step = gulp.src(folder.src + "js/**/*.js")
        .pipe(connect.reload())
        .pipe(babel({
            presets: ['es2015']
        }));
    if (environment === 'build') {
        step.pipe(removeComments())
            .pipe(uglifyJS());
    }
    return step.pipe(gulp.dest(folder.build + "js/"));
});

gulp.task('compress-js', function () {
    console.log('compress components js');
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
        folder.src + 'lib/circleChart.es5.min.js',
        folder.src + 'lib/imagesloaded-master/imagesloaded.pkgd.min.js'
    ])
        .pipe(concat(libFileName))
        // .pipe(gulp.dest('build/tmp'))
        // .pipe(removeComments())
        // .pipe(uglifyJS())
        .pipe(gulp.dest(folder.dist + 'js'))
        .pipe(connect.reload());

    gulp.src([
        folder.build + 'js/app/**',
        folder.build + 'js/service/**',
        // folder.build + 'js/router/**',
        folder.build + 'js/controller/**',
        folder.build + 'js/my/**',
        folder.build + 'js/echartsTheme.js'
    ])
        .pipe(concat(jsFileName))
        .pipe(gulp.dest('build/tmp'))
        .pipe(removeComments())
        .pipe(uglifyJS())
        .pipe(gulp.dest(folder.dist + 'js'))
        .pipe(connect.reload());

    gulp.src([folder.build + 'js/router/router.js']).pipe(gulp.dest(folder.dist + 'js/router'));
    gulp.src([folder.src + 'lib/ys7/ezuikit-1.3.min.js']).pipe(gulp.dest(folder.dist + 'lib/ys7'));
    gulp.src([folder.build + 'js/app/utils.js']).pipe(gulp.dest(folder.dist + 'js/app'));
});

gulp.task('html-replace', function () {
    console.log('htmlReplace');
    return gulp.src(folder.src + 'templates/**')
        .pipe(htmlReplace({
            lib: ['/js/' + libFileName],
            js: ['/config/config.js', '/js/' + jsFileName],
            css: '/css/' + cssFileName
        }))
        .pipe(htmlClean())
        .pipe(htmlMin())
        .pipe(gulp.dest(folder.dist + 'templates'));
});

gulp.task('clone-other', function () {
   gulp.src([folder.src + 'pdf-viewer/**']).pipe(gulp.dest(folder.dist + 'pdf-viewer'));
    gulp.src([folder.src + 'version/**']).pipe(gulp.dest(folder.dist + 'version'));
});

gulp.task('runsequence', function (callback) {
    // sequence('html', 'htmlReplace', "js", "compressAllJs", "compressAllCss", callback);      // 同步运行
    sequence('compress-css', "build-js", 'html-replace', "compress-js", function () {
        console.log('runsequence finish');
    });      // 同步运行
});

// 发布时，先运行： gulp release，  将资源文件进行打包
// 再运行： gulp run-release     启动webserver，根目录为 dist
gulp.task("release", ['compress-img', 'clone-other', 'runsequence']);      // 发布: gulp release
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

// 启动服务
gulp.task('webserver', async function () {
    gulp.src(['www', 'node_modules'])
        .pipe(webserver({
            port: 7000,//端口
            host: '0.0.0.0',//域名
            //liveload: true,//实时刷新代码。不用f5刷新
            directoryListing: {
                path: 'index.html',
                enable: true
            }
        }))
});



// 设置主题色
gulp.task('theme', async function () {
    const text = `@import './${themeType}.less';`;
    fs.writeFile('less/theme/index.less', text, 'utf-8', function (err) {
        if (err) {
            console.log('写入文件失败:', err);
        }
    });
});



// reset css文件夹
gulp.task('reset:css', ['theme'], async function () {
    await del([`${root}/css/**`, `${root}/css/iconfont`]);
    await fs.mkdir(`${root}/css/iconfont`, function (err) {
        if (err) {
            console.log('目录创建失败', err);
        }
    })
})


// less转css
gulp.task('less', async function () {
    gulp.src('less/iconfont/**').pipe(gulp.dest(`${root}/css/iconfont`));
    gulp.src('less/*.css').pipe(gulp.dest(`${root}/css`));

    await gulp.src(['./less/**/*.less', '!less/theme/*.less'])
        .pipe(less())
        .pipe(autoprefixer({
            overrideBrowserslist: ['> 1%', 'last 2 versions', 'Firefox ESR'],
            cascade: false
        }))
        .pipe(gulp.dest(`${root}/css`));
});

// 拷贝不同主题的图片
gulp.task('themeStatic', async function () {
    // 设置echarts主题色: 将对应主题色js文件拷贝到index.js，html引用 theme/echarts/index.js
    gulp.src([`theme/echarts/${themeType}.js`])
        .pipe(concat('echartsTheme.js'))
        .pipe(gulp.dest(`${root}/js`));
    // 图片
    gulp.src([`theme/img/${themeType}/**`])
        .pipe(gulp.dest('www/img'));
});


// 侦听less文件变化
gulp.task('watch', async function () {
    gulp.watch([`less/**/*.less`], ['less']);
});

gulp.task('update:theme', ['reset:css']);

gulp.task('default', ['less', 'themeStatic', 'watch', 'webserver']);


/**
 * 更改主题色配置之后
 * > gulp update:theme
 * > gulp
 */



