import { describe, it, expect } from 'vitest'
import { MockLLMProvider } from '../../../src/core/mock-llm.js'
import { Message } from '../../../src/core/types.js'

describe('MockLLMProvider', () => {
  it('should return sequential responses', async () => {
    const mock = new MockLLMProvider([
      { response: { content: 'First response' } },
      { response: { content: 'Second response' } },
    ])

    const r1 = await mock.chat([])
    expect(r1.content).toBe('First response')
    expect(r1.finishReason).toBe('stop')

    const r2 = await mock.chat([])
    expect(r2.content).toBe('Second response')
  })

  it('should return tool calls', async () => {
    const mock = new MockLLMProvider([
      {
        response: {
          content: '',
          toolCalls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'read_file', arguments: '{"path":"test.txt"}' },
          }],
        },
      },
    ])

    const r = await mock.chat([])
    expect(r.toolCalls).toHaveLength(1)
    expect(r.toolCalls![0].function.name).toBe('read_file')
    expect(r.finishReason).toBe('tool_calls')
  })

  it('should support match predicates', async () => {
    const mock = new MockLLMProvider([
      {
        match: (msgs) => msgs.some(m => m.content.includes('test')),
        response: { content: 'Matched' },
      },
    ])

    const r = await mock.chat([{ role: 'user', content: 'run test' }])
    expect(r.content).toBe('Matched')
  })

  it('should return empty on unmatched sequential call', async () => {
    const mock = new MockLLMProvider([
      { response: { content: 'Only one' } },
    ])

    await mock.chat([]) // consume the first one
    const r = await mock.chat([]) // exceeds the list
    expect(r.content).toBe('')
    expect(r.finishReason).toBe('stop')
  })

  it('should reset call index', async () => {
    const mock = new MockLLMProvider([
      { response: { content: 'A' } },
      { response: { content: 'B' } },
    ])

    await mock.chat([])
    mock.reset()
    const r = await mock.chat([])
    expect(r.content).toBe('A')
  })
})