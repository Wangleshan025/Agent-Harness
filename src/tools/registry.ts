import { Action, Observation } from '../core/types.js'

export type ToolHandler = (params: Record<string, unknown>) => Promise<Observation>

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>()

  register(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler)
  }

  async execute(action: Action): Promise<Observation> {
    const handler = this.handlers.get(action.type)
    if (!handler) {
      return {
        actionId: action.id,
        success: false,
        output: '',
        error: `Unknown tool: ${action.type}`,
        timestamp: Date.now(),
      }
    }
    return handler(action.params)
  }

  has(name: string): boolean {
    return this.handlers.has(name)
  }
}