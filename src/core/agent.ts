import { LLMProvider } from './llm.js'
import { HarnessConfig, DEFAULT_CONFIG, Action, Observation, Turn, Memory } from './types.js'
import { buildContext } from './context-builder.js'
import { parseAction } from './action-parser.js'

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

  constructor(llm: LLMProvider, config?: Partial<HarnessConfig>, memory?: Memory) {
    this.llm = llm
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.memory = memory
  }

  async runTask(task: string): Promise<AgentResult> {
    const turns: Turn[] = []
    let consecutiveSameAction = 0
    let lastActionType = ''

    // 限制最大迭代次数
    const maxIter = this.config.maxIterations

    for (let i = 0; i < maxIter; i++) {
      // 1. 构建上下文
      const messages = buildContext(task, turns, this.memory)

      // 2. 调用 LLM
      const response = await this.llm.chat(messages)

      // 3. 解析 Action
      const actions = parseAction(response)

      // 4. 如果没有 Action，认为任务完成
      if (actions.length === 0) {
        return {
          success: true,
          summary: response.content || 'Task completed.',
          turns,
          totalIterations: i + 1,
        }
      }

      // 5. 检测循环
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

      // 注意：这里只生成 Action 占位，实际执行由 ToolRegistry 完成
      // 在当前任务中，我们仅验证主循环的流程控制逻辑
      // 实际的 Action 执行由外部注入

      // 如果没有 observation（在独立测试中），创建占位
      // 完整集成中，ToolRegistry 会填充 observation
    }

    return {
      success: false,
      summary: `Reached maximum iterations (${maxIter}). Task may not be complete.`,
      turns,
      totalIterations: maxIter,
    }
  }
}