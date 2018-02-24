const { foo, bar, details } = require('../')
global.console.log = () => {}

describe('#{projectName}', () => {
  it('should print example code', () => {
    expect(foo(bar)).toEqual('example code. 🔥\n')
    expect(bar()).toEqual('example code. 🔥\n')
    expect(details()).toEqual(`
-->  author: #{author}
--> created: #{fullDate}
`)
  })
})
