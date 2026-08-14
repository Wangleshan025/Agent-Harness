import { describe, it, expect } from 'vitest'
import { Agent } from '../../src/core/agent.js'
import { MockLLMProvider } from '../../src/core/mock-llm.js'
import { HarnessConfig } from '../../src/core/types.js'

describe('Full Loop Integration', () => {
  it('should complete a multi-step task with tool calls', async () => {
    const mock = new MockLLMProvider([
      {
        response: {
          content: 'Let me read the file first.',
          toolCalls: [{
            id: 'call_1', type: 'function',
            function: { name: 'read_file', arguments: '{"path":"test.txt"}' },
          }],
        },
      },
      {
        response: {
          content: 'Now let me write the solution.',
          toolCalls: [{
            id: 'call_2', type: 'function',
            function: { name: 'write_file', arguments: '{"path":"output.txt","content":"done"}' },
          }],
        },
      },
      {
        response: { content: 'Task is complete. I have read the file and written the output.' },
      },
    ])

    const agent = new Agent(mock, { maxIterations: 10 })
    const result = await agent.runTask('Read file and write output')

    expect(result.success).toBe(true)
    expect(result.totalIterations).toBe(3)
  })

  it('should handle task that requires no tool calls', async () => {
    const mock = new MockLLMProvider([
      { response: { content: 'Here is the answer: 42.' } },
    ])

    const agent = new Agent(mock, { maxIterations: 10 })
    const result = await agent.runTask('What is the meaning of life?')

    expect(result.success).toBe(true)
    expect(result.summary).toContain('42')
    expect(result.totalIterations).toBe(1)
  })

  it('should loop detect when stuck', async () => {
    const mock = new MockLLMProvider([
      {
        response: {
          content: 'Reading...',
          toolCalls: [{ id: 'c1', type: 'function', function: { name: 'read_file', arguments: '{"path":"x"}' } }],
        },
      },
      {
        response: {
          content: 'Reading...',
          toolCalls: [{ id: 'c2', type: 'function', function: { name: 'read_file', arguments: '{"path":"x"}' } }],
        },
      },
      {
        response: {
          content: 'Reading...',
          toolCalls: [{ id: 'c3', type: 'function', function: { name: 'read_file', arguments: '{"path":"x"}' } }],
        },
      },
    ])

    const agent = new Agent(mock, { maxIterations: 10 })
    const result = await agent.runTask('Read file x')

    expect(result.success).toBe(false)
    expect(result.summary).toContain('loop')
  })
})