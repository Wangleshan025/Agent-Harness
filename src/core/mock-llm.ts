import { Message, LLMResponse, ToolCall } from './types.js'
import { LLMProvider } from './llm.js'

export interface MockResponse {
  content?: string
  toolCalls?: ToolCall[]
}

export type MockResponseMap = Array<{
  match?: (messages: Message[]) => boolean
  response: MockResponse
}>

export class MockLLMProvider implements LLMProvider {
  private responses: MockResponseMap
  private callIndex = 0

  constructor(responses: MockResponseMap) {
    this.responses = responses
  }

  async chat(_messages: Message[]): Promise<LLMResponse> {
    const idx = this.callIndex
    this.callIndex++

    if (idx >= this.responses.length) {
      return { content: '', finishReason: 'stop' }
    }

    const entry = this.responses[idx]
    if (entry.match && !entry.match(_messages)) {
      return { content: '', finishReason: 'stop' }
    }

    return {
      content: entry.response.content ?? '',
      toolCalls: entry.response.toolCalls,
      finishReason: entry.response.toolCalls ? 'tool_calls' : 'stop',
    }
  }

  reset(): void {
    this.callIndex = 0
  }

  get currentIndex(): number {
    return this.callIndex
  }
}