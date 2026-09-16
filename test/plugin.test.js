import test from 'node:test'
import assert from 'node:assert/strict'
import { name, apply } from '../dist/index.js'

test('Cordis plugin exports name and apply function', () => {
  assert.equal(name, 'dsh-player')
  assert.equal(typeof apply, 'function')
})

test('Cordis plugin registers player command on context', () => {
  let registeredCmd = ''
  let registeredDesc = ''
  const optionsMap = {}

  const mockCtx = {
    command(cmd, desc) {
      registeredCmd = cmd
      registeredDesc = desc
      const cmdObj = {
        alias() {
          return cmdObj
        },
        option(name, desc, defaults) {
          optionsMap[name] = { desc, defaults }
          return cmdObj
        },
        action(fn) {
          cmdObj.actionFn = fn
          return cmdObj
        }
      }
      return cmdObj
    }
  }

  apply(mockCtx)

  assert.equal(registeredCmd, 'player <file>')
  assert.match(registeredDesc, /播放/)
  assert.ok(optionsMap['port'])
  assert.ok(optionsMap['export'])
  assert.ok(optionsMap['mask'])
})
