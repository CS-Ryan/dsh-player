import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

const FIXTURES_DIR = path.resolve(import.meta.dirname, 'fixtures')
const ZSTD_PATH = path.join(FIXTURES_DIR, 'sample-session.jsonl.zstd')
const OUTPUT_HTML = path.join(FIXTURES_DIR, 'exported-replay.html')

test('CLI bin/dsh-replay.js exports standalone HTML successfully with --export and --mask', () => {
  if (fs.existsSync(OUTPUT_HTML)) {
    fs.unlinkSync(OUTPUT_HTML)
  }

  const cmd = `node bin/dsh-replay.js "${ZSTD_PATH}" --export "${OUTPUT_HTML}" --mask`
  const stdout = execSync(cmd, { encoding: 'utf-8' })

  assert.match(stdout, /已成功导出自包含单文件 HTML/)
  assert.equal(fs.existsSync(OUTPUT_HTML), true)

  const content = fs.readFileSync(OUTPUT_HTML, 'utf-8')
  assert.ok(content.length > 5000)
  assert.match(content, /dsh-session-20260913-abc1/)
  // Masked check
  assert.doesNotMatch(content, /sk-abcdef1234567890/)
  assert.match(content, /sk-\*\*\*\[MASKED_KEY\]/)

  // Clean up
  fs.unlinkSync(OUTPUT_HTML)
})
