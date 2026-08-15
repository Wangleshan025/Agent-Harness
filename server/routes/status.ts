import { Router, Request, Response } from 'express'
import { DEFAULT_CONFIG } from '../../src/core/types.js'

export const statusRouter = Router()

const VERSION = '0.1.0'

statusRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    version: VERSION,
    name: 'HarnessX',
    description: 'Coding Agent Harness — AI4SE Final Project',
    config: {
      maxIterations: DEFAULT_CONFIG.maxIterations,
      commandTimeout: DEFAULT_CONFIG.commandTimeout,
      llmTimeout: DEFAULT_CONFIG.llmTimeout,
      hitlTimeout: DEFAULT_CONFIG.hitlTimeout,
      blockListCount: DEFAULT_CONFIG.blockList.length,
    },
    nodeVersion: process.version,
    platform: process.platform,
    cwd: process.cwd(),
    uptime: process.uptime(),
  })
})

statusRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    memory: process.memoryUsage(),
  })
})