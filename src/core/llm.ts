import { Message, LLMResponse } from './types.js'

export interface LLMProvider {
  chat(messages: Message[]): Promise<LLMResponse>
}

export interface DeepSeekConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  timeout?: number
}

export class DeepSeekProvider implements LLMProvider {
  private apiKey: string
  private baseUrl: string
  private model: string
  private timeout: number

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? 'https://api.njusehub.info/v1'
    this.model = config.model ?? 'deepseek-chat'
    this.timeout = config.timeout ?? 60_000
  }

  async chat(messages: Message[]): Promise<LLMResponse> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        return {
          content: `HTTP ${response.status}: ${response.statusText}`,
          finishReason: 'error',
        }
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string | null
            tool_calls?: Array<{
              id: string
              type: 'function'
              function: { name: string; arguments: string }
            }>
          }
          finish_reason: string
        }>
      }

      const choice = data.choices[0]
      return {
        content: choice.message.content ?? '',
        toolCalls: choice.message.tool_calls?.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
        finishReason: this.mapFinishReason(choice.finish_reason),
      }
    } catch (error) {
      return {
        content: '',
        finishReason: 'error',
      }
    } finally {
      clearTimeout(timer)
    }
  }

  private mapFinishReason(reason: string): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop': return 'stop'
      case 'tool_calls': return 'tool_calls'
      case 'length': return 'length'
      default: return 'error'
    }
  }
}