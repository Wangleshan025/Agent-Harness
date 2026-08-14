import { describe, it, expect } from 'vitest'
import { parseAction } from '../../../src/core/action-parser.js'
import { LLMResponse } from '../../../src/core/types.js'

describe('ActionParser', () => {
  it('should parse tool calls from LLM response', () => {
    const response: LLMResponse = {
      content: 'Let me read the file',
      toolCalls: [{
        id: 'call_1',
        type: 'function',
        function: {
          name: 'read_file',
          arguments: JSON.stringify({ path: 'test.txt' }),
        },
      }],
      finishReason: 'tool_calls',
    }

    const actions = parseAction(response)
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('read_file')
    expect(actions[0].params).toEqual({ path: 'test.txt' })
    expect(actions[0].thought).toBe('Let me read the file')
    expect(actions[0].id).toBeTruthy()
  })

  it('should parse multiple tool calls', () => {
    const response: LLMResponse = {
      content: 'Doing both',
      toolCalls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'read_file', arguments: '{"path":"a.txt"}' },
        },
        {
          id: 'call_2',
          type: 'function',
          function: { name: 'write_file', arguments: '{"path":"b.txt","content":"hello"}' },
        },
      ],
      finishReason: 'tool_calls',
    }

    const actions = parseAction(response)
    expect(actions).toHaveLength(2)
    expect(actions[0].type).toBe('read_file')
    expect(actions[1].type).toBe('write_file')
  })

  it('should return empty array when no tool calls', () => {
    const response: LLMResponse = {
      content: 'Task complete.',
      finishReason: 'stop',
    }

    const actions = parseAction(response)
    expect(actions).toHaveLength(0)
  })

  it('should handle invalid JSON in arguments gracefully', () => {
    const response: LLMResponse = {
      content: '',
      toolCalls: [{
        id: 'call_1',
        type: 'function',
        function: {
          name: 'read_file',
          arguments: '{invalid json}',
        },
      }],
      finishReason: 'tool_calls',
    }

    const actions = parseAction(response)
    expect(actions).toHaveLength(1)
    // 无效 JSON 时 params 应为空对象
    expect(actions[0].params).toEqual({})
  })
})