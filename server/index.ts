import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { taskRouter } from './routes/task.js'
import { governanceRouter } from './routes/governance.js'
import { feedbackRouter } from './routes/feedback.js'
import { demoRouter } from './routes/demo.js'
import { credentialRouter } from './routes/credential.js'
import { statusRouter } from './routes/status.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Serve static files (React build output)
const clientDist = path.resolve(__dirname, '..', 'client', 'dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
}

// API routes
app.use('/api/task', taskRouter)
app.use('/api/governance', governanceRouter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/demo', demoRouter)
app.use('/api/cred', credentialRouter)
app.use('/api/status', statusRouter)

// SPA fallback
const clientIndex = path.join(clientDist, 'index.html')
app.get('*', (_req, res) => {
  if (fs.existsSync(clientIndex)) {
    res.sendFile(clientIndex)
  } else {
    res.status(200).json({ message: 'HarnessX Web UI server running. Build the client with: cd client && npm run build' })
  }
})

app.listen(PORT, () => {
  console.log(`\n🔧 HarnessX Web UI server running at http://localhost:${PORT}`)
  console.log(`   API endpoints available at http://localhost:${PORT}/api/...\n`)
})