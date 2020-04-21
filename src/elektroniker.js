class Elektroniker {
  constructor() {

  }

  run( ) {
    this.parseArgv();
    this.parseConfig();
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
}

module.exports = Elektroniker;