import { Router, Request, Response } from 'express'
import { CredentialManager } from '../../src/config/credential-manager.js'

export const credentialRouter = Router()

// Use a default master password for the web UI session
// In production, this would come from an environment variable
const MASTER_PASSWORD = process.env.HARNESS_MASTER_PASSWORD || 'harness-web-ui-default-password'
const credentialManager = new CredentialManager({ masterPassword: MASTER_PASSWORD })

credentialRouter.post('/init', async (req: Request, res: Response) => {
  const { apiKey } = req.body as { apiKey?: string }
  if (!apiKey) {
    res.status(400).json({ error: 'Missing required field: apiKey' })
    return
  }

  try {
    await credentialManager.init(apiKey)
    res.json({ success: true, message: 'Credential initialized' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

credentialRouter.post('/update', async (req: Request, res: Response) => {
  const { apiKey } = req.body as { apiKey?: string }
  if (!apiKey) {
    res.status(400).json({ error: 'Missing required field: apiKey' })
    return
  }

  try {
    await credentialManager.update(apiKey)
    res.json({ success: true, message: 'Credential updated' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

credentialRouter.post('/clear', async (_req: Request, res: Response) => {
  try {
    await credentialManager.clear()
    res.json({ success: true, message: 'Credential cleared' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

credentialRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await credentialManager.status()
    res.json(status)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})