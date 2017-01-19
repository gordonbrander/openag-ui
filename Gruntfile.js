module.exports = function (grunt) {
  var appDbUrl = grunt.option('app_db_url') || 'http://raspberrypi:5984/app';

  // Configuration for the CouchApp grunt plugin.
  // We set this configuration object on properties of `grunt.initConfig`
  // below.
  // https://www.npmjs.com/package/grunt-couchapp.
  var couch = {
    openag_ui: {
      db: appDbUrl,
      app: './couchapp.js',
      options: {
        okay_if_missing: true,
        okay_if_exists: true
      }
    }
  }

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
    },
    mkcouchdb: couch,
    rmcouchdb: couch,
    couchapp: couch
  });

  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-couchapp");

  grunt.registerTask("default", ["build"]);
  grunt.registerTask("build", ["browserify:dist", "copy"]);
  grunt.registerTask('couchapp_install', ['rmcouchdb:openag_ui', 'mkcouchdb:openag_ui', 'couchapp:openag_ui']);
  grunt.registerTask('couchapp_deploy', ['build', 'couchapp_install']);
  grunt.registerTask("develop", ["browserify:dev", "copy", "watch"]);
};
