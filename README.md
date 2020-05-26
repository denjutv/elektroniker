# elektroniker
Elektroniker ([elɛkˈtʁoːnɪkɐ]; german for electronics technician) is a development tool for electron. It restarts application and frontend separately on changes. A change in your main process code will always trigger a restart of your electron application. If you configure a path to your render code. A change will only reload your BrowserWindow.
You also can define hooks on different change events.

## Install
Install with npm:

```bash
npm install --save-dev elektroniker
```

## Usage
To use elektroniker in your development you have to call startElektroniker both in your main and your frontend code. This starts a websocket connection between elektroniker and your frontend to emit to relaod event.

Call `startElektroniker` in your main process:
```code
const isElektronikerRunning = require("elektroniker").startElektroniker(process.argv);
```

To make `startElektroniker` available in your frontend you need a preload script for your BrowserWindow that requires "elektroniker/src/preload".
```code
require( "elektroniker/src/preload" );
```
You can use `isElektronikerRunning` to exclude it on production or if you already use a preload script you can distinguish between a production and a development preload script. See the following snippets:
```code
// Create the browser window.
const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    nodeIntegration: true,
    preload: path.join( __dirname, isElektroniker ? "preload.dev.js" : "preload.js" )
  }
});
```
And in your preload.dev.js you can simply require your preload script
```code
require( "elektroniker/src/preload" );
require( "./preload" );
```

Finaly you have to call startElektroniker in your frontend code.
```code
if( typeof startElektroniker !== "undefined" ) {
  startElektroniker();
}
```

## Run
Create a simple run srcipt in your package.json file.
```code
{
  "name": "test",
  "version": "0.1.0",
  "description": "",
  "main": "./src/main/index.js",
  "scripts": {
    "start": "electron ./src/main/index.js",
    "dev": "elektroniker ./src/main/index.js"
  }
```
Now you can run elektroniker by running the dev script:
```bash
npm run dev
```

## Configure

You can configure elektroniker by creating a `elektroniker.config.js` file that exports a config object.

| name | type | default | description
| :----------------: | :----------------: | :----------------: | :--------------------------------:
| entry | string | "./src/index.js" | Entry point to electron. Can also be set as first command line argument (see [Run](#Run)).
| args | array | [] | Command line arguments that will be passed to electron.
| watchPath | string or object | "./src" | Ether a string to the path to be watched for changes or an object<br> with a main and a render property. Both have to be strings of paths to your main and your render code. If<br> watchPath is a string then a change in the watched path will always trigger a restart of the electron<br> application. If you pass an object, a change on the main path will also restart the application. A change of<br> the render code will only result in a reload of your BrowserWindow.
| onBeforeStart | function | null | Hook that is called once before your main process is started.
| onMainChange | function | null | Hook that is called on a change in the main process code, but before the application is restarted.
| onRenderChange | function | null | Hook that is called on a change in the render process code, but before the window is relaoded.

All hooks can return promises. In that case a restart or reload is only triggered if the promise resolves.

Here is sample elektroniker.config.js file that runs a webpack build before the application start and before each reload of the frontend code.
```code
const path = require( "path" );

module.exports = {
  watchPath: {
    main: path.join( __dirname, "src", "main" ),
    render: path.join( __dirname, "src", "render" )
  },
  onBeforeStart: () => {
    return runWebpack();
  },
  onMainChange: () => {
    console.log( "foo" );
  },
  onRenderChange: () => {
    return runWebpack();
  }
}

function runWebpack() {
  const webpack = require("webpack");
  const { promisify } = require("util");
  const config = require("./webpack.config");
  const webpackAsync = promisify( webpack );

  return webpackAsync( config );
}
```