import { describe, it, expect } from 'vitest'
import { Guardrail } from '../../../src/governance/index.js'
import { Action, DEFAULT_CONFIG } from '../../../src/core/types.js'

describe('Guardrail', () => {
  it('should block dangerous commands', async () => {
    const guardrail = new Guardrail(DEFAULT_CONFIG)
    const action: Action = {
      type: 'execute_command', id: 't1',
      params: { command: 'rm -rf /' },
    }

    const result = await guardrail.check(action)
    expect(result.action).toBe('block')
  })

  it('should allow safe commands', async () => {
    const guardrail = new Guardrail(DEFAULT_CONFIG)
    const action: Action = {
      type: 'execute_command', id: 't2',
      params: { command: 'npm test' },
    }

    const result = await guardrail.check(action)
    expect(result.action).toBe('allow')
  })

  it('should request approval for risky commands', async () => {
    const guardrail = new Guardrail(DEFAULT_CONFIG)
    const action: Action = {
      type: 'execute_command', id: 't3',
      params: { command: 'git push --force origin main' },
    }

    const result = await guardrail.check(action)
    expect(result.action).toBe('request_approval')
  })
})