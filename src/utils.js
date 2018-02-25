const leftPad = require('left-pad')
const fs = require('fs')

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
    name: 'deleteFile',
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
    const dirExists = err.message.indexOf('EEXIST:') === 0
    if (!dirExists) {
      console.log(' ⚠️ This is an unexpected error ⚠️ ', err.message)
    }
  }
}

exports.replaceAll = (target, search, replacement) =>
  target.replace(new RegExp(search, 'g'), replacement)
