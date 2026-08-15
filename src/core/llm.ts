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

const TOOLS_DEFINITION = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read a file\'s contents from the project directory',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Path to the file relative to project root' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file (overwrites existing)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file relative to project root' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Make precise text replacements in a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file' },
          old_string: { type: 'string', description: 'The exact text to replace' },
          new_string: { type: 'string', description: 'The replacement text' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'execute_command',
      description: 'Run a shell command in the project directory',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'The shell command to run' } },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_tests',
      description: 'Run tests and parse results',
      parameters: {
        type: 'object',
        properties: {
          files: { type: 'string', description: 'Optional: specific test file or pattern to run' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_code',
      description: 'Search for patterns in the codebase',
      parameters: {
        type: 'object',
        properties: { pattern: { type: 'string', description: 'Search pattern (regex or text)' } },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ask_user',
      description: 'Ask the user a question when you need clarification',
      parameters: {
        type: 'object',
        properties: { question: { type: 'string', description: 'The question to ask the user' } },
        required: ['question'],
      },
    },
  },
]

export class DeepSeekProvider implements LLMProvider {
  private apiKey: string
  private baseUrl: string
  private model: string
  private timeout: number

  constructor(config: DeepSeekConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? 'https://api.deepseek.com/v1'
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
          tools: TOOLS_DEFINITION,
          tool_choice: 'auto',
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        return {
          content: `API error: HTTP ${response.status} ${response.statusText} — ${errBody}`,
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
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: `Request error: ${message}`,
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