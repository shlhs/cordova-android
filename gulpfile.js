// 导入工具包 require('node_modules里对应模块')
const fs = require('fs');
const gulp = require('gulp'), //本地安装gul所用到的地方
    less = require('gulp-less'),
    del = require('del'),
    webserver = require('gulp-webserver'),
    autoprefixer = require('gulp-autoprefixer'); //补全浏览器前缀
const concat = require('gulp-concat');


const config = require('./www/config/config');

const themeType = config.gTheme;

require('./gulpfile-release.js');


const root = 'www';

gulp.task('js', function () {
    return gulp
        .src('./www/**/*.js', { base: './www/' })
        .pipe(uglify())
        .pipe(gulp.dest('./build/'));

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
    // await fs.mkdir(`${root}/css/iconfont`, function (err) {
    //     if (err) {
    //         console.log('目录创建失败', err);
    //     }
    // })
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
 * 开发：
 *  www/config/config.js中更改主题色之后
 * > gulp update:theme 
 * > gulp
 */


/**
 * 版本发布：脚本：gulpfile-release.js
 * 1） gulp release  // 将文本压缩打包到dist文件夹
 * 2） gulp run-release // 运行webserver，对dist文件夹进行测试
 */
