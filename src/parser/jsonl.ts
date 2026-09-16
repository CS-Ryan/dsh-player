import { RawLogEntry } from '../types/events.js'

export interface ParseJsonlResult {
  entries: RawLogEntry[]
  errors: Array<{ line: number; error: string; raw: string }>
}

/**
 * Parses JSONL content into raw log entries with tolerant error handling.
 */
export function parseJsonl(text: string): ParseJsonlResult {
  const entries: RawLogEntry[] = []
  const errors: Array<{ line: number; error: string; raw: string }> = []

  if (!text || typeof text !== 'string') {
    return { entries, errors }
  }

  const lines = text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    try {
      const parsed = JSON.parse(line)
      if (typeof parsed === 'object' && parsed !== null) {
        entries.push(parsed)
      } else {
        errors.push({
          line: i + 1,
          error: 'Parsed JSON is not an object',
          raw: line
        })
      }
    } catch (err: any) {
      errors.push({
        line: i + 1,
        error: err.message || 'JSON parse error',
        raw: line
      })
    }
  }

  return { entries, errors }
}
