import * as zlib from 'node:zlib'
import * as fzstd from 'fzstd'

// Zstandard frame magic number is 0xFD2FB528 (little-endian: 0x28, 0xB5, 0x2F, 0xFD)
export const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd]

export function isZstd(buffer: Uint8Array): boolean {
  if (!buffer || buffer.length < 4) return false
  return (
    buffer[0] === ZSTD_MAGIC[0] &&
    buffer[1] === ZSTD_MAGIC[1] &&
    buffer[2] === ZSTD_MAGIC[2] &&
    buffer[3] === ZSTD_MAGIC[3]
  )
}

/**
 * Decompresses a Zstandard-compressed buffer or Uint8Array.
 * Supports multi-frame zstd and provides fallback.
 */
export function decompressZstd(input: Uint8Array | Buffer): Uint8Array {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength)

  // 1. Try Node.js native zlib.zstdDecompressSync
  if (typeof (zlib as any).zstdDecompressSync === 'function') {
    try {
      const decompressed = (zlib as any).zstdDecompressSync(buf)
      return new Uint8Array(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength)
    } catch {
      // Fall through to fzstd or multi-frame handling
    }
  }

  // 2. Try fzstd
  try {
    const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
    return fzstd.decompress(u8)
  } catch (err: any) {
    // 3. Multi-frame fallback if single-shot failed
    try {
      return decompressMultiFrameZstd(buf)
    } catch {
      throw new Error(`Failed to decompress Zstandard payload: ${err.message || String(err)}`)
    }
  }
}

/**
 * Fallback for multi-frame Zstandard streams
 */
function decompressMultiFrameZstd(buf: Buffer): Uint8Array {
  const chunks: Uint8Array[] = []
  let offset = 0
  const totalLen = buf.length

  while (offset < totalLen) {
    if (
      offset + 4 <= totalLen &&
      buf[offset] === ZSTD_MAGIC[0] &&
      buf[offset + 1] === ZSTD_MAGIC[1] &&
      buf[offset + 2] === ZSTD_MAGIC[2] &&
      buf[offset + 3] === ZSTD_MAGIC[3]
    ) {
      // Find the next frame or end
      let nextFrame = offset + 4
      while (nextFrame + 4 <= totalLen) {
        if (
          buf[nextFrame] === ZSTD_MAGIC[0] &&
          buf[nextFrame + 1] === ZSTD_MAGIC[1] &&
          buf[nextFrame + 2] === ZSTD_MAGIC[2] &&
          buf[nextFrame + 3] === ZSTD_MAGIC[3]
        ) {
          break
        }
        nextFrame++
      }
      const slice = buf.subarray(offset, nextFrame)
      let decompSlice: Uint8Array | null = null
      if (typeof (zlib as any).zstdDecompressSync === 'function') {
        try {
          decompSlice = (zlib as any).zstdDecompressSync(slice)
        } catch {
          // continue
        }
      }
      if (!decompSlice) {
        decompSlice = fzstd.decompress(new Uint8Array(slice.buffer, slice.byteOffset, slice.byteLength))
      }
      chunks.push(decompSlice)
      offset = nextFrame
    } else {
      break
    }
  }

  if (chunks.length === 0) {
    throw new Error('No valid Zstandard frames found in buffer')
  }

  const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalBytes)
  let pos = 0
  for (const chunk of chunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  return result
}

/**
 * Compresses data using native zlib.zstdCompressSync (useful for testing and fixtures)
 */
export function compressZstd(input: string | Uint8Array): Uint8Array {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : Buffer.from(input)
  if (typeof (zlib as any).zstdCompressSync === 'function') {
    const comp = (zlib as any).zstdCompressSync(buf)
    return new Uint8Array(comp.buffer, comp.byteOffset, comp.byteLength)
  }
  throw new Error('Native zstdCompressSync is not supported in this environment')
}

/**
 * Decodes raw bytes into text string, automatically detecting and decompressing zstd if needed.
 */
export function decodeToText(data: Uint8Array | Buffer | string): string {
  if (typeof data === 'string') {
    return data
  }

  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength)

  if (isZstd(buf)) {
    const decompressed = decompressZstd(buf)
    return new TextDecoder('utf-8').decode(decompressed)
  }

  return new TextDecoder('utf-8').decode(buf)
}
