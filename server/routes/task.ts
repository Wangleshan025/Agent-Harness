import { Router, Request, Response } from 'express'
import { Action, HarnessConfig, DEFAULT_CONFIG } from '../../src/core/types.js'

export const taskRouter = Router()

function generateMockStream(action: Action, write: (data: unknown) => void): Promise<void> {
  return new Promise(resolve => {
    const steps = [
      { type: 'thought', data: { content: `Analyzing task: ${action.params.task || action.params.command || 'unknown'}` } },
      { type: 'action', data: { action: 'search_code', params: { pattern: 'relevant code' } } },
      { type: 'observation', data: { actionId: '1', success: true, output: 'Found 3 relevant files' } },
      { type: 'thought', data: { content: 'Planning implementation approach...' } },
      { type: 'action', data: { action: 'read_file', params: { path: 'src/main.ts' } } },
      { type: 'observation', data: { actionId: '2', success: true, output: 'Read file contents (842 chars)' } },
      { type: 'thought', data: { content: 'Implementing the changes...' } },
      { type: 'action', data: { action: 'edit_file', params: { path: 'src/main.ts', diff: '+5 lines' } } },
      { type: 'observation', data: { actionId: '3', success: true, output: 'File updated successfully' } },
      { type: 'result', data: { status: 'completed', summary: 'Task completed successfully' } },
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(interval)
        resolve()
        return
      }
      write(steps[i])
      i++
    }, 500)
  })
}

taskRouter.post('/run', async (req: Request, res: Response) => {
  const { task, mock } = req.body as { task?: string; mock?: boolean }

  if (!task) {
    res.status(400).json({ error: 'Missing required field: task' })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const writeEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  if (mock) {
    const action: Action = {
      id: 'task-1',
      type: 'execute_command',
      params: { task, command: task },
      thought: 'Processing task',
    }
    await generateMockStream(action, writeEvent)
  } else {
    // Real execution — dispatches to HarnessX core agent loop
    writeEvent({ type: 'thought', data: { content: 'Real LLM execution not available in demo mode. Use mock=true for simulation.' } })
    writeEvent({ type: 'result', data: { status: 'skipped', summary: 'Real execution requires LLM API key' } })
  }

  res.end()
})

taskRouter.post('/check', (req: Request, res: Response) => {
  const { task } = req.body as { task?: string }
  if (!task) {
    res.status(400).json({ error: 'Missing required field: task' })
    return
  }
  res.json({ valid: true, estimatedSteps: 5, suggestedMode: task.length > 100 ? 'subagent' : 'inline' })
})