const gulp = require('gulp');
const purgecss = require('gulp-purgecss') // plugin to remove unused css
const cleanCSS = require('gulp-clean-css'); // plugin to minify css
const babel = require("gulp-babel"); // plugin to transpile ES6 code
const concat = require('gulp-concat'); // plugin to bundle files into one
const uglify = require('gulp-uglify'); // plugin to minify javascripts
//const eslint  = require('gulp-eslint');
const imagemin = require('gulp-imagemin'); // Minify PNG, JPEG, GIF and SVG images
const pngquant = require('imagemin-pngquant');
const inlinesource = require('gulp-inline-source'); // Inline all <script>, <link> and <img> tags that contain the inline attribute with
const bro = require('gulp-bro'); //  bundle all js files into one and reduce your client file requests. Integration of gulp + browserify.


gulp.task('minify-css', async () => {
  return await gulp.src('css/*.css')
    .pipe(purgecss({
      content: ['*.html', 'js/main.js', 'js/restaurant_info.js']
    }))
    .pipe(cleanCSS({ compatibility: 'ie8', debug: true }, (details) => {
      console.log(`${details.name}: ${details.stats.originalSize}`);
      console.log(`${details.name}: ${details.stats.minifiedSize}`);
    }))
    .pipe(gulp.dest('build/css/'))
})


gulp.task('uglify-js', async () => {
  await gulp.src('js/*.js')
    .pipe(babel({ presets: ['env'] }))
    .pipe(uglify())
    // .pipe(concat('all.js'))
    .pipe(gulp.dest('build/js/'));
});

gulp.task('build', async () =>
  await gulp.src('build/js/*.js')
    .pipe(bro())
    .pipe(gulp.dest('build/js/'))
)

gulp.task('lint', async () => {
  return await src(['js/*.js'])
    // eslint() attaches the lint output to the "eslint" property
    // of the file object so it can be used by other modules.
    .pipe(eslint())
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format())
    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failAfterError last.
    .pipe(eslint.failAfterError());
});


gulp.task('image', async () => {
  return await gulp.src('img/*')
    .pipe(imagemin({
      progressive: true,
      use: [pngquant()]
    }))
    .pipe(gulp.dest('build/img/'));
});

gulp.task('inlinesource', async () => {
  return await gulp.src('*.html')
    .pipe(inlinesource())
    .pipe(gulp.dest('build'));
});


// Other way to run gulp task is by gulp.watch which gets called when file is change
// command to run task gulp <watch>
gulp.task('watch', async () => {
  await gulp.watch('css/*.css', ['minify-css']);
  await gulp.watch('js/*.js', ['lint', 'uglify-js']);
});

// default tasks that needs to be run
// command to run task gulp <TASK NAME>
// gulp.task('default', ['task1', 'task2', 'task3']);
gulp.task('default', (done) => {
  // place code for your default task here
  done();
});