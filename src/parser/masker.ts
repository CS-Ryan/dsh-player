import { MaskOptions } from '../types/session.js'

const DEFAULT_OPTIONS: MaskOptions = {
  maskApiKeys: true,
  maskEnvVars: true,
  maskPaths: true,
  customRegex: ''
}

export function maskString(text: string, options: MaskOptions = DEFAULT_OPTIONS): string {
  if (!text || typeof text !== 'string') return text

  let masked = text

  if (options.maskApiKeys) {
    // OpenAI, Anthropic, DeepSeek, Google API keys
    masked = masked.replace(/sk-[A-Za-z0-9_-]{16,}/g, 'sk-***[MASKED_KEY]')
    masked = masked.replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza***[MASKED_KEY]')
    masked = masked.replace(/Bearer\s+[A-Za-z0-9._~+/-]{20,}/gi, 'Bearer [MASKED_TOKEN]')
    masked = masked.replace(/ghp_[A-Za-z0-9]{36}/g, 'ghp_***[MASKED_TOKEN]')
    masked = masked.replace(/glpat-[A-Za-z0-9-]{20,}/g, 'glpat-***[MASKED_TOKEN]')
    masked = masked.replace(/eyJh[A-Za-z0-9_-]{10,}\.eyJh[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT_MASKED]')
  }

  if (options.maskEnvVars) {
    // Environment variables like KEY=value, TOKEN=value, PASSWORD=value
    masked = masked.replace(
      /(?<=^|[\s,;])([A-Za-z0-9_]*(?:PASSWORD|SECRET|KEY|TOKEN|AUTH|CREDENTIAL)[A-Za-z0-9_]*\s*=\s*)([^\s;,]+)/gi,
      '$1********'
    )
    // JSON keys with sensitive names
    masked = masked.replace(
      /(["'](?:password|secret|apiKey|api_key|token|auth_token|access_token|private_key)["']\s*:\s*["'])([^"']+)(["'])/gi,
      '$1********$3'
    )
  }

  if (options.maskPaths) {
    // Windows user path: C:\Users\Username\... -> ~/...
    masked = masked.replace(/[A-Za-z]:\\[Uu]sers\\[^\\]+/g, '~')
    // Unix user path: /Users/username or /home/username -> ~
    masked = masked.replace(/(?:\/Users|\/home)\/[^/\s"']+/g, '~')
  }

  if (options.customRegex && options.customRegex.trim().length > 0) {
    try {
      const regex = new RegExp(options.customRegex, 'g')
      masked = masked.replace(regex, '[MASKED]')
    } catch {
      // Invalid regex ignored safely
    }
  }

  return masked
}

export function maskObject<T>(data: T, options: MaskOptions = DEFAULT_OPTIONS): T {
  if (data === null || data === undefined) return data

  if (typeof data === 'string') {
    return maskString(data, options) as unknown as T
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskObject(item, options)) as unknown as T
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      result[key] = maskObject(value, options)
    }
    return result as T
  }

  return data
}
