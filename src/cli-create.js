#!/usr/bin/env node
const spawnSync = require('child_process').spawnSync
const version = require('../package.json').version
const path = require('path')
const fs = require('fs')

const addScripts = (pkgJSON, cwd = '.') => {
  const scripts = {
    test: 'gg-scripts test',
    'test:w': 'gg-scripts test:w',
    lint: 'gg-scripts lint',
    format: 'gg-scripts format'
  }
  const pkgPath = `${cwd}/package.json`
  const pkg = JSON.parse(pkgJSON)
  pkg.scripts = Object.assign(pkg.scripts, scripts)
  const pkgStr = JSON.stringify(pkg, null, 2)
  fs.writeFileSync(pkgPath, pkgStr)
  console.log('> 🔥 add scripts to package.json')
}

const isFileAvailable = (filepath, cwd = '.') => {
  try {
    return fs.readFileSync(`${cwd}/${filepath}`)
  } catch (err) {
    return false
  }
}

const addTemplateFile = (name, options = {}) => {
  const outputName = options.outputName || (options.hidden ? `.${name}` : name)
  const cwd = options.cwd || '.'
  const editorConfigLocalPath = `${cwd}/${outputName}`
  try {
    fs.readFileSync(editorConfigLocalPath)
    console.log(`> delete your ${outputName} if you want ours`)
  } catch (err) {
    const fileNotFound = err.message.substr(0, 'ENOENT'.length) === 'ENOENT'
    if (fileNotFound) {
      const editorConfigPath = path.resolve(
        __dirname,
        `../templates/${name}`
      )
      const editorConfig = fs.readFileSync(editorConfigPath)
      fs.writeFileSync(editorConfigLocalPath, editorConfig)
      console.log(`> 📝 add ${outputName}`)
    }
  }
}

const addAllFiles = (pkgJSON, cwd) => {
  addScripts(pkgJSON, cwd)
  addTemplateFile('editorconfig', { cwd, hidden: true })
  addTemplateFile('gitignore', { cwd, hidden: true })
  addTemplateFile('npmignore', { cwd, hidden: true })
  addTemplateFile('LICENSE', { cwd })
  addTemplateFile('README.basic.md', { cwd, outputName: 'README.md' })
}

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
      addAllFiles(pkgJSON)
      console.log('> ✨ done')
    } else {
      console.log('no node project detected here 🤔')
    }
    break
  }
  case 'new': {
    const projectName = args.length > 1 ? args[1] : ''
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

        console.log('> create:', projectName)
        fs.mkdirSync(projectName)

        console.log('> create: package.json')
        spawnSync('npm', ['init', '-y'], { cwd })

        const pkgJSON = isFileAvailable('package.json', relativePath)
        addAllFiles(pkgJSON, relativePath)

        console.log('> add: gg-scritps')
        spawnSync('npm', ['i', '--save-dev', 'gg-scripts'], options)

        console.log('> git init')
        spawnSync('git', ['init'], options)

        console.log('> ✨ done')
        console.log(`> cd ${projectName}`)
      } catch (err) {
        console.error('', err)
      }
    } else {
      if (projectName) {
        console.log('This folder', projectName, 'already exists.')
      } else {
        console.log('Please provide a project name.')
      }
    }
    break
  }
  default:
    console.log(`Unknown options "${cmd}".`)
    console.log('try:')
    console.log('  george-create-app new <projectName>')
    console.log('  george-create-app init')
    console.log('  george-create-app -v')
    process.exit(1)
}
