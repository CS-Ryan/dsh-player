#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadSessionFromFile, generateStandaloneHtml } from '../dist/index.js'
import { startReplayServer } from '../dist/cli/server.js'

const args = process.argv.slice(2)

function printHelp() {
  console.log(`
⚡ dsh-replay - DSH 会话日志可视化回放器

使用方法:
  dsh-replay <session.jsonl | session.jsonl.zstd> [选项]

选项:
  -p, --port <port>       指定本地回放服务端口 (默认: 3721)
  -e, --export <file>     直接导出自包含离线回放 HTML 文件，不启动服务
  -m, --mask              导出时启用默认隐私脱敏 (API Key、环境变量、家目录路径)
  --no-open               启动本地服务时不自动打开浏览器
  -v, --version           查看版本号
  -h, --help              查看帮助信息

示例:
  dsh-replay session.jsonl.zstd
  dsh-replay session.jsonl -p 8080
  dsh-replay session.jsonl.zstd --export replay.html --mask
`)
}

async function main() {
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp()
    process.exit(0)
  }

  if (args.includes('-v') || args.includes('--version')) {
    const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
    console.log(`dsh-replay v${pkg.version}`)
    process.exit(0)
  }

  let filePath = ''
  let port = 3721
  let exportPath = ''
  let mask = false
  let open = true

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-p' || arg === '--port') {
      port = parseInt(args[++i], 10) || 3721
    } else if (arg === '-e' || arg === '--export') {
      exportPath = args[++i]
    } else if (arg === '-m' || arg === '--mask') {
      mask = true
    } else if (arg === '--no-open') {
      open = false
    } else if (!arg.startsWith('-')) {
      filePath = arg
    }
  }

  if (!filePath) {
    console.error('错误: 未指定会话日志文件路径')
    printHelp()
    process.exit(1)
  }

  const resolvedPath = path.resolve(filePath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`错误: 找不到文件: ${resolvedPath}`)
    process.exit(1)
  }

  try {
    console.log(`正在解析会话日志: ${resolvedPath}...`)
    const session = loadSessionFromFile(resolvedPath)
    console.log(`解析成功! 会话 ID: ${session.sessionId}, 共 ${session.totalTurns} 轮次, ${session.totalEvents} 个事件`)

    if (exportPath) {
      const outResolved = path.resolve(exportPath)
      const html = generateStandaloneHtml(session, mask ? { maskApiKeys: true, maskEnvVars: true, maskPaths: true } : undefined)
      fs.writeFileSync(outResolved, html, 'utf-8')
      console.log(`✅ 已成功导出自包含单文件 HTML: ${outResolved}`)
      process.exit(0)
    }

    await startReplayServer(session, { port, open })
  } catch (err) {
    console.error(`❌ 解析或启动回放失败: ${err.message}`)
    process.exit(1)
  }
}

main()
