import test from 'node:test'
import assert from 'node:assert/strict'
import * as path from 'node:path'
import { loadSessionFromFile, generateStandaloneHtml } from '../dist/index.js'

const FIXTURES_DIR = path.resolve(import.meta.dirname, 'fixtures')
const ZSTD_PATH = path.join(FIXTURES_DIR, 'sample-session.jsonl.zstd')

test('generateStandaloneHtml embeds complete interactive viewer and session data', () => {
  const session = loadSessionFromFile(ZSTD_PATH)
  const html = generateStandaloneHtml(session)

  assert.ok(html.length > 1000)
  assert.ok(html.includes('<!DOCTYPE html>'))
  assert.ok(html.includes('window.__DSH_SESSION__ ='))
  assert.ok(html.includes(session.sessionId))
  assert.ok(html.includes('<style>'))
  assert.ok(html.includes('<script>'))
  // No external CSS/JS dependencies required
  assert.equal(html.includes('<link rel="stylesheet" href="styles.css">'), false)
  assert.equal(html.includes('<script src="app.js"></script>'), false)
})

test('generateStandaloneHtml honors privacy desensitization options', () => {
  const session = loadSessionFromFile(ZSTD_PATH)
  const html = generateStandaloneHtml(session, {
    maskApiKeys: true,
    maskEnvVars: true,
    maskPaths: true
  })

  assert.doesNotMatch(html, /sk-abcdef1234567890/)
  assert.match(html, /sk-\*\*\*\[MASKED_KEY\]/)
  assert.doesNotMatch(html, /C:\\\\Users\\\\ryanc/)
})
