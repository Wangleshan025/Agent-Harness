import { Router, Request, Response } from 'express'
import { Action } from '../../src/core/types.js'
import { Agent } from '../../src/core/agent.js'
import { DeepSeekProvider } from '../../src/core/llm.js'
import { ToolRegistry } from '../../src/tools/registry.js'
import { handleReadFile } from '../../src/tools/read-file.js'
import { handleWriteFile } from '../../src/tools/write-file.js'
import { handleEditFile } from '../../src/tools/edit-file.js'
import { handleExecuteCommand } from '../../src/tools/execute-command.js'
import { handleRunTests } from '../../src/tools/run-tests.js'
import { handleSearchCode } from '../../src/tools/search-code.js'
import { Guardrail } from '../../src/governance/index.js'
import { CredentialManager } from '../../src/config/credential-manager.js'
import { DEFAULT_CONFIG, HarnessConfig } from '../../src/core/types.js'

export const taskRouter = Router()

const MASTER_PASSWORD = process.env.HARNESS_MASTER_PASSWORD || 'harness-web-ui-default-password'
const credentialManager = new CredentialManager({ masterPassword: MASTER_PASSWORD })

// In-memory cache for the decrypted API key
let cachedApiKey: string | null = null

// Refresh the cache whenever credentials are updated
export function setCachedApiKey(key: string | null) {
  cachedApiKey = key
}

// Warm the cache on startup
credentialManager.getKey().then(key => {
  cachedApiKey = key
}).catch(() => {
  cachedApiKey = null
})

function buildToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registry.register('read_file', handleReadFile)
  registry.register('write_file', handleWriteFile)
  registry.register('edit_file', handleEditFile)
  registry.register('execute_command', handleExecuteCommand)
  registry.register('run_tests', handleRunTests)
  registry.register('search_code', handleSearchCode)
  return registry
}

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

async function runRealAgent(
  task: string,
  write: (data: unknown) => void,
  signal: AbortSignal,
): Promise<void> {
  // 1. Read API key
  let apiKey = cachedApiKey
  if (!apiKey) {
    apiKey = await credentialManager.getKey()
  }
  if (!apiKey) {
    write({ type: 'thought', data: { content: '❌ 未找到 API Key。请先在凭据管理页面配置 DeepSeek API Key。' } })
    write({ type: 'result', data: { status: 'failed', summary: 'Missing API Key' } })
    return
  }

  // 2. Create LLM provider
  const llm = new DeepSeekProvider({ apiKey })

  // 3. Create tool registry
  const tools = buildToolRegistry()

  // 4. Create guardrail
  const guardrail = new Guardrail(DEFAULT_CONFIG as HarnessConfig)

  // 5. Run the agent loop
  const agent = new Agent(llm)
  let turns = 0
  const maxIter = DEFAULT_CONFIG.maxIterations

  write({ type: 'thought', data: { content: `🚀 开始执行任务: "${task}"` } })

  for (let i = 0; i < maxIter; i++) {
    if (signal.aborted) {
      write({ type: 'thought', data: { content: '⏹ 任务已被用户中止' } })
      write({ type: 'result', data: { status: 'cancelled', summary: 'Task cancelled by user', totalIterations: turns } })
      return
    }

    // 5a. Build context and call LLM
    write({ type: 'thought', data: { content: `💭 思考中... (第 ${i + 1} 轮)` } })
    const response = await llm.chat([
      { role: 'system', content: `You are a coding agent. Your task is: ${task}\n\nAvailable tools: read_file, write_file, edit_file, execute_command, run_tests, search_code.\n\nRespond with a tool call in JSON format: {"tool":"tool_name","params":{"key":"value"}}` },
      { role: 'user', content: `Please complete the following task: ${task}` },
    ])

    const content = response.content || ''
    write({ type: 'thought', data: { content: content.slice(0, 500) } })

    // 5b. Parse action from response
    let action: Action | null = null
    if (response.toolCalls && response.toolCalls.length > 0) {
      const tc = response.toolCalls[0]
      action = {
        id: `turn-${i}`,
        type: tc.function.name as Action['type'],
        params: JSON.parse(tc.function.arguments),
        thought: content.slice(0, 200),
      }
    } else {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[^]*?"tool"[^]*?\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          action = {
            id: `turn-${i}`,
            type: parsed.tool as Action['type'],
            params: parsed.params || {},
            thought: content.slice(0, 200),
          }
        } catch { /* ignore */ }
      }
    }

    if (!action) {
      // No action — task is complete
      write({ type: 'thought', data: { content: '✅ Agent 认为任务已完成，没有更多操作需要执行。' } })
      write({ type: 'result', data: { status: 'completed', summary: content.slice(0, 300) || 'Task completed', totalIterations: turns } })
      return
    }

    // 5c. Guardrail check
    write({ type: 'action', data: { action: action.type, params: action.params } })
    const guardResult = await guardrail.check(action)
    if (guardResult.action === 'block') {
      write({ type: 'guardrail', data: { action: 'block', reason: guardResult.reason, level: guardResult.level } })
      write({ type: 'thought', data: { content: `❌ 动作被护栏拦截: ${guardResult.reason}` } })
      write({ type: 'result', data: { status: 'blocked', summary: `Action blocked by guardrail: ${guardResult.reason}`, totalIterations: turns + 1 } })
      return
    }
    write({ type: 'guardrail', data: { action: 'allow', reason: guardResult.reason, level: guardResult.level } })

    // 5d. Execute tool
    const observation = await tools.execute(action)
    write({ type: 'observation', data: { actionId: action.id, success: observation.success, output: (observation.output || observation.error || '').slice(0, 1000) } })
    turns++
  }

  write({ type: 'thought', data: { content: `⚠️ 已达到最大迭代次数 (${maxIter})，任务可能未完成。` } })
  write({ type: 'result', data: { status: 'incomplete', summary: `Reached maximum iterations (${maxIter})`, totalIterations: turns } })
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
    const abortSignal = req.signal || new AbortController().signal
    await runRealAgent(task, writeEvent, abortSignal)
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