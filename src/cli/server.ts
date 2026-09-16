import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Session } from '../types/session.js'
import { generateStandaloneHtml } from '../exporter/html-bundle.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface ServerOptions {
  port?: number
  open?: boolean
}

export function startReplayServer(session: Session, options: ServerOptions = {}): Promise<http.Server> {
  const initialPort = options.port || 3721
  const shouldOpen = options.open !== false

  let webDir = path.resolve(__dirname, '../../web')
  if (!fs.existsSync(webDir)) {
    webDir = path.resolve(__dirname, '../web')
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = generateStandaloneHtml(session)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    if (url.pathname === '/api/session') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(session))
      return
    }

    // Serve static files from web/
    const filePath = path.join(webDir, url.pathname)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase()
      let mime = 'text/plain'
      if (ext === '.html') mime = 'text/html; charset=utf-8'
      else if (ext === '.css') mime = 'text/css; charset=utf-8'
      else if (ext === '.js') mime = 'application/javascript; charset=utf-8'
      else if (ext === '.json') mime = 'application/json; charset=utf-8'
      else if (ext === '.svg') mime = 'image/svg+xml'

      res.writeHead(200, { 'Content-Type': mime })
      fs.createReadStream(filePath).pipe(res)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })

  return new Promise((resolve, reject) => {
    let currentPort = initialPort

    const tryListen = (port: number) => {
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying ${port + 1}...`)
          tryListen(port + 1)
        } else {
          reject(err)
        }
      })

      server.listen(port, () => {
        const address = `http://localhost:${port}`
        console.log(`⚡ [dsh-replay] Replay server is running at ${address}`)
        console.log(`Press Ctrl+C to stop the server`)

        if (shouldOpen) {
          openBrowser(address)
        }
        resolve(server)
      })
    }

    tryListen(currentPort)
  })
}

function openBrowser(url: string) {
  const platform = process.platform
  let cmd = ''
  if (platform === 'win32') {
    cmd = `start "" "${url}"`
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`
  } else {
    cmd = `xdg-open "${url}"`
  }
  exec(cmd, (err) => {
    if (err) {
      // Browser open failure is non-fatal
    }
  })
}
