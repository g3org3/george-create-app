#!/usr/bin/env node
const spawnSync = require('child_process').spawnSync
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

const addEditorConfig = (cwd = '.') => {
  const editorConfigLocalPath = `${cwd}/.editorconfig`
  try {
    fs.readFileSync(editorConfigLocalPath)
    console.log('> delete your .editorconfig if you want ours')
  } catch (err) {
    const fileNotFound = err.message.substr(0, 'ENOENT'.length) === 'ENOENT'
    if (fileNotFound) {
      const editorConfigPath = path.resolve(
        __dirname,
        '../templates/editorconfig'
      )
      const editorConfig = fs.readFileSync(editorConfigPath)
      fs.writeFileSync(editorConfigLocalPath, editorConfig)
      console.log('> 📝 add .editorconfig')
    }
  }
}

const args = process.argv.slice(2)
const cmd = args[0]

switch (cmd) {
  case 'init': {
    const pkgJSON = isFileAvailable('package.json')
    if (pkgJSON) {
      addScripts(pkgJSON)
      addEditorConfig()
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
        addScripts(pkgJSON, relativePath)
        addEditorConfig(relativePath)
        spawnSync('npm', ['i', '--save-dev', 'gg-scripts'], options)

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
    console.log(`Unknown script "${cmd}".`)
    process.exit(1)
}
