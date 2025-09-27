import http from 'http'
import fs from 'fs'
import path from 'path'

const PORT = 3000
const PUBLIC_DIR = path.join(process.cwd(), 'dist')

const MIME_TYPES: { [key: string]: string } = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

const server = http.createServer((req, res) => {
  const unsafeFilePath = req.url === '/' ? '/index.html' : req.url || '/'
  const safeFilePath = path
    .normalize(unsafeFilePath)
    .replace(/^(\.\.[/\\])+/, '')
  const fullPath = path.join(PUBLIC_DIR, safeFilePath)

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallbackPath = path.join(PUBLIC_DIR, 'index.html')
      fs.readFile(fallbackPath, (fallbackErr, fallbackContent) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('404 Not Found')
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(fallbackContent)
        }
      })
      return
    }

    const ext = path.extname(fullPath)
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    fs.readFile(fullPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500)
        res.end(`Server Error: ${readErr.code}`)
      } else {
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(content, 'utf-8')
      }
    })
  })
})

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT} ...`)
})

server.on('error', (err) => {
  console.error(`<pre>${err}\n${err.stack}</pre>`)
})
