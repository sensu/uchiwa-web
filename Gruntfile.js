'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        'Gruntfile.js',
        'js/{,*/}*.js',
      ]
    },
    karma: {
      unit: {
        configFile: 'test/karma/conf.js'
      }
    },
    lintspaces: {
      all: {
        src: [
          'js/**/*.js'
        ],
        options: {
          newline: true,
          newlineMaximum: 2,
          indentation: 'spaces',
          spaces: 2,
          trailingspaces: true
        }
      }
    },
    sass: {
      dist: {
        files: [{
          expand: true,
          cwd: 'css',
          src: ['**/*.scss'],
          dest: 'css',
          ext: '.css'
        }]
      }
    },
    watch: {
      scss: {
        files: ['css/**/*.scss'],
        tasks: ['sass:dist'],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.registerTask('dev', [
    'watch:scss'
  ]);

  grunt.registerTask('lint', [
    'newer:jshint'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'lintspaces',
    'karma:unit'
  ]);
};
