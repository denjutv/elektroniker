const execa = require("execa");

class Elektroniker {
  constructor() {
    this.subprocess = null;
    this.watchers = [];

    this.server = null;
    this.io = null;
  }

  async run() {
    this.parseArgv();
    this.parseConfig();

    this.registerExitHandler();

    // run before start hook
    this.executeHook(this.config.onBeforeStart);

    await this.startWebsockets();

    // start application
    this.startApplication();

    // init watcher
    this.startWatcher();

    await this.subprocess;
  }

  parseArgv() {
    const argv = require("minimist")(process.argv.slice(2));

    const defaultArgv = {};

    this.argv = Object.assign({}, defaultArgv, argv);
  }

  parseConfig() {
    const path = require("path");
    const defaultConfig = {
      entry: this.argv._.length ? this.argv._[0] : "./src/index.js", // path to entry file
      args: [], // array of command line arguments for electron
      watchPath: "./src", // single string || object { main, render }
      onBeforeStart: null, // function (return promise) || string || object { command, args }
      onEnd: null,
      onMainChange: null,
      onRenderChange: null
    };

    let configPath = "";

    if (this.argv.config) {
      configPath = path.join(process.cwd(), this.argv.config);
    } else {
      const findup = require("findup-sync");
      const findupPath = findup("elektroniker.config.js");
      if (findupPath) {
        configPath = path.resolve(findupPath);
      }
    }

    const config = configPath ? require(configPath) : {};

    this.config = Object.assign({}, defaultConfig, config);
  }

  registerExitHandler() {
    //do something when app is closing
    process.on("exit", this.exitHandler.bind(this, { event: "exit" }));

    //catches ctrl+c event
    process.on("SIGINT", this.exitHandler.bind(this, { event: "SIGINT" }));

    // catches "kill pid" (for example: nodemon restart)
    process.on("SIGUSR1", this.exitHandler.bind(this, { event: "SIGUSR1" }));
    process.on("SIGUSR2", this.exitHandler.bind(this, { event: "SIGUSR2" }));
  }

  async exitHandler(event) {
    console.log(event);

    // close webserver
    const util = require("util");
    const closeServerAsync = util.promisify(
      this.server.close.bind(this.server)
    );
    await closeServerAsync();

    // close watcher
    this.watchers.forEach((watchEntry) => {
      watchEntry.watcher.unwatch(watchEntry.path); // comment this out and process will hang on OSX
      watchEntry.watcher.close();
    });

    this.killApplication();
  }

  async executeHook(hook) {
    const type = typeof hook;

    // in case hook is null, which also resolves in type === "object"
    if (!hook) {
      return;
    }

    switch (type) {
      case "function":
        await hook();
        break;
      case "string":
        const { stdoutStr } = await execa(hook);
        console.log(stdoutStr);
        break;
      case "object":
        const { stdoutObj } = await execa(hook.command, hook.args);
        console.log(stdoutObj);
        break;
    }
  }

  startApplication() {
    console.log("start application");
    this.subprocess = execa(
      "electron",
      [this.config.entry, "--elektroniker-port=" + this.port].concat(
        this.config.args
      )
    );
    this.subprocess.stdout.pipe(process.stdout);
  }

  killApplication() {
    console.log("kill application");
    if (this.subprocess && !this.subprocess.killed) {
      if (process.platform !== "win32") {
        this.subprocess.kill();
      } else if (this.subprocess._handle) {
        // workaround, because subprocess.kill doesn't work
        // https://stackoverflow.com/questions/23706055/why-can-i-not-kill-my-child-process-in-nodejs-on-windows
        const spawn = require("child_process").spawn;
        spawn("taskkill", ["/pid", this.subprocess._handle.pid, "/f", "/t"]);
      }
    }
  }

  async startWebsockets() {
    const portfinder = require("portfinder");
    this.port = await portfinder.getPortPromise();

    this.server = require("http").createServer();
    this.io = require("socket.io")(this.server);
    this.io.on("connection", (client) => {
      console.log("frontend connected");
      // this.frontends.push( client );
      // client.on("event", data => { /* … */ });
      // client.on("disconnect", () => { /* … */ });
    });
    this.server.listen(this.port);
  }

  startWatcher() {
    const typeOfPath = typeof this.config.watchPath;

    // init chokidar
    if (typeOfPath === "string") {
      this._watchMain(this.config.watchPath);
    } else if (
      typeOfPath === "object" &&
      this.config.watchPath.main &&
      this.config.watchPath.render
    ) {
      this._watchMain(this.config.watchPath.main);
      this._watchRender();
    } else {
      throw "Invalid watch path";
    }
  }

  _watchMain(watchPath) {
    const chokidar = require("chokidar");
    console.log(`start watching main (${watchPath})`);

    const watcher = chokidar.watch(watchPath, { ignoreInitial: true });
    watcher.on("all", async (event, path) => {
      if (["add", "change", "unlink"].includes(event)) {
        console.log("restart", event, path);
        this.killApplication();

        await this.executeHook(this.config.onMainChange);

        this.startApplication();
      }
    });

    this.watchers.push({ watcher, path: watchPath });
  }

  _watchRender() {
    const chokidar = require("chokidar");
    console.log("start watching render");
    const watcher = chokidar.watch(this.config.watchPath.render, {
      ignoreInitial: true
    });

    watcher.on("all", async (event, path) => {
      if (["add", "change", "unlink"].includes(event)) {
        console.log("frontend", event, path);

        await this.executeHook(this.config.onRenderChange);

        // broadcast to all connected sockets
        io.emit("reload");
      }
    });

    this.watchers.push({ watcher, path: this.config.watchPath.render });
  }
}

const { ELEKTRONIKER_GET_PORT } = require("./channel");

module.exports = {
  Elektroniker,
  startElektroniker: (argv) => {
    const arguments = require("minimist")(argv.slice(2));

    if (arguments["elektroniker-port"]) {
      const port = arguments["elektroniker-port"];

      const { ipcMain } = require("electron");

      // handle ipc message by dispatching them to the store
      ipcMain.on(ELEKTRONIKER_GET_PORT, (event, message) => {
        event.sender.send(ELEKTRONIKER_GET_PORT, { port });
      });

      // if( !Array.isArray(browserWindows) ) {
      //   browserWindows = [browserWindows];
      // }

      // browserWindows.forEach( win => win.webContents.send('elektroniker-port', {port}) );
    }
  }
};
