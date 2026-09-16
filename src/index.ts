import * as fs from 'node:fs'
import * as path from 'node:path'
import { decodeToText, decompressZstd, compressZstd, isZstd } from './parser/decoder.js'
import { parseJsonl } from './parser/jsonl.js'
import { buildSessionTree, normalizeEntry } from './parser/tree.js'
import { maskString, maskObject } from './parser/masker.js'
import { generateStandaloneHtml } from './exporter/html-bundle.js'
import { Session, MaskOptions } from './types/session.js'

export * from './types/events.js'
export * from './types/session.js'
export {
  decodeToText,
  decompressZstd,
  compressZstd,
  isZstd,
  parseJsonl,
  buildSessionTree,
  normalizeEntry,
  maskString,
  maskObject,
  generateStandaloneHtml
}

/**
 * High-level helper to load and parse a session file (.jsonl or .jsonl.zstd).
 */
export function loadSessionFromFile(filePath: string): Session {
  const buf = fs.readFileSync(filePath)
  const text = decodeToText(buf)
  const { entries, errors } = parseJsonl(text)
  if (errors.length > 0 && entries.length === 0) {
    throw new Error(`Failed to parse session log: ${errors.map((e) => e.error).join(', ')}`)
  }
  const fileName = path.basename(filePath)
  return buildSessionTree(entries, { fileName })
}

// --- Cordis Plugin Integration ---
export const name = 'dsh-replay'
export const reusable = true

export interface PluginConfig {
  port?: number
  open?: boolean
  defaultMask?: boolean
}

export function apply(ctx: any, config: PluginConfig = {}) {
  // 1. Register CLI Command into DSH / Cordis command system
  if (ctx && typeof ctx.command === 'function') {
    ctx
      .command('replay <file>', '启动 DSH 会话日志可视化回放器')
      .option('port', '-p <port:number> 服务端口', { fallback: config.port || 3721 })
      .option('export', '-e <out:string> 导出独立单文件 HTML')
      .option('mask', '-m 启用敏感信息脱敏', { fallback: config.defaultMask ?? false })
      .action(async ({ options }: any, file: string) => {
        if (!file) {
          return '错误: 请提供要回放的会话日志文件路径 (.jsonl 或 .jsonl.zstd)'
        }
        try {
          const session = loadSessionFromFile(file)
          if (options.export) {
            const html = generateStandaloneHtml(session, options.mask ? { maskApiKeys: true, maskEnvVars: true, maskPaths: true } : undefined)
            fs.writeFileSync(options.export, html, 'utf-8')
            return `已成功导出独立离线回放 HTML: ${path.resolve(options.export)}`
          }

          // Start lightweight local server
          const { startReplayServer } = await import('./cli/server.js')
          await startReplayServer(session, {
            port: options.port || 3721,
            open: true
          })
          return `回放服务已在 http://localhost:${options.port || 3721} 启动`
        } catch (err: any) {
          return `回放启动失败: ${err.message}`
        }
      })
  }

  // 2. WebUI / Router mounting if Cordis WebUI service is present
  if (ctx && ctx.router) {
    ctx.router.get('/dsh-replay/api/session', (c: any) => {
      c.body = { status: 'ok', message: 'dsh-replay plugin is active' }
    })
  }
}
