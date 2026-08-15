import { Router, Request, Response } from 'express'
import { validateTestOutput } from '../../src/feedback/validator.js'
import { classifyFailure } from '../../src/feedback/classifier.js'
import { selectStrategy } from '../../src/feedback/corrector.js'

export const feedbackRouter = Router()

feedbackRouter.post('/analyze', (req: Request, res: Response) => {
  const { testOutput } = req.body as { testOutput?: string }
  if (!testOutput) {
    res.status(400).json({ error: 'Missing required field: testOutput' })
    return
  }

  const results = validateTestOutput(testOutput)
  const failed = results.filter(r => !r.passed)
  const passed = results.filter(r => r.passed)
  const category = classifyFailure(testOutput, results)
  const strategy = selectStrategy(category.category, 0)

  res.json({
    total: results.length,
    passed: passed.length,
    failed: failed.length,
    results,
    category,
    strategy,
  })
})

feedbackRouter.post('/retry', (req: Request, res: Response) => {
  const { testOutput, retryCount = 0 } = req.body as { testOutput?: string; retryCount?: number }
  if (!testOutput) {
    res.status(400).json({ error: 'Missing required field: testOutput' })
    return
  }

  const results = validateTestOutput(testOutput)
  const category = classifyFailure(testOutput, results)
  const strategy = selectStrategy(category.category, retryCount)

  res.json({
    category,
    strategy,
    canRetry: strategy !== null,
    retryCount,
  })
})