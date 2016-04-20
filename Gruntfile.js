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
          "./dist/main.js": ["./src/main.js"]
        }
      }
    },
    watch: {
      scripts: {
        files: ["./src/**/*.js"],
        tasks: ["browserify"]
      }
    }
  });

  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("default", ["watch"]);
  grunt.registerTask("build", ["browserify"]);
  grunt.registerTask("develop", ["browserify", "watch"]);
};
