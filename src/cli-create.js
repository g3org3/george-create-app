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
  questions,
  isFileAvailable
} = require('./utils')

const enquirer = new Enquirer()
enquirer.register('expand', require('prompt-expand'))
enquirer.register('input', require('prompt-input'))

const addScripts = (pkg, cwd = '.', custom = false) => {
  const pkgPath = `${cwd}/package.json`
  const scripts = custom || {
    test: 'gg-scripts test',
    start: 'node src/index.js',
    'test:w': 'gg-scripts test:w',
    lint: 'gg-scripts lint',
    format: 'gg-scripts format',
    coverage: 'gg-scripts coverage',
    build: 'gg-scripts docker-build',
    up: 'gg-scripts docker-run',
    stop: 'gg-scripts docker-stop',
    'deploy-init': 'gg-scripts deploy-init',
    deploy: 'gg-scripts deploy'
  }
  pkg.scripts = Object.assign(pkg.scripts, scripts)
  const pkgStr = JSON.stringify(pkg, null, 2)
  fs.writeFileSync(pkgPath, pkgStr)
  console.log(' 🔥 update package.json scripts')
}

const replaceTokensInString = (tokens, file) =>
  Object.keys(tokens).reduce(
    (content, key) => replaceAll(content, `#{${key}}`, tokens[key]),
    file
  )

const readAndReplaceFileContent = (name, tokens, fileLocalPath, outputName) => {
  const filePath = path.resolve(__dirname, `../templates/${name}`)
  const file = fs.readFileSync(filePath).toString()
  const content = replaceTokensInString(tokens, file)
  fs.writeFileSync(fileLocalPath, content)
}

let overwriteAll = false
const addTemplateFile = async (name, options = {}) => {
  const outputName = options.outputName || (options.hidden ? `.${name}` : name)
  const cwd = options.cwd || '.'
  const tokens = options.tokens || []
  const fileLocalPath = `${cwd}/${outputName}`
  try {
    fs.readFileSync(fileLocalPath)
    // ask to replace her/his file
    if (!overwriteAll) {
      const { overwrite } = await enquirer.ask(
        canIOverwriteYourFile(outputName)
      )
      if (overwrite === 'overwrite_all') {
        overwriteAll = true
      }
      switch (overwrite) {
        case 'overwrite':
        case 'overwrite_all': {
          readAndReplaceFileContent(name, tokens, fileLocalPath, outputName)
          console.log(` 📝 ${outputName} [overwrited]`)
          break
        }
        case 'abort': {
          console.log(` 📝 ${outputName} [SKIPED]`)
        }
      }
    } else {
      // we have permission to overwrite all files
      readAndReplaceFileContent(name, tokens, fileLocalPath, outputName)
      console.log(` 📝 ${outputName} [overwrited]`)
    }
  } catch (err) {
    const fileNotFound = err.message.substr(0, 'ENOENT'.length) === 'ENOENT'
    if (fileNotFound) {
      readAndReplaceFileContent(name, tokens, fileLocalPath, outputName)
      console.log(` 📝 ${outputName}`)
    } else {
      throw err
    }
  }
  return outputName
}

const addComponentFiles = async (
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
  // set pkg defaults
  // update license type
  pkg.license = 'MIT'
  pkg.version = '0.0.1'
  pkg.main = 'src/index.js'

  addScripts(pkg, cwd, {
    build: 'rollup -c'
  })
  await addTemplateFile('editorconfig', { cwd, hidden: true })
  await addTemplateFile('gitignore', { cwd, hidden: true })
  await addTemplateFile('npmignore', { cwd, hidden: true })
  await addTemplateFile('LICENSE', { cwd, tokens })
  await addTemplateFile('CHANGELOG.md', { cwd, tokens })
  await addTemplateFile('component/babelrc', { cwd, outputName: '.babelrc' })
  await addTemplateFile('component/rollup.config.js', {
    cwd,
    outputName: 'rollup.config.js'
  })
  await addTemplateFile('component/index.js', {
    cwd,
    outputName: 'src/index.js'
  })
  await addTemplateFile('README.basic.md', {
    cwd,
    tokens,
    outputName: 'README.md'
  })
}

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

  addScripts(pkg, cwd)
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
  spawnSync('yarn', ['add', '--dev', 'gg-scripts'], {
    stdio: 'inherit',
    cwd
  })
}

const installDeps = ({ cwd = '.', dev, deps }) => {
  console.log(' 📦 installing dependencies')
  const args = ['add']
  if (dev) args.push('--dev')
  spawnSync('yarn', [...args, ...deps], {
    stdio: 'inherit',
    cwd
  })
}

const newProject = async (projectName, programName, args) => {
  const result = spawnSync('ls', [projectName])
  const notFound = result.stderr.toString()
  if (projectName && notFound) {
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

    if (args && args[0] === '--component') {
      const pkgJSON = isFileAvailable('package.json', relativePath)
      const pkg = parseJSON(pkgJSON)
      await addComponentFiles(pkg, projectName, relativePath)
      installDeps({
        dev: true,
        cwd,
        deps: [
          'babel-plugin-external-helpers',
          'babel-preset-env',
          'babel-preset-react',
          'rollup',
          'rollup-plugin-babel',
          'rollup-plugin-babel-minify',
          'rollup-plugin-commonjs',
          'rollup-plugin-node-resolve'
        ]
      })
      installDeps({
        cwd,
        deps: ['react', 'react-proptypes']
      })
    } else {
      const pkgJSON = isFileAvailable('package.json', relativePath)
      const pkg = parseJSON(pkgJSON)
      await addAllFiles(pkg, projectName, relativePath)
      installGGScripts(cwd)
    }
    console.log(' ⛏ git init')
    spawnSync('git', ['init'], { cwd })
    console.log()
    console.log(`> cd ${projectName}`)
    console.log('> npm start')
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

const setupEslintPrettierReact = async pkg => {
  console.log(' 📦 eslint prettier husky ... for react')
  await addTemplateFile('eslintrc', { hidden: true })
  const deps = [
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'prettier',
    'pretty-quick'
  ]
  installDeps({ dev: true, deps })
}
const setupEsLintPrettier = async pkg => {
  console.log(' 📦 eslint prettier husky ...')
  await addTemplateFile('eslintrc', { hidden: true })
  const deps = [
    'babel-eslint',
    'eslint',
    'eslint-config-prettier',
    'eslint-config-react-app',
    'eslint-plugin-flowtype',
    'eslint-plugin-import',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-prettier',
    'eslint-plugin-react',
    'pretty-quick',
    'prettier',
    'husky'
  ]
  installDeps({ dev: true, deps })
}

const setupDocker = async pkg => {
  createDir('docker')
  await addTemplateFile('dockerignore', { hidden: true })
  await addTemplateFile('Dockerfile', { outputName: 'docker/Dockerfile' })
  const { registry } = await enquirer.ask([questions.dockerRegistry])
  await addTemplateFile('docker-compose.yml', {
    outputName: 'docker/docker-compose.yml',
    tokens: {
      projectName: pkg.name,
      registry
    }
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

const cli = async () => {
  const programName = process.argv[1].substr(
    process.argv[1].lastIndexOf('/') + 1
  )
  const args = process.argv.slice(2)
  const cmd = args[0]
  // const flag = args.length > 1 ? args[1] : ''

  switch (cmd) {
    case '-v': {
      console.log({ version })
      break
    }
    case 'pre-commit': {
      console.log('run gg eslint-prettier')
      break
    }
    case 'run': {
      const cliargs = args.slice(1)
      spawnSync('./node_modules/.bin/gg-scripts', cliargs, { stdio: 'inherit' })
      break
    }
    case 'update': {
      await middleware(updateDependencies)
      break
    }
    case 'deploy': {
      await middleware(setupDeploy)
      break
    }
    case 'docker': {
      await middleware(setupDocker)
      break
    }
    case 'eslint-prettier-react': {
      await middleware(setupEslintPrettierReact)
      break
    }
    case 'eslint-prettier': {
      await middleware(setupEsLintPrettier)
      break
    }
    case 'init': {
      await middleware(init)
      break
    }
    case '-h':
    case '--help': {
      help(programName)
      break
    }
    default: {
      if (isFileAvailable('package.json')) {
        // check if the project has gg-scripts installed
        spawnSync('npm', ['run', ...args], { stdio: 'inherit' })
      } else {
        await newProject(cmd, programName, args.slice(1))
      }
    }
  }
}

module.exports = cli
