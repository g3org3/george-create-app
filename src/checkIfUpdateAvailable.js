const fs = require('fs')
const https = require('https')
const version = require('../package.json').version
const packageName = require('../package.json').name
const { getFullDate } = require('./utils')

const fetch = url =>
  new Promise((resolve, reject) => {
    https
      .get(url, resp => {
        let data = ''
        resp.on('data', chunk => (data += chunk))
        resp.on('end', () => resolve(data))
      })
      .on('error', err => reject(err))
  })

const store = filepath => ({
  put: ({ fullDate, remoteVersion }) =>
    fs.writeFileSync(
      filepath,
      JSON.stringify({ LastTryDate: fullDate, remoteVersion }, null, 2)
    ),
  get: () => {
    try {
      return JSON.parse(fs.readFileSync(filepath))
    } catch (err) {
      return {}
    }
  }
})

const getRemoteVersion = async name => {
  try {
    const svg = await fetch(
      `https://img.shields.io/npm/v/${name}.svg?style=flat-square`
    )
    const token = 'textLength="350">v'
    const pos = svg.lastIndexOf(token) + token.length
    const endPos = svg.lastIndexOf('</text>')
    return svg.substr(pos, endPos - pos)
  } catch (err) {
    return false
  }
}

const displayUpdateMessage = remoteVersion => {
  if (!remoteVersion) return
  console.log()
  console.log(` 🌨  New version available \`${packageName}@${remoteVersion}\` 🌨`)
  console.log(`  to update run: npm install -g ${packageName}`)
}

const isUpdateAvailable = async (filepath, packageName, version) => {
  const fullDate = getFullDate()
  const remoteVersion = await getRemoteVersion(packageName)
  store(filepath).put({ fullDate, remoteVersion })
  if (remoteVersion !== version) {
    displayUpdateMessage(remoteVersion)
    return true
  }
  return false
}

const checkIfUpdateAvailable = async () => {
  // global packageName, version
  const fullDate = getFullDate()
  const filepath = `/tmp/.${packageName}rc`
  const { LastTryDate } = store(filepath).get(packageName)
  if (LastTryDate !== fullDate) {
    await isUpdateAvailable(filepath, packageName, version)
  }
}

module.exports = checkIfUpdateAvailable
