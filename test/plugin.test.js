import test from 'node:test'
import assert from 'node:assert/strict'
import { name, apply } from '../dist/index.js'

test('Cordis plugin exports name and apply function', () => {
  assert.equal(name, 'dsh-replay')
  assert.equal(typeof apply, 'function')
})

test('Cordis plugin registers replay command on context', () => {
  let registeredCmd = ''
  let registeredDesc = ''
  const optionsMap = {}

  const mockCtx = {
    command(cmd, desc) {
      registeredCmd = cmd
      registeredDesc = desc
      const cmdObj = {
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

  assert.equal(registeredCmd, 'replay <file>')
  assert.match(registeredDesc, /回放/)
  assert.ok(optionsMap['port'])
  assert.ok(optionsMap['export'])
  assert.ok(optionsMap['mask'])
})
