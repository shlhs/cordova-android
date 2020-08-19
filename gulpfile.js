const fs = require('fs');
// 导入工具包 require('node_modules里对应模块')
const gulp = require('gulp'), //本地安装gul所用到的地方
    less = require('gulp-less'),
     del = require('del'),
    webserver = require('gulp-webserver');

// 源usr
// var src = {
//     path: './www',
//     html: ['./www/templates/*.html'],
//     css: ['./www/css/*.less', './www/css/*.css'],
//     js: ['./www/js/*.js', './src/script/*.js'],
//     images: ['./www/img/*'],
//     lib: './node_modules/*'
// };

// 生成
// var build = {
//     path: './build',
//     html: './build/',
//     css: ['./build/style/', './build/usr/style'],
//     js: ['./build/script', './build/script/'],
//     images: ['./build/images', './build/usr/images'],
//     lib: './build/lib'
// };


// 配置主题色： light/dark
const themeType = 'dark';


const root = 'www';

gulp.task('js', function () {
    return gulp
        .src('./www/**/*.js', { base: './www/' })
        .pipe(uglify())
        .pipe(gulp.dest('./build/'));

});

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
    fs.writeFile(`${root}/less/theme/index.less`,text, 'utf-8', function(err){
        if(err){
            console.log('err:', err);
        }
    })
})

// reset css文件夹
gulp.task('reset:css', async function () {
   await  del([`${root}/css/**/*`]);
    fs.mkdir(`${root}/css/iconfont`, function(err){
        if(err){
            console.log('目录创建失败');
        }
    })
})


gulp.task('less', async function () {
    gulp.src(`${root}/less/iconfont/**`).pipe(gulp.dest(`${root}/css/iconfont`))

    await gulp.src([`${root}/less/**/*.less`, `!${root}/less/theme/*.less`])
        .pipe(less())
        .pipe(gulp.dest(`${root}/css`));
});


gulp.task('watch', async function () {
    gulp.watch([`${root}/**/*.less`], gulp.series('less'));
})


gulp.task('default', gulp.series('theme', 'reset:css', 'less',  gulp.parallel('watch', 'webserver')));


