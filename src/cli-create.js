#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const Enquirer = require('enquirer')
const version = require('../package.json').version
const checkIfUpdateAvailable = require('./checkIfUpdateAvailable')
const { getFullDate, replaceAll } = require('./utils')

const enquirer = new Enquirer()

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
  Object.keys(tokens).reduce(
    (content, key) => replaceAll(content, `#{${key}}`, tokens[key]),
    file
  )

const readAndReplaceFile = (name, tokens, fileLocalPath, outputName) => {
  const filePath = path.resolve(__dirname, `../templates/${name}`)
  const file = fs.readFileSync(filePath).toString()
  const content = replaceTokensInString(tokens, file)
  fs.writeFileSync(fileLocalPath, content)
}

let overwriteAll = false
const addTemplateFile = (name, options = {}) =>
  new Promise((resolve, eject) => {
    const outputName =
      options.outputName || (options.hidden ? `.${name}` : name)
    const cwd = options.cwd || '.'
    const tokens = options.tokens || []
    const fileLocalPath = `${cwd}/${outputName}`
    try {
      fs.readFileSync(fileLocalPath)
      // ask to replace her/his file
      if (overwriteAll) {
        readAndReplaceFile(name, tokens, fileLocalPath, outputName)
        console.log(` 📝 ${outputName} [overwrited]`)
        resolve(outputName)
      } else {
        enquirer.register('expand', require('prompt-expand'))
        enquirer
          .ask([
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
          ])
          .then(answers => {
            const deleteFile = answers.deleteFile
            if (deleteFile === 'overwrite_all') {
              overwriteAll = true
            }
            if (deleteFile === 'overwrite' || deleteFile === 'overwrite_all') {
              readAndReplaceFile(name, tokens, fileLocalPath, outputName)
              console.log(` 📝 ${outputName} [overwrited]`)
            } else if (deleteFile === 'abort') {
              console.log(` 📝 ${outputName} [SKIPED]`)
            }
            resolve(outputName)
          })
          .catch(err => {
            console.log(err)
            resolve(outputName)
          })
      }
    } catch (err) {
      const fileNotFound = err.message.substr(0, 'ENOENT'.length) === 'ENOENT'
      if (fileNotFound) {
        readAndReplaceFile(name, tokens, fileLocalPath, outputName)
        console.log(` 📝 ${outputName}`)
      } else {
        console.log('This is an unexpected error:', err)
      }
      resolve(outputName)
    }
  })

const addAllFiles = (pkg, projectName, cwd, editCurrentProject = false) => {
  const tokens = {
    projectName,
    year: `${new Date().getFullYear()}`,
    author: pkg.author || '',
    fullDate: getFullDate()
  }

  if (!editCurrentProject) {
    // set pkg defaults
    // update license type
    pkg.license = 'MIT'
    pkg.version = '0.0.1'
    pkg.main = 'src/index.js'
  } else {
    tokens.projectName = pkg.name
  }

  addScripts(pkg, cwd, true)
  return Promise.resolve(true)
    .then(() => addTemplateFile('editorconfig', { cwd, hidden: true }))
    .then(() => addTemplateFile('gitignore', { cwd, hidden: true }))
    .then(() => addTemplateFile('npmignore', { cwd, hidden: true }))
    .then(() => addTemplateFile('travis.yml', { cwd, hidden: true }))
    .then(() => addTemplateFile('LICENSE', { cwd, tokens }))
    .then(() =>
      addTemplateFile('README.basic.md', {
        cwd,
        tokens,
        outputName: 'README.md'
      })
    )
    .then(() => addTemplateFile('CHANGELOG.md', { cwd, tokens }))
    .then(() =>
      addTemplateFile('index.js', { cwd, tokens, outputName: 'src/index.js' })
    )
    .then(() =>
      addTemplateFile('index.test.js', {
        cwd,
        tokens,
        outputName: 'src/__tests__/index.test.js'
      })
    )
}

const help = name => {
  console.log()
  console.log('Examples:')
  console.log(
    `  ${name} <projectName>\tCreate a new project with <projectName>.`
  )
  console.log(
    `  ${name} init\t\tInstall gg-scripts to current project and adds basics files like README, gitignore, etc.`
  )
  console.log(
    `  ${name} update\t\tUpdate dependency gg-scripts of current project`
  )
  console.log(
    `  ${name} pre-commit\t\tInstall pre-commit git hook that runs prettier before any commit`
  )
  console.log(`  ${name} -v\t\t\tShows cli version`)
  console.log()
}

const installGGScripts = () => {
  console.log(' 📦 gg-scripts')
  spawnSync('npm', ['i', '--save-dev', 'gg-scripts'], {
    stdio: 'inherit'
  })
  console.log()
  console.log(' ✨ done')
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

      installGGScripts()

      console.log()
      console.log(`> cd ${projectName}`)
      console.log('> npm start')
    } catch (err) {
      console.error('', err)
    }
  } else {
    if (projectName) {
      console.log(`The folder, \`${projectName}\` already exists.`)
    } else {
      console.log('Please provide a project name.')
      help(programName)
    }
  }
}

const init = () => {
  const pkgJSON = isFileAvailable('package.json')
  if (pkgJSON) {
    const pkg = JSON.parse(pkgJSON)
    addAllFiles(pkg, '', '.', true).then(() => installGGScripts)
  } else {
    console.log('no node project detected here 🤔')
  }
}

const updateDependencies = () => {
  const pkgJSON = isFileAvailable('package.json')
  if (pkgJSON) {
    const pkg = JSON.parse(pkgJSON)
    delete pkg.devDependencies['gg-scripts']
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2))
    installGGScripts()
  } else {
    console.log('no node project detected here 🤔')
  }
}

const cli = () => {
  const programName = process.argv[1].substr(
    process.argv[1].lastIndexOf('/') + 1
  )
  const args = process.argv.slice(2)
  const cmd = args[0]

  switch (cmd) {
    case '-v': {
      console.log({ version })
      break
    }
    case 'pre-commit': {
      addTemplateFile('pre-commit', { outputName: '.git/hooks/pre-commit' })
      spawnSync('chmod', ['+x', '.git/hooks/pre-commit'])
      break
    }
    case 'update': {
      updateDependencies()
      break
    }
    case 'init': {
      init()
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
checkIfUpdateAvailable()
