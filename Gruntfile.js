module.exports = function (grunt) {
  grunt.initConfig({
    browserify: {
      dev: {
        options: {
          browserifyOptions: {
            // Set source maps
            debug: true
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
      },
      dist: {
        options: {
          browserifyOptions: {
            // Set source maps?
            debug: false
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
        tasks: ["browserify:dev", "copy"]
      }
    }
  });

  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("default", ["build"]);
  grunt.registerTask("build", ["browserify:dist", "copy"]);
  grunt.registerTask("develop", ["browserify:dev", "copy", "watch"]);
};
