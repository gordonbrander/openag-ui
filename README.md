Developing
----------

Want to contribute? Check out [CONTRIBUTING.md](https://github.com/OpenAgInitiative/openag-ui/blob/master/CONTRIBUTING.md).

We use a handful of front-end tools, written in Node, to bundle scripts, do
cross-browser compilation and more. To do development work on the front-end,
you'll need to set up these tools. (Note: these instructions are only for
developers. This is not necessesary if you simply
want to use the front-end.)

Prerequisites:

- [Node](http://nodejs.org)
- NPM (comes bundled with Node)

Install:

    cd ~/path/to/openag-ui/
    npm install

Build:

    npm run build

This will generate a folder called `./dist` containing everything necessary for
the app to run in your browser. Copy `dist` wherever you like, or drag/drop
`dist/index.html` on to your browser to run the app.

If you're doing active development, and want your JS files to automatically
rebuild after you save, you can run

    npm run develop

The front-end can also log all the messages that go through the system to the
console. This is useful for debugging, since the UI is deterministic and will
reproduce the same UI for the same messages. To turn on this feature, edit
`openag-config.json` and set the `debug` field to `true`.

```js
    {
      "debug": true
      // ...
    }
```

