const leftPad = require('left-pad')

exports.getFullDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = leftPad(today.getMonth(), 2, '0')
  const date = leftPad(today.getDate(), 2, '0')
  return `${year}-${month}-${date}`
}

exports.replaceAll = (target, search, replacement) =>
  target.replace(new RegExp(search, 'g'), replacement)
