import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Session, MaskOptions } from '../types/session.js'
import { maskObject } from '../parser/masker.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Generates a self-contained, standalone single HTML file containing the entire replay player and session data.
 */
export function generateStandaloneHtml(session: Session, maskOpts?: MaskOptions): string {
  // Apply desensitization if options are provided
  const finalSession = maskOpts ? maskObject(session, maskOpts) : session

  // Locate web assets
  let webDir = path.resolve(__dirname, '../../web')
  if (!fs.existsSync(webDir)) {
    webDir = path.resolve(__dirname, '../web')
  }

  const htmlTemplatePath = path.join(webDir, 'index.html')
  const cssPath = path.join(webDir, 'styles.css')
  const jsPath = path.join(webDir, 'app.js')

  let htmlContent = fs.readFileSync(htmlTemplatePath, 'utf-8')
  const cssContent = fs.readFileSync(cssPath, 'utf-8')
  const jsContent = fs.readFileSync(jsPath, 'utf-8')

  // Inline CSS
  htmlContent = htmlContent.replace(
    '<link rel="stylesheet" href="styles.css">',
    `<style>\n${cssContent}\n</style>`
  )

  // Embed session data & inline JS
  const sessionScript = `<script>\nwindow.__DSH_SESSION__ = ${JSON.stringify(finalSession)};\n</script>`

  htmlContent = htmlContent.replace(
    '<script src="app.js"></script>',
    `${sessionScript}\n<script>\n${jsContent}\n</script>`
  )

  return htmlContent
}
