#!/usr/bin/env node
const cli = require('./cli-create')
const checkIfUpdateAvailable = require('./checkIfUpdateAvailable')
const { handleError } = require('./utils')
const { bugs } = require('../package.json')

cli().catch(handleError)
checkIfUpdateAvailable().catch(handleError)
