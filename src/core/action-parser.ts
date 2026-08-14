import { LLMResponse, Action } from './types.js'

export function parseAction(response: LLMResponse): Action[] {
  if (!response.toolCalls || response.toolCalls.length === 0) {
    return []
  }

  return response.toolCalls.map(tc => {
    let params: Record<string, unknown> = {}
    try {
      params = JSON.parse(tc.function.arguments)
    } catch {
      params = {}
    }

    return {
      type: tc.function.name as Action['type'],
      params,
      thought: response.content || undefined,
      id: tc.id,
    }
  })
}