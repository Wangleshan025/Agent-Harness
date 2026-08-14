import { describe, it, expect } from 'vitest'
import { Agent } from '../../../src/core/agent.js'
import { MockLLMProvider } from '../../../src/core/mock-llm.js'

describe('Agent', () => {
  it('should complete a task when LLM returns stop without tool calls', async () => {
    const mock = new MockLLMProvider([
      { response: { content: 'Task is done. I completed the work.' } },
    ])

    const agent = new Agent(mock, { maxIterations: 10 })
    const result = await agent.runTask('Do something simple')

    expect(result.success).toBe(true)
    expect(result.summary).toContain('Task is done')
    expect(result.totalIterations).toBe(1)
  })

  it('should detect loop when same action repeated 3 times', async () => {
    const mock = new MockLLMProvider([
      {
        response: {
          content: 'Reading file...',
          toolCalls: [{
            id: 'call_1', type: 'function',
            function: { name: 'read_file', arguments: '{"path":"a.txt"}' },
          }],
        },
      },
      {
        response: {
          content: 'Reading file...',
          toolCalls: [{
            id: 'call_2', type: 'function',
            function: { name: 'read_file', arguments: '{"path":"a.txt"}' },
          }],
        },
      },
      {
        response: {
          content: 'Reading file...',
          toolCalls: [{
            id: 'call_3', type: 'function',
            function: { name: 'read_file', arguments: '{"path":"a.txt"}' },
          }],
        },
      },
    ])

    const agent = new Agent(mock, { maxIterations: 10 })
    const result = await agent.runTask('Read a file')

    expect(result.success).toBe(false)
    expect(result.summary).toContain('loop')
    expect(result.totalIterations).toBe(3)
  })

  it('should stop at max iterations', async () => {
    const toolNames = ['read_file', 'search_code', 'execute_command', 'read_file', 'search_code']

    // 生成 5 个不同的响应（每个返回不同的 tool call，避免循环检测）
    const responses = Array.from({ length: 5 }, (_, i) => ({
      response: {
        content: `Iteration ${i}`,
        toolCalls: [{
          id: `call_${i}`,
          type: 'function' as const,
          function: { name: toolNames[i], arguments: '{"path":"test.txt"}' },
        }],
      },
    }))

    const mock = new MockLLMProvider(responses)
    const agent = new Agent(mock, { maxIterations: 3 })
    const result = await agent.runTask('Do many things')

    expect(result.success).toBe(false)
    expect(result.summary).toContain('maximum iterations')
    expect(result.totalIterations).toBe(3)
  })
})