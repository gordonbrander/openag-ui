const CONFIG = require('./openag-config.json');

module.exports = function (grunt) {
  grunt.initConfig({
    browserify: {
      dist: {
        options: {
          browserifyOptions: {
            // Set source maps?
            debug: CONFIG.debug
          },
          transform: [
            ["babelify", {
              "presets": ["es2015"]
            }]
          ]
        },
        files: {
          // if the source file has an extension of es6 then
          // we change the name of the source file accordingly.
          // The result file's extension is always .js
          "./dist/scripts/main.js": ["./scripts/main.js"]
        }
      }
    },
    copy: {
      main: {
        files: [
          {
            src: ['assets/**'],
            dest: 'dist/'
          },
          {
            src: ['vendor/**'],
            dest: 'dist/'
          },
          {
            src: ['index.html'],
            dest: 'dist/index.html'
          }
        ]
      }
    },
    watch: {
      scripts: {
        files: [
          './scripts/**/*.js',
          './scripts/**/*.json',
          './assets/**',
          'openag-config.json'
        ],
        tasks: ["browserify"]
      }
    }
  });

  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("default", ["watch"]);
  grunt.registerTask("build", ["browserify", "copy"]);
  grunt.registerTask("develop", ["browserify", "copy", "watch"]);
};
