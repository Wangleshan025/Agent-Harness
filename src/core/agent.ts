import { LLMProvider } from './llm.js'
import { HarnessConfig, DEFAULT_CONFIG, Action, Observation, Turn, Memory, GuardrailResult } from './types.js'
import { buildContext } from './context-builder.js'
import { parseAction } from './action-parser.js'
import { ToolRegistry } from '../tools/registry.js'
import { Guardrail } from '../governance/index.js'

export interface AgentResult {
  success: boolean
  summary: string
  turns: Turn[]
  totalIterations: number
}

export class Agent {
  private llm: LLMProvider
  private config: HarnessConfig
  private memory?: Memory
  private toolRegistry?: ToolRegistry
  private guardrail?: Guardrail

  constructor(
    llm: LLMProvider,
    config?: Partial<HarnessConfig>,
    memory?: Memory,
    toolRegistry?: ToolRegistry,
    guardrail?: Guardrail,
  ) {
    this.llm = llm
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.memory = memory
    this.toolRegistry = toolRegistry
    this.guardrail = guardrail
  }

  async runTask(task: string): Promise<AgentResult> {
    const turns: Turn[] = []
    let consecutiveSameAction = 0
    let lastActionType = ''

    const maxIter = this.config.maxIterations

    for (let i = 0; i < maxIter; i++) {
      // 1. Build context with history
      const messages = buildContext(task, turns, this.memory)

      // 2. Call LLM
      const response = await this.llm.chat(messages)

      // 3. Parse actions
      const actions = parseAction(response)

      // 4. If no actions, task is complete
      if (actions.length === 0) {
        return {
          success: true,
          summary: response.content || 'Task completed.',
          turns,
          totalIterations: i + 1,
        }
      }

      // 5. Detect loops (same action type 3 times consecutively)
      if (actions[0].type === lastActionType) {
        consecutiveSameAction++
      } else {
        consecutiveSameAction = 0
      }
      lastActionType = actions[0].type

      if (consecutiveSameAction >= 2) {
        return {
          success: false,
          summary: `Agent stuck in loop: repeated "${lastActionType}" 3 times consecutively.`,
          turns,
          totalIterations: i + 1,
        }
      }

      // 6. Execute each action (with guardrail + tool registry if available)
      for (const action of actions) {
        // 6a. Guardrail check
        if (this.guardrail) {
          const guardResult: GuardrailResult = await this.guardrail.check(action)
          if (guardResult.action === 'block') {
            turns.push({
              action,
              observation: {
                actionId: action.id,
                success: false,
                output: '',
                error: `Blocked by guardrail: ${guardResult.reason}`,
                timestamp: Date.now(),
              },
              iteration: i + 1,
            })
            continue
          }
        }

        // 6b. Execute tool
        if (this.toolRegistry) {
          const observation = await this.toolRegistry.execute(action)
          turns.push({ action, observation, iteration: i + 1 })
        } else {
          // No tool registry: create a placeholder observation (for backward compat)
          turns.push({
            action,
            observation: {
              actionId: action.id,
              success: true,
              output: `[Mock] Tool ${action.type} would execute with params: ${JSON.stringify(action.params)}`,
              timestamp: Date.now(),
            },
            iteration: i + 1,
          })
        }
      }
    }

    return {
      success: false,
      summary: `Reached maximum iterations (${maxIter}). Task may not be complete.`,
      turns,
      totalIterations: maxIter,
    }
  }
}