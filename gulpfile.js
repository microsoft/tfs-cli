var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var del = require('del');
var mocha = require('gulp-mocha');
var typescript = require('gulp-tsc');
var minimist = require('minimist');
var shell = require('shelljs');

gulp.task('compile', function(){
  gulp.src(['src/**/*.ts'])
    .pipe(typescript())
    .pipe(gulp.dest('dest/'))
});

var buildRoot = path.join(__dirname, '_build');
var appDest = path.join(buildRoot, 'app');
var resDest = path.join(appDest, 'exec', 'resources');
var testDest = path.join(buildRoot, 'test');

gulp.task('resources', ['clean'], function () {
    shell.mkdir('-p', resDest);
    return gulp.src(['app/exec/resources/*'])
        .pipe(gulp.dest(resDest));
});

gulp.task('copy', ['clean', 'resources'], function () {
	return gulp.src(['package.json', './README.md', './app/tfx-cli.js'])
		.pipe(gulp.dest(appDest));
});

gulp.task('compileApp', ['clean'], function () {
	return gulp.src(['app/**/*.ts'])
		.pipe(typescript({ declaration: false }))
		.pipe(gulp.dest(appDest));
});

gulp.task('compileTests', ['clean'], function () {
	return gulp.src(['tests/*.ts'])
		.pipe(typescript({ declaration: false }))
		.pipe(gulp.dest(testDest));
});

gulp.task('build', ['clean', 'compileApp', 'compileTests', 'copy']);

gulp.task('testprep', function () {
	return gulp.src(['tests/resources/*.*'])
		.pipe(gulp.dest(path.join(testDest, 'resources')));
});

var mopts = {
  boolean: 'ci',
  string: 'suite',
  default: { ci: false, suite: '*' }
};

var options = minimist(process.argv.slice(2), mopts);

gulp.task('test', ['testprep'], function () {
	var suitePath = path.join(testDest, '*.js');
	console.log(suitePath);
	if (options.suite !== '*') {
		suitePath = path.join(testPath, options.suite + '.js');
	}

	return gulp.src([suitePath])
		.pipe(mocha({ reporter: 'spec', ui: 'bdd', useColors: !options.ci }));
});

gulp.task('clean', function (done) {
	del([buildRoot], done);
});

gulp.task('default', ['build']);
