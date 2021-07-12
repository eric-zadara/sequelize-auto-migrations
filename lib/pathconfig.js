const path = require('path'),
      fs   = require('fs');

module.exports = function(options){
    let sequelizercConfigs = [],
        sequelizercPath = path.join(process.env.PWD, '.sequelizerc');

    if (fs.existsSync(sequelizercPath)){
        sequelizercConfigs = require(sequelizercPath);
    }
    
    if(!process.env.PWD){
        process.env.PWD = process.cwd()
    }

    let response;
    if (sequelizercConfigs.config){
        response = require(sequelizercConfigs.config);
    } else {
        response = {};
    }

    let migrationsDir = path.join(process.env.PWD, 'migrations'),
        modelsDir = path.join(process.env.PWD, 'models');

    if (options['migrations-path']) {
        response.migrationsDir = path.join(process.env.PWD, options['migrations-path']);
    } else if (sequelizercConfigs['migrations-path']) {
        response.migrationsDir = sequelizercConfigs['migrations-path'];
    }
    
    if (options['models-path']) {
        response.modelsDir = path.join(process.env.PWD, options['models-path']);
    } else if (sequelizercConfigs['models-path']) {
        response.modelsDir = sequelizercConfigs['models-path'];
    }

    return response
}