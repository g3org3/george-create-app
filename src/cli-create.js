const path = require('path')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const Enquirer = require('enquirer')
const version = require('../package.json').version
const {
  getFullDate,
  replaceAll,
  createDir,
  parseJSON,
  canIOverwriteYourFile,
  questions
} = require('./utils')

const enquirer = new Enquirer()
enquirer.register('expand', require('prompt-expand'))
enquirer.register('input', require('prompt-input'))

const addScripts = (pkg, cwd = '.') => {
  const pkgPath = `${cwd}/package.json`
  const scripts = {
    test: 'gg-scripts test',
    start: 'node src/index.js',
    'test:w': 'gg-scripts test:w',
    lint: 'gg-scripts lint',
    format: 'gg-scripts format',
    coverage: 'gg-scripts coverage',
    build: 'gg-scripts docker-build',
    up: 'gg-scripts docker-run',
    stop: 'gg-scripts docker-stop'
  }
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
  new Promise((resolve, reject) => {
    const outputName =
      options.outputName || (options.hidden ? `.${name}` : name)
    const cwd = options.cwd || '.'
    const tokens = options.tokens || []
    const fileLocalPath = `${cwd}/${outputName}`
    try {
      fs.readFileSync(fileLocalPath)
      // ask to replace her/his file
      if (!overwriteAll) {
        enquirer
          .ask(canIOverwriteYourFile(outputName))
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
      } else {
        // we have permission to overwrite all files
        readAndReplaceFile(name, tokens, fileLocalPath, outputName)
        console.log(` 📝 ${outputName} [overwrited]`)
        resolve(outputName)
      }
    } catch (err) {
      const fileNotFound = err.message.substr(0, 'ENOENT'.length) === 'ENOENT'
      if (fileNotFound) {
        readAndReplaceFile(name, tokens, fileLocalPath, outputName)
        console.log(` 📝 ${outputName}`)
      } else {
        console.log(' ⚠️ This is an unexpected error ⚠️ ', err)
      }
      resolve(outputName)
    }
  })

const addAllFiles = async (
  pkg,
  projectName,
  cwd,
  editCurrentProject = false
) => {
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
  await addTemplateFile('editorconfig', { cwd, hidden: true })
  await addTemplateFile('gitignore', { cwd, hidden: true })
  await addTemplateFile('npmignore', { cwd, hidden: true })
  await addTemplateFile('travis.yml', { cwd, hidden: true })
  await addTemplateFile('LICENSE', { cwd, tokens })
  await addTemplateFile('CHANGELOG.md', { cwd, tokens })
  await addTemplateFile('index.js', { cwd, tokens, outputName: 'src/index.js' })
  await addTemplateFile('README.basic.md', {
    cwd,
    tokens,
    outputName: 'README.md'
  })
  await addTemplateFile('index.test.js', {
    cwd,
    tokens,
    outputName: 'src/__tests__/index.test.js'
  })
}

const help = name => {
  console.log(`

Examples:
  ${name} <projectName>\tCreate a new project with <projectName>.
  ${name} init\t\tInstall gg-scripts to current project and adds basics files like README, gitignore, etc.
  ${name} update\t\tUpdate dependency gg-scripts of current project
  ${name} pre-commit\t\tInstall pre-commit git hook that runs prettier before any commit
  ${name} -v\t\t\tShows cli version

  `)
}

const installGGScripts = cwd => {
  console.log(' 📦 gg-scripts')
  spawnSync('npm', ['i', '--save-dev', 'gg-scripts'], {
    stdio: 'inherit',
    cwd
  })
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

      console.log(` 🔨 create \`${projectName}\``)
      createDir(projectName)
      createDir(`${projectName}/src`)
      createDir(`${projectName}/src/__tests__`)

      console.log(' 📝 package.json')
      spawnSync('npm', ['init', '-y'], { cwd })

      const pkgJSON = isFileAvailable('package.json', relativePath)
      const pkg = parseJSON(pkgJSON)
      addAllFiles(pkg, projectName, relativePath).then(() => {
        console.log(' ⛏ git init')
        spawnSync('git', ['init'], { cwd })

        installGGScripts(cwd)

        console.log()
        console.log(`> cd ${projectName}`)
        console.log('> npm start')
      })
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

const middleware = async next => {
  const pkgJSON = isFileAvailable('package.json')
  const pkg = parseJSON(pkgJSON)
  if (!pkg) {
    console.log('no node project detected here 🤔')
    return
  }
  await next(pkg)
  console.log()
  console.log(' ✨ done')
}

const init = async pkg => {
  createDir(`./src`)
  createDir(`./src/__tests__`)
  await addAllFiles(pkg, '', '.', true)
  installGGScripts()
}

const updateDependencies = async pkg => {
  delete pkg.devDependencies['gg-scripts']
  fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2))
  installGGScripts()
}

const setupDocker = async pkg => {
  createDir('docker')
  await addTemplateFile('dockerignore', { hidden: true })
  await addTemplateFile('Dockerfile', { outputName: 'docker/Dockerfile' })
  await addTemplateFile('docker-compose.yml', {
    outputName: 'docker/docker-compose.yml'
  })
}

const setupDeploy = async pkg => {
  createDir('deploy')
  const { registry } = await enquirer.ask([questions.dockerRegistry])
  const tokens = {
    projectName: pkg.name,
    registry
  }
  await addTemplateFile('deploy.yml', {
    outputName: 'deploy/deploy.yml',
    tokens
  })
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
      addTemplateFile('pre-commit', {
        outputName: '.git/hooks/pre-commit'
      }).then(() => {
        spawnSync('chmod', ['+x', '.git/hooks/pre-commit'])
        console.log(' ✨ done')
      })
      break
    }
    case 'update': {
      middleware(updateDependencies)
      break
    }
    case 'deploy': {
      middleware(setupDeploy)
      break
    }
    case 'docker': {
      middleware(setupDocker)
      break
    }
    case 'init': {
      middleware(init)
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

module.exports = cli
