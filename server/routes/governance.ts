import { Router, Request, Response } from 'express'
import { Guardrail } from '../../src/governance/index.js'
import { Action, DEFAULT_CONFIG } from '../../src/core/types.js'

export const governanceRouter = Router()

const guardrail = new Guardrail({ ...DEFAULT_CONFIG })

governanceRouter.post('/check', async (req: Request, res: Response) => {
  const { action } = req.body as { action?: Action }
  if (!action) {
    res.status(400).json({ error: 'Missing required field: action' })
    return
  }

  try {
    const result = await guardrail.check(action)
    res.json({ action: action, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

governanceRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    maxIterations: DEFAULT_CONFIG.maxIterations,
    commandTimeout: DEFAULT_CONFIG.commandTimeout,
    hitlTimeout: DEFAULT_CONFIG.hitlTimeout,
    allowList: DEFAULT_CONFIG.allowList,
    blockList: DEFAULT_CONFIG.blockList,
  })
})

governanceRouter.get('/history', (_req: Request, res: Response) => {
  const hitlManager = guardrail.getHITLManager()
  // HITLManager doesn't expose a list method, return empty for now
  res.json({ history: [] })
})