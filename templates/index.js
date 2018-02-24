// author: #{author}
// created: #{fullDate}
const { log } = console
const foo = bar => bar()
const bar = () => 'example code. 🔥\n'
const details =  () => `
-->  author: #{author}
--> created: #{fullDate}
`

setTimeout(() => log(foo(bar)), 1200)
log(details())

exports.foo = foo
exports.bar = bar
exports.details = details
