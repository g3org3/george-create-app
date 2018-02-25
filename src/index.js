#!/usr/bin/env node
const cli = require('./cli-create')
const checkIfUpdateAvailable = require('./checkIfUpdateAvailable')
const { handleError } = require('./utils')

cli().catch(handleError)
checkIfUpdateAvailable().catch(handleError)
