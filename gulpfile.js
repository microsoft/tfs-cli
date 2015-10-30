var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var del = require('del');
var mocha = require('gulp-mocha');
var tsb = require('gulp-tsb');
var filter = require('gulp-filter');
var minimist = require('minimist');
var shell = require('shelljs');
var tsconfig = require('./tsconfig.json');
var compilation = tsb.create(tsconfig.compilerOptions);

var sources = [
	'app/**',
	'tests/**',
	'typings/**/*.d.ts'
];

gulp.task('build', ['clean'], function () {
	var tsFilter = filter('**/*.ts', { restore: true });
	
	return gulp.src(sources, { base: '.' })
		.pipe(tsFilter)
		.pipe(compilation())
		.pipe(tsFilter.restore)
		.pipe(gulp.dest('_build'));
});

var mopts = {
  boolean: 'ci',
  string: 'suite',
  default: { ci: false, suite: '*' }
};

var options = minimist(process.argv.slice(2), mopts);

gulp.task('test', function () {
	var suitePath = path.join('_build', 'tests', '*.js');
	console.log(suitePath);
	if (options.suite !== '*') {
		suitePath = path.join('_build', 'tests', options.suite + '.js');
	}

	return gulp.src([suitePath])
		.pipe(mocha({ reporter: 'spec', ui: 'bdd', useColors: !options.ci }));
});

gulp.task('clean', function (done) {
	del(['_build'], done);
});

gulp.task('default', ['build']);
