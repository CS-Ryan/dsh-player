import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  isZstd,
  decodeToText,
  parseJsonl,
  buildSessionTree,
  loadSessionFromFile
} from '../dist/index.js'

const FIXTURES_DIR = path.resolve(import.meta.dirname, 'fixtures')
const JSONL_PATH = path.join(FIXTURES_DIR, 'sample-session.jsonl')
const ZSTD_PATH = path.join(FIXTURES_DIR, 'sample-session.jsonl.zstd')

test('isZstd correctly identifies Zstandard magic header', () => {
  const zstdBuf = fs.readFileSync(ZSTD_PATH)
  assert.equal(isZstd(zstdBuf), true)

  const jsonlBuf = fs.readFileSync(JSONL_PATH)
  assert.equal(isZstd(jsonlBuf), false)
})

test('decodeToText seamlessly handles both plain text and zstd buffers', () => {
  const plainText = decodeToText(fs.readFileSync(JSONL_PATH))
  const zstdText = decodeToText(fs.readFileSync(ZSTD_PATH))

  assert.equal(typeof plainText, 'string')
  assert.equal(typeof zstdText, 'string')
  assert.equal(plainText.trim(), zstdText.trim())
})

test('parseJsonl parses lines and captures entries accurately', () => {
  const text = fs.readFileSync(JSONL_PATH, 'utf-8')
  const { entries, errors } = parseJsonl(text)

  assert.equal(errors.length, 0)
  assert.equal(entries.length, 20)
  assert.equal(entries[0].type, 'user')
  assert.equal(entries[1].type, 'reasoning')
})

test('buildSessionTree organizes flat log entries into Session -> Turn -> Step -> Event hierarchy', () => {
  const session = loadSessionFromFile(ZSTD_PATH)

  assert.equal(session.sessionId, 'dsh-session-20260913-abc1')
  assert.equal(session.turns.length, 3)
  assert.equal(session.allEvents.length, 20)
  assert.equal(session.hasError, true)

  // Turn 1
  const turn1 = session.turns[0]
  assert.equal(turn1.turnIndex, 1)
  assert.match(turn1.userPrompt, /检查项目目录中的配置文件/)
  assert.deepEqual(turn1.toolsUsed, ['shell.exec', 'file.read'])

  // Turn 2 (with approval)
  const turn2 = session.turns[1]
  assert.equal(turn2.turnIndex, 2)
  assert.match(turn2.userPrompt, /清理根目录下的临时日志文件/)
  const hasApprovalReq = turn2.events.some((e) => e.type === 'approval_request')
  const hasApprovalRes = turn2.events.some((e) => e.type === 'approval_result')
  assert.equal(hasApprovalReq, true)
  assert.equal(hasApprovalRes, true)

  // Turn 3 (with error)
  const turn3 = session.turns[2]
  assert.equal(turn3.turnIndex, 3)
  assert.match(turn3.userPrompt, /尝试连接测试数据库/)
  const errorEvent = turn3.events.find((e) => e.type === 'error')
  assert.ok(errorEvent)
  assert.match(errorEvent.error.message, /ECONNREFUSED/)
  assert.equal(errorEvent.error.code, 'ECONNREFUSED')

  // Tools summary check
  assert.equal(session.toolsSummary['shell.exec'], 2)
  assert.equal(session.toolsSummary['file.read'], 1)
  assert.equal(session.toolsSummary['db.connect'], 1)
})
