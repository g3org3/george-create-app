[![Build Status][travis]][travis-url]
[![npm package][npm-image]](npm-url)
# george-create-app
cli to create base node apps with gg-scripts

## Getting Started
You will need Node >= 8 installed. [How do I install node? click here to find out about nvm](https://github.com/creationix/nvm#installation)

### Installation
```sh
npm install -g george-create-app
```

# Usage
### Create a new project
```sh
Examples:
  george-create-app <projectName>	Create a new project with <projectName>.
  george-create-app init		Install gg-scripts to current project and adds basics files like README, gitignore, etc.
  george-create-app update		Update dependency gg-scripts of current project
  george-create-app pre-commit		Install pre-commit git hook that runs prettier before any commit
  george-create-app -v			Shows cli version
```

## Development
Fork, then clone the repo:
```sh
git clone https://github.com/your-username/george-create-app.git
cd george-create-app
git remote set-url g3 https://github.com/g3org3/george-create-app.git
npm install
```

## Changelog
[https://github.com/g3org3/george-create-app/blob/master/CHANGELOG.md](https://github.com/g3org3/george-create-app/blob/master/CHANGELOG.md)

## Contributors
* George <7jagjag@gmail.com>

[travis]: https://travis-ci.org/g3org3/george-create-app.svg?branch=master
[travis-url]: https://travis-ci.org/g3org3/george-create-app
[npm-image]: https://img.shields.io/npm/v/george-create-app.svg?style=flat-square
[npm-url]: https://www.npmjs.org/package/george-create-app
