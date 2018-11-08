#!/bin/node

const commandLineArgs = require('command-line-args')
const beautify = require('js-beautify').js_beautify

let migrate = require('../lib/migrate')

const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const optionDefinitions = [
  { name: 'preview', alias: 'p', type: Boolean, description: 'Show migration preview (does not change any files)' },
  { name: 'name', alias: 'n', type: String, description: 'Set migration name (default: "noname")' },
  { name: 'comment', alias: 'c', type: String, description: 'Set migration comment' },
  { name: 'execute', alias: 'x', type: Boolean, description: 'Create new migration and execute it' },
  { name: 'migrations-path', type: String, description: 'The path to the migrations folder' },
  { name: 'models-path', type: String, description: 'The path to the models folder' },
  { name: 'help', type: Boolean, description: 'Show this message' }
]

const options = commandLineArgs(optionDefinitions)

if (options.help) {
  console.log('Sequelize migration creation tool\n\nUsage:')
  optionDefinitions.forEach((option) => {
    let alias = (option.alias) ? ` (-${option.alias})` : '\t'
    console.log(`\t --${option.name}${alias} \t${option.description}`)
  })
  process.exit(0)
}

if (!process.env.PWD) {
  process.env.PWD = process.cwd()
}

let migrationsDir = path.join(process.env.PWD, options['migrations-path'] || 'migrations')

let modelsDir = path.join(process.env.PWD, options['models-path'] || 'models')

// current state
const currentState = {
  tables: {}
}

// load last state
let previousState = {
  revision: 0,
  version: 1,
  tables: {}
}

try {
  previousState = JSON.parse(fs.readFileSync(path.join(migrationsDir, '_current.json')))
} catch (e) { }

// console.log(path.join(migrationsDir, '_current.json'), JSON.parse(fs.readFileSync(path.join(migrationsDir, '_current.json') )))

let sequelize = require(modelsDir).sequelize

let models = sequelize.models

currentState.tables = migrate.reverseModels(sequelize, models)

let actions = migrate.parseDifference(previousState.tables, currentState.tables)

// sort actions
migrate.sortActions(actions)

let migration = migrate.getMigration(actions)

if (migration.commandsUp.length === 0) {
  console.log('No changes found')
  process.exit(0)
}

// log migration actions
_.each(migration.consoleOut, (v) => { console.log('[Actions] ' + v) })

if (options.preview) {
  console.log('Migration result:')
  console.log(beautify('[ \n' + migration.commandsUp.join(', \n') + ' \n];\n'))
  process.exit(0)
}

// backup _current file
if (fs.existsSync(path.join(migrationsDir, '_current.json'))) {
  fs.writeFileSync(path.join(migrationsDir, '_current_bak.json'),
    fs.readFileSync(path.join(migrationsDir, '_current.json'))
  )
}

// save current state
let date = new Date()
currentState.revision = [_.padStart(date.getUTCFullYear(), 4, '0'), _.padStart((date.getUTCMonth() + 1), 2, '0'), _.padStart(date.getUTCDate(), 2, '0'), _.padStart(date.getUTCHours(), 2, '0'), _.padStart(date.getUTCMinutes(), 2, '0'), _.padStart(date.getUTCSeconds(), 2, '0')].join('')
fs.writeFileSync(path.join(migrationsDir, '_current.json'), JSON.stringify(currentState, null, 4))
fs.writeFileSync(path.join(migrationsDir, '_current.json.' + currentState.revision), JSON.stringify(currentState, null, 4))

// write migration to file
let info = migrate.writeMigration(currentState.revision,
  migration,
  migrationsDir,
  (options.name) ? options.name : 'noname',
  (options.comment) ? options.comment : '')

console.log(`New migration to revision ${currentState.revision} has been saved to file '${info.filename}'`)

if (options.execute) {
  migrate.executeMigration(sequelize.getQueryInterface(), info.filename, 0, (err) => {
    if (!err) { console.log('Migration has been executed successfully') } else { console.log('Errors, during migration execution', err) }
    process.exit(0)
  })
} else { process.exit(0) }
