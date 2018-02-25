const { replaceAll, parseJSON, getFullDate, handleError } = require('../utils')

describe('Utils', () => {
  describe('replaceAll', () => {
    it('shoud replace all ocurrencies of TOKEN', () => {
      const sample = 'I want to eat TOKEN and TOKEN also TOKEN'
      const result = replaceAll(sample, 'TOKEN', 'apples')
      expect(result).toEqual('I want to eat apples and apples also apples')
    })
  })

  describe('parseJSON', () => {
    it('shoud parse JSON if valid string', () => {
      const result = parseJSON('{"name":"Bob"}')
      expect(result).toEqual({ name: 'Bob' })
    })
    it('shoud return {} if not valid json string', () => {
      const result = parseJSON('{"name" 1:"Bob"}')
      expect(result).toEqual({})
    })
  })

  describe('getFullDate', () => {
    it('shoud return date in YYYY-MM-DD', () => {
      global.Date = function () {
        return {
          getFullYear: () => '2013',
          getMonth: () => '02',
          getDate: () => '01'
        }
      }
      const result = getFullDate()
      expect(result).toEqual('2013-02-01')
    })
  })

  describe('handleError', () => {
    global.console = { log: () => {} }
    it('shoud format error ouput', () => {
      const result = handleError(new Error('this is the message'))
      const keys = Object.keys(result)
      expect(keys).toEqual(['message', 'method', 'file'])
      expect(result.message).toEqual('this is the message')
      expect(result.method).toEqual('Object.it')
      expect(result.file.length > 5).toEqual(true)
    })
  })
})
