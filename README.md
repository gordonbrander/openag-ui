OpenAg UI
=========

The control panel for the OpenAg Food Computer (v1.1 and above).

[Launch UI](http://openaginitiative.github.io/openag_ui/).


Using
-----

You can use the hosted [web client](http://openaginitiative.github.io/openag_ui/). Each Food Computer also ships with a copy of the UI. Visiting the Food Computer's IP address will launch the UI.

[openaginitiative.github.io/openag_ui](http://openaginitiative.github.io/openag_ui/) will host the latest tagged release of the UI. Right now the UI is in-development, so it hosts the latest stable-ish prerelease.


Browser Support
---------------

The UI targets support for the following browsers:

- Firefox 47+
- Chrome 49+
- IE 11+
- Edge 14+
- Safari 9.1+
- iOS Safari 9.2
- Android 51
- Chrome for Android 51


Developing
----------

**Note:** these steps are only necessary if you are a developer who wants to help build the UI. If you just want to use the UI, all you need to do is [follow this link](http://openaginitiative.github.io/openag_ui/).

Want to contribute? Check out [CONTRIBUTING.md](https://github.com/OpenAgInitiative/openag-ui/blob/master/CONTRIBUTING.md).

We use a handful of front-end tools written in Node to bundle modules and compile new ES6 features into boring vanilla JavaScript. To do development work on the front-end, you'll need to set up these tools.

Prerequisites:

- [Node](http://nodejs.org)
- NPM (comes bundled with Node)

Install:

    cd ~/path/to/openag_ui/
    npm install

Build:

    npm run build

This will generate a folder called `./dist` containing everything necessary for the app to run in your browser. Copy `dist` wherever you like, or drag/drop `dist/index.html` on to your browser to run the app.

If you're doing active development, and want your JS files to automatically rebuild after you save, you can run

    npm run develop

This command will also generate source maps for the Javascript files.

The front-end can also log all the messages that go through the system to the console. This is useful for debugging, since the UI is deterministic and will reproduce the same UI for the same messages. To turn on this feature, add `?debug=true` to the end of the url.

    http://example.com/?debug=true

Deploying CouchApp
------------------

When doing development, you can deploy the result as a "CouchApp" -- a set of attachments stored in a CouchDB design document. This is how we host the UI on the Food Computer.

    grunt couchapp_deploy --app_db_url="http://raspberrypi:5984/app"

The `app_db_url` parameter is optional, and will default to `http://raspberrypi:5984/app`.