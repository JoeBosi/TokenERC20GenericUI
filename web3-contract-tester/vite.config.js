import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Dev-only: serve the serverless functions in ../api under /api so `npm run dev`
// exercises the same code Vercel runs in production. In production Vercel serves
// these directly; this middleware does nothing there.
function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const u = new URL(req.url, 'http://localhost')
        const route = u.pathname.replace(/^\/api\//, '').replace(/\/+$/, '')
        // Never expose internal helpers (e.g. _lib/*).
        if (!route || route.startsWith('_') || route.includes('/_')) return next()

        let handler
        try {
          const resolved = require.resolve(`../api/${route}.js`)
          delete require.cache[resolved] // pick up edits without a restart
          handler = require(resolved)
        } catch {
          return next()
        }
        if (typeof handler !== 'function') return next()

        let body
        if (req.method === 'POST' || req.method === 'PUT') {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const raw = Buffer.concat(chunks).toString('utf8')
          try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
        }

        const vReq = {
          method: req.method,
          query: Object.fromEntries(u.searchParams),
          body,
          headers: req.headers,
        }
        const vRes = {
          statusCode: 200,
          setHeader: (k, v) => res.setHeader(k, v),
          status(code) { this.statusCode = code; return this },
          json(obj) {
            res.statusCode = this.statusCode
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
          },
          end(s) { res.statusCode = this.statusCode; res.end(s) },
        }
        try {
          await handler(vReq, vRes)
        } catch {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'dev api error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    port: 5173,
    host: true
  },
})
