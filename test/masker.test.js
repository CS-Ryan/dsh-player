import test from 'node:test'
import assert from 'node:assert/strict'
import { maskString, maskObject } from '../dist/index.js'

test('maskString masks API keys and tokens', () => {
  const input = 'Call failed with key: sk-abcdef1234567890abcdef1234567890 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc_123'
  const masked = maskString(input, { maskApiKeys: true })

  assert.doesNotMatch(masked, /sk-abcdef1234567890/)
  assert.match(masked, /sk-\*\*\*\[MASKED_KEY\]/)
  assert.match(masked, /Bearer \[MASKED_TOKEN\]/)
})

test('maskString masks environment variables and passwords', () => {
  const input = 'DEBUG=1 DB_PASSWORD=SuperSecretPass123! API_TOKEN=xyz987'
  const masked = maskString(input, { maskEnvVars: true })

  assert.doesNotMatch(masked, /SuperSecretPass123!/)
  assert.match(masked, /DB_PASSWORD=\*{8}/)
})

test('maskString masks user home paths on Windows and Unix', () => {
  const winInput = 'Error in C:\\Users\\ryanc\\Desktop\\dsh-replay\\file.ts'
  const winMasked = maskString(winInput, { maskPaths: true })
  assert.equal(winMasked, 'Error in ~\\Desktop\\dsh-replay\\file.ts')

  const unixInput = 'Saved to /Users/alice/projects/test.log'
  const unixMasked = maskString(unixInput, { maskPaths: true })
  assert.equal(unixMasked, 'Saved to ~/projects/test.log')
})

test('maskString applies custom regex replacement', () => {
  const input = 'Server IP is 192.168.1.100 and port is 8080'
  const masked = maskString(input, { customRegex: '192\\.168\\.\\d+\\.\\d+' })
  assert.equal(masked, 'Server IP is [MASKED] and port is 8080')
})

test('maskObject deeply masks nested objects and arrays', () => {
  const obj = {
    user: 'ryanc',
    path: 'C:\\Users\\ryanc\\app.js',
    nested: {
      key: 'sk-abcdef1234567890abcdef1234567890',
      items: ['PASSWORD=123456', 'normal item']
    }
  }
  const masked = maskObject(obj, { maskApiKeys: true, maskEnvVars: true, maskPaths: true })

  assert.equal(masked.path, '~\\app.js')
  assert.match(masked.nested.key, /sk-\*\*\*\[MASKED_KEY\]/)
  assert.match(masked.nested.items[0], /PASSWORD=\*{8}/)
  assert.equal(masked.nested.items[1], 'normal item')
})
