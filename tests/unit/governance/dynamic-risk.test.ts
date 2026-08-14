import { describe, it, expect } from 'vitest'
import { assessDynamicRisk } from '../../../src/governance/dynamic-risk.js'
import { Action, GuardrailResult } from '../../../src/core/types.js'

describe('DynamicRisk', () => {
  it('should flag recursive delete', () => {
    const action: Action = {
      type: 'execute_command', id: 't1',
      params: { command: 'rm -rf node_modules' },
    }
    const staticResult: GuardrailResult = {
      action: 'allow', level: 'safe', reason: 'Passed', riskScore: 0,
    }
    const result = assessDynamicRisk(action, staticResult)
    expect(result.level).toBe('warning')
    expect(result.riskScore).toBeGreaterThan(0)
  })

  it('should flag network access', () => {
    const action: Action = {
      type: 'execute_command', id: 't2',
      params: { command: 'curl https://example.com' },
    }
    const staticResult: GuardrailResult = {
      action: 'allow', level: 'safe', reason: 'Passed', riskScore: 0,
    }
    const result = assessDynamicRisk(action, staticResult)
    expect(result.level).toBe('warning')
    expect(result.riskScore).toBeGreaterThanOrEqual(10)
  })

  it('should flag write to node_modules', () => {
    const action: Action = {
      type: 'write_file', id: 't3',
      params: { path: 'node_modules/something.js', content: 'x' },
    }
    const staticResult: GuardrailResult = {
      action: 'allow', level: 'safe', reason: 'Passed', riskScore: 0,
    }
    const result = assessDynamicRisk(action, staticResult)
    expect(result.level).toBe('warning')
    expect(result.riskScore).toBeGreaterThan(0)
  })

  it('should return allow for safe operations', () => {
    const action: Action = {
      type: 'read_file', id: 't4',
      params: { path: 'src/index.ts' },
    }
    const staticResult: GuardrailResult = {
      action: 'allow', level: 'safe', reason: 'Passed', riskScore: 0,
    }
    const result = assessDynamicRisk(action, staticResult)
    expect(result.action).toBe('allow')
    expect(result.level).toBe('safe')
  })

  it('should escalate to request_approval when risk exceeds threshold', () => {
    const action: Action = {
      type: 'execute_command', id: 't5',
      params: { command: 'git push --force origin main' },
    }
    const staticResult: GuardrailResult = {
      action: 'allow', level: 'safe', reason: 'Passed', riskScore: 0,
    }
    const result = assessDynamicRisk(action, staticResult)
    // force push 应该触发 request_approval
    expect(result.action).toBe('request_approval')
  })
})