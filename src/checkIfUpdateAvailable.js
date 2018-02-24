const fs = require('fs')
const version = require('../package.json').version
const packageName = require('../package.json').name
const { getFullDate } = require('./utils')

const fetch = (url, cb) => {
  require('https')
    .get(url, resp => {
      let data = ''
      resp.on('data', chunk => (data += chunk))
      resp.on('end', () => typeof cb === 'function' && cb(null, data))
    })
    .on('error', err => typeof cb === 'function' && cb(err))
}

const getRemoteVersion = (name, cb) => {
  fetch(
    `https://img.shields.io/npm/v/${name}.svg?style=flat-square`,
    (err, response) => {
      if (!err) {
        const pos =
          response.lastIndexOf('textLength="350">v') +
          'textLength="350">v'.length
        const endPos = response.lastIndexOf('</text>')
        cb(response.substr(pos, endPos - pos))
      } else {
        // eslint-disable-next-line
        cb(false)
      }
    }
  )
}

const pleaseUpdateMessage = remoteVersion => {
  console.log()
  console.log(`New version available \`${packageName}@${remoteVersion}\``)
  console.log(`  to update run: npm install -g ${packageName}`)
}
const isUpdateAvailable = (filepath, fullDate) =>
  getRemoteVersion(packageName, remoteVersion => {
    if (remoteVersion && remoteVersion !== version) {
      pleaseUpdateMessage(remoteVersion)
    }
    fs.writeFileSync(
      filepath,
      JSON.stringify({ fullDate, remoteVersion }, null, 2)
    )
  })

const checkIfUpdateAvailable = () => {
  const fullDate = getFullDate()
  const filepath = `/tmp/.${packageName}rc`
  try {
    const data = JSON.parse(fs.readFileSync(filepath))
    const LastTryDate = data.fullDate
    const remoteVersion = data.remoteVersion
    if (LastTryDate !== fullDate) {
      isUpdateAvailable(filepath, fullDate)
    } else if (remoteVersion && remoteVersion !== version) {
    }
  } catch (err) {
    isUpdateAvailable(filepath, fullDate)
  }
}

module.exports = checkIfUpdateAvailable
