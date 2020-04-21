const execa = require( "execa" );

class Elektroniker {
  constructor() {

  }

  async run( ) {
    this.parseArgv();
    this.parseConfig();

    // run before start hook
    this.executeHook( this.config.onBeforeStart );

    // start application
    const subprocess = execa( "electron", [this.config.entry].concat(this.config.args) );


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
}

module.exports = Elektroniker;