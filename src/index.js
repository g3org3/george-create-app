#!/usr/bin/env node
const cli = require('./cli-create')
const checkIfUpdateAvailable = require('./checkIfUpdateAvailable')
const { bugs } = require('../package.json')

cli().catch(err => {
  const lines = err.stack.split('\n')
  const line = lines.length > 1 ? lines[1].trim() : ''
  const words = line.split(' ')
  const error = JSON.stringify(
    {
      message: err.message,
      method: words.length > 1 ? words[1] : undefined,
      file: words.length > 2 ? words[2] : undefined
    },
    null,
    2
  )
  console.log(`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ⚠️ This Error is not handled ⚠️

${error}

  Report issue to: ${bugs.url}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`)
})
checkIfUpdateAvailable().catch(err => {})
