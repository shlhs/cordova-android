const fs = require('fs');
// 导入工具包 require('node_modules里对应模块')
const gulp = require('gulp'), //本地安装gul所用到的地方
    less = require('gulp-less'),
    del = require('del'),
    webserver = require('gulp-webserver'),
    autoprefixer = require('gulp-autoprefixer'); //补全浏览器前缀
const concat = require('gulp-concat');

// 配置主题色： light/dark
const themeType = 'dark';


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
    fs.writeFile(`${root}/less/theme/index.less`, text, 'utf-8', function (err) {
        if (err) {
            console.log('写入文件失败:', err);
        }
    });
    // 设置echarts主题色: 将对应主题色js文件拷贝到index.js，html引用 theme/echarts/index.js
    gulp.src([`www/theme/echarts/${themeType}.js`])
        .pipe(concat('index.js'))
        .pipe(gulp.dest('www/theme/echarts'));
})



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
    gulp.src(`${root}/less/iconfont/**`).pipe(gulp.dest(`${root}/css/iconfont`))

    await gulp.src([`${root}/less/**/*.less`, `!${root}/less/theme/*.less`])
        .pipe(less())
        .pipe(autoprefixer({
            overrideBrowserslist: ['> 1%', 'last 2 versions', 'Firefox ESR'],
            cascade: false
        }))
        .pipe(gulp.dest(`${root}/css`));
});


// 侦听less文件变化
gulp.task('watch', async function () {
    gulp.watch([`${root}/**/*.less`], ['less']);
})


// 生成主题色less对应的js
gulp.task('reset:themeConst', async function () {
    let str = '';
    await fs.readFile(`${root}/less/theme/${themeType}.less`, 'utf-8', function (err, data) {
        if (err) {
            return console.log('update:themeConst:readFile', err)
        }
        str = data;
        // less变量格式化为js变量的格式
        str = str.replace(/-\w/g, function (x) {
            return x.slice(1).toUpperCase();
        }).replace(/:/g, " = ").replace(/@/g, 'const $').replace(/#\w*/g, function (x) {
            return `'${x}'`;
        })

        fs.writeFile(`${root}/js/controller/themeConst.js`, str, 'utf-8', function (err) {
            if (err) {
                console.log('update:themeConst:writeFile', err);
            }
        })
    })

})

gulp.task('update:theme', ['reset:css', 'reset:themeConst'])

gulp.task('default', ['less', 'watch', 'webserver']);




/**
 * 更改主题色配置之后
 * > gulp update:theme
 * > gulp
 */



