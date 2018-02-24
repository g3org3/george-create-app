#!/usr/bin/env node
const leftPad = require('left-pad')
const spawnSync = require('child_process').spawnSync
const version = require('../package.json').version
const packageName = require('../package.json').name
const path = require('path')
const fs = require('fs')

const replaceAll = (target, search, replacement) => target.replace(new RegExp(search, 'g'), replacement)

const addScripts = (pkgJSON, cwd = '.', parsed = false) => {
  const scripts = {
    start: 'node src/index.js',
    test: 'gg-scripts test',
    'test:w': 'gg-scripts test:w',
    lint: 'gg-scripts lint',
    format: 'gg-scripts format',
    coverage: 'gg-scripts coverage'
  }
  const pkgPath = `${cwd}/package.json`
  const pkg = parsed ? pkgJSON : JSON.parse(pkgJSON)
  pkg.scripts = Object.assign(pkg.scripts, scripts)
  const pkgStr = JSON.stringify(pkg, null, 2)
  fs.writeFileSync(pkgPath, pkgStr)
  console.log(' 🔥 update package.json scripts')
}

const isFileAvailable = (filepath, cwd = '.') => {
  try {
    return fs.readFileSync(`${cwd}/${filepath}`)
  } catch (err) {
    return false
  }
}

const replaceTokensInString = (tokens, file) =>
  Object.keys(tokens).reduce((content, key) =>
    replaceAll(content, `#{${key}}`, tokens[key])
    , file)

const addTemplateFile = (name, options = {}) => {
  const outputName = options.outputName || (options.hidden ? `.${name}` : name)
  const cwd = options.cwd || '.'
  const tokens = options.tokens || []
  const fileLocalPath = `${cwd}/${outputName}`
  try {
    fs.readFileSync(fileLocalPath)
    console.log(`> delete your ${outputName} if you want ours`)
  } catch (err) {
    const fileNotFound = err.message.substr(0, 'ENOENT'.length) === 'ENOENT'
    if (fileNotFound) {
      const filePath = path.resolve(
        __dirname,
        `../templates/${name}`
      )
      const file = fs.readFileSync(filePath).toString()
      const content = replaceTokensInString(tokens, file)
      fs.writeFileSync(fileLocalPath, content)
      console.log(` 📝 ${outputName}`)
    } else {
      console.log('This is an unexpected error:', err)
    }
  }
}

const getFullDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = leftPad(today.getMonth(), 2, '0')
  const date = leftPad(today.getDate(), 2, '0')
  return `${year}-${month}-${date}`
}

const addAllFiles = (pkg, projectName, cwd) => {
  const tokens = {
    projectName,
    year: `${year}`,
    author: pkg.author || '',
    fullDate: getFullDate()
  }
  // set pkg defaults
  // update license type
  pkg.license = 'MIT'
  pkg.version = '0.0.1'
  pkg.main = 'src/index.js'

  addScripts(pkg, cwd, true)
  addTemplateFile('editorconfig', { cwd, hidden: true })
  addTemplateFile('gitignore', { cwd, hidden: true })
  addTemplateFile('npmignore', { cwd, hidden: true })
  addTemplateFile('travis.yml', { cwd, hidden: true })
  addTemplateFile('LICENSE', { cwd, tokens })
  addTemplateFile('README.basic.md', { cwd, tokens, outputName: 'README.md' })
  addTemplateFile('CHANGELOG.md', { cwd, tokens })
  addTemplateFile('index.js', { cwd, tokens, outputName: 'src/index.js' })
  addTemplateFile('index.test.js', { cwd, tokens, outputName: 'src/__tests__/index.test.js' })
}

const help = (name) => {
  console.log('Examples:')
  console.log(`  ${name} <projectName>\tCreate a new project with <projectName>.`)
  console.log(`  ${name} new <projectName>\tCreate a new project with <projectName>.`)
  console.log(`  ${name} init\t\tInstall gg-scritps to current project.`)
  console.log(`  ${name} -v\t\t\tShows cli version`)
}

const newProject = (projectName, programName) => {
  const result = spawnSync('ls', [projectName])
  const notFound = result.stderr.toString()
  if (projectName && notFound) {
    try {
      const pwd = spawnSync('pwd')
        .stdout.toString()
        .trim()
      const cwd = path.join(pwd, projectName)
      const relativePath = `./${projectName}`
      const options = { cwd, stdio: 'inherit' }

      console.log(` 🔨 create \`${projectName}\``)
      fs.mkdirSync(projectName)
      fs.mkdirSync(`${projectName}/src`)
      fs.mkdirSync(`${projectName}/src/__tests__`)

      console.log(' 📝 package.json')
      spawnSync('npm', ['init', '-y'], { cwd })

      const pkgJSON = isFileAvailable('package.json', relativePath)
      const pkg = JSON.parse(pkgJSON)
      addAllFiles(pkg, projectName, relativePath)

      console.log(' ⛏ git init')
      spawnSync('git', ['init'], { cwd })

      console.log(' 📦 gg-scripts')
      spawnSync('npm', ['i', '--save-dev', 'gg-scripts'], options)

      console.log()

      console.log(' ✨ done')
      console.log()
      console.log(`> cd ${projectName}`)
      console.log('> npm start')
    } catch (err) {
      console.error('', err)
    }
  } else {
    if (projectName) {
      console.log(`This folder, \`${projectName}\` already exists.`)
    } else {
      console.log('Please provide a project name.')
      help(programName)
    }
  }
}

const cli = () => {
  const programName = process.argv[1].substr(process.argv[1].lastIndexOf('/') + 1)
  const args = process.argv.slice(2)
  const cmd = args[0]
  
  switch (cmd) {
    case '-v': {
      console.log({ version })
      break
    }
    case 'init': {
      const pkgJSON = isFileAvailable('package.json')
      if (pkgJSON) {
        addScripts(pkgJSON)
        console.log(' 📦 gg-scripts')
        spawnSync('npm', ['i', '--save-dev', 'gg-scripts'], { stdio: 'inherit' })
        console.log(' ✨ done')
      } else {
        console.log('no node project detected here 🤔')
      }
      break
    }
    case 'new': {
      newProject(args.length > 1 ? args[1] : '', programName)
      break
    }
    case '-h':
    case '--help': {
      help(programName)
      process.exit(1)
    }
    default:
      newProject(cmd, programName)
  }  
}

cli()

/**
 * Check for update
*/
const fetch = (url, cb) => {
  require('https')
    .get(url, (resp) => {
      let data = ''
      resp.on('data', (chunk) => (data += chunk))
      resp.on('end', () => (typeof cb === 'function') && cb(null, data))
    })
    .on('error', (err) => (typeof cb === 'function') && cb(err))
}
const getRemoteVersion = (name, cb) => {
  fetch(`https://img.shields.io/npm/v/${name}.svg?style=flat-square`, (err, response) => {
    if (!err) {
      const pos = response.lastIndexOf('textLength="350">v') + 'textLength="350">v'.length
      const endPos = response.lastIndexOf('</text>')
      cb(response.substr(pos, endPos - pos))
    } else {
      cb(false)
    }
  })
}

const isUpdateAvailable = (filepath, fullDate) => getRemoteVersion(packageName, (remoteVersion) => {
  if (remoteVersion && remoteVersion !== version) {
    console.log(`new version available ${packageName}@${remoteVersion}`)
  }
  fs.writeFileSync(filepath, JSON.stringify({ fullDate }, null, 2))
})

const checkIfUpdateAvailable = () => {
  const fullDate = getFullDate()
  const filepath = `/tmp/.${packageName}rc`
  try {
    const LastTryDate = JSON.parse(fs.readFileSync(filepath)).fullDate
    if (LastTryDate !== fullDate) {
      isUpdateAvailable(filepath, fullDate)
    }
  } catch (err) {
    isUpdateAvailable(filepath, fullDate)
  }
}
checkIfUpdateAvailable()
