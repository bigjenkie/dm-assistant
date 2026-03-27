/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'anthropic-proxy',
      configureServer(server) {
        // Custom middleware that forwards requests to the Anthropic API.
        // The browser sends a simple POST with the API key in a query param.
        // This middleware makes the real API call server-side — no CORS issues.
        server.middlewares.use('/api/anthropic', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
          }

          const url = new URL(req.url ?? '', 'http://localhost')
          const apiKey = url.searchParams.get('key') ?? ''
          const targetPath = url.pathname // e.g. /v1/messages

          // Read request body
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(chunk as Buffer)
          }
          const body = Buffer.concat(chunks).toString()

          try {
            const apiRes = await fetch(`https://api.anthropic.com${targetPath}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body,
            })

            const data = await apiRes.text()
            res.writeHead(apiRes.status, { 'Content-Type': 'application/json' })
            res.end(data)
          } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
