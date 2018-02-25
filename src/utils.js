const leftPad = require('left-pad')
const fs = require('fs')
const { bugs } = require('../package.json')

exports.getFullDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = leftPad(today.getMonth(), 2, '0')
  const date = leftPad(today.getDate(), 2, '0')
  return `${year}-${month}-${date}`
}

exports.parseJSON = data => {
  try {
    return JSON.parse(data)
  } catch (err) {
    return {}
  }
}

exports.isFileAvailable = (filepath, cwd = '.') => {
  try {
    return fs.readFileSync(`${cwd}/${filepath}`)
  } catch (err) {
    return false
  }
}

exports.questions = {
  dockerRegistry: {
    type: 'input',
    name: 'registry',
    message: 'What would be the docker registry',
    default: 'registry.jorgeadolfo.com'
  }
}

exports.canIOverwriteYourFile = outputName => [
  {
    type: 'expand',
    message: `Conflict on \`${outputName}\`: `,
    default: 'Y',
    name: 'overwrite',
    choices: [
      {
        key: 'y',
        name: 'Overwrite',
        value: 'overwrite'
      },
      {
        key: 'a',
        name: 'Overwrite this one and all next',
        value: 'overwrite_all'
      },
      {
        key: 'x',
        name: 'Keep original',
        value: 'abort'
      }
    ]
  }
]

exports.createDir = (filepath, cwd = '.') => {
  try {
    fs.mkdirSync(`${cwd}/${filepath}`)
    return true
  } catch (err) {
    // we know it fails because the folder already exists
    const dirExists = err.message.indexOf('EEXIST:') === 0
    if (!dirExists) {
      throw err
    }
  }
}

exports.replaceAll = (target, search, replacement) =>
  target.replace(new RegExp(search, 'g'), replacement)

exports.handleError = err => {
  const lines = err.stack.split('\n')
  const line = lines.length > 1 ? lines[1].trim() : ''
  const words = line.split(' ')
  const error = {
    message: err.message,
    method: words.length > 1 ? words[1] : undefined,
    file: words.length > 2 ? words[2] : undefined
  }
  const errorJSON = JSON.stringify(error, null, 2)
  console.log(`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  ⚠️ This Error is not handled ⚠️

${errorJSON}

  Report issue to: ${bugs.url}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`)
  return error
}
