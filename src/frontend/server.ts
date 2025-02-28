const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const filePath = new URL(req.url).pathname
    let file

    if (filePath === '/') {
      file = Bun.file('./dist/index.html')
      if (file.size !== 0) return new Response(file)
    }

    file = Bun.file(`./dist${filePath}`)
    if (file.size !== 0) return new Response(file)

    return new Response('404 Not Found', { status: 404 })
  },
  error(err) {
    return new Response(`<pre>${err}\n${err.stack}</pre>`, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  },
})

console.log(`Listening on http://localhost:${server.port} ...`)
