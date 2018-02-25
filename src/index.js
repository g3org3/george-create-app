#!/usr/bin/env node
const cli = require('./cli-create')
const checkIfUpdateAvailable = require('./checkIfUpdateAvailable')

cli()
checkIfUpdateAvailable()
