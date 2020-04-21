const execa = require( "execa" );

class Elektroniker {
  constructor() {
    this.subprocess = null;
  }

  async run( ) {
    this.parseArgv();
    this.parseConfig();

    this.registerExitHandler();

    // run before start hook
    this.executeHook( this.config.onBeforeStart );

    // start application
    this.startApplication();

    // init watcher
    this.startWatcher();

    await this.subprocess;
  }

  parseArgv( ) {
    const argv = require('minimist')(process.argv.slice(2));

    const defaultArgv = {
    };

    this.argv = Object.assign( {}, defaultArgv, argv );
  }

  parseConfig( ) {
    const path = require( "path" );
    const defaultConfig = {
      entry: "./src/index.js",  // path to entry file
      args: [],                 // array of command line arguments for electron
      watchPath: "./src",       // single string || object { main, render }
      onBeforeStart: null,      // function (return promise) || string || object { command, args }
      onEnd: null,
      onMainChange: null,
      onRenderChange: null
    };

    let configPath = "";
    
    if( this.argv.config ) {
      configPath = path.join( process.cwd(), this.argv.config );
    }
    else {
      const findup = require( "findup-sync" );
      const findupPath = findup( "elektroniker.config.js" );
      if( findupPath ) {
        configPath = path.resolve(findupPath);
      }
    }

    const config = configPath ? require( configPath ) : {};

    this.config = Object.assign( {}, defaultConfig, config );
  }

  registerExitHandler() {
    //do something when app is closing
    process.on('exit', this.exitHandler.bind(this,{event:"exit"}));

    //catches ctrl+c event
    process.on('SIGINT', this.exitHandler.bind(this, {event:"SIGINT"}));

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', this.exitHandler.bind(this, {event:"SIGUSR1"}));
    process.on('SIGUSR2', this.exitHandler.bind(this, {event:"SIGUSR2"}));
  }

  exitHandler( event ) {
    console.log( event );

    this.killApplication();
  }

  async executeHook( hook ) {
    const type = typeof hook;
    
    // in case hook is null, which also resolves in type === "object"
    if( !hook ) {
      return;
    }

    switch( type ) {
      case "function":
        await hook();
        break;
      case "string":
        const {stdoutStr} = await execa( hook );
        console.log(stdoutStr);
        break;
      case "object":
        const {stdoutObj} = await execa( hook.command, hook.args );
        console.log(stdoutObj);
        break;
    }
  }

  startApplication() {
    console.log("start application");
    this.subprocess = execa( "electron", [this.config.entry].concat(this.config.args) );
    // this.subprocess.stdout.pipe(process.stdout);
  }

  killApplication() {
    console.log("kill application");
    if( this.subprocess && !this.subprocess.killed ) {
      this.subprocess.kill();
    }
  }

  startWatcher() {
    const chokidar = require('chokidar');
 
  // init chokidar
  chokidar.watch( this.config.watchPath, {ignoreInitial:true} ).on( "all", (event, path) => {

    if( ["add","change","unlink"].includes( event ) ) {
      console.log("restart", event, path);
      this.killApplication();

      this.executeHook( this.config.onMainChange );

      this.startApplication();
    }
  });
  }
}

module.exports = Elektroniker;