import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HITLManager } from '../../../src/governance/hitl.js'
import { Action, GuardrailResult } from '../../../src/core/types.js'

describe('HITLManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should create a pending HITL state', () => {
    const manager = new HITLManager({ hitlTimeout: 60_000 })
    const action: Action = { type: 'execute_command', id: 't1', params: { command: 'rm -rf' } }
    const guardrail: GuardrailResult = {
      action: 'request_approval', level: 'danger',
      reason: 'Risk score 30', riskScore: 30,
    }

    const state = manager.createRequest(action, guardrail)
    expect(state.status).toBe('pending')
    expect(state.riskLevel).toBe('high')
    expect(state.reason).toBe('Risk score 30')
    expect(state.id).toBeTruthy()
  })

  it('should approve a request', () => {
    const manager = new HITLManager({ hitlTimeout: 60_000 })
    const action: Action = { type: 'execute_command', id: 't1', params: { command: 'rm -rf' } }
    const guardrail: GuardrailResult = {
      action: 'request_approval', level: 'danger', reason: 'test', riskScore: 30,
    }

    const state = manager.createRequest(action, guardrail)
    const approved = manager.resolve('t1', 'approved')
    expect(approved?.status).toBe('approved')
    expect(approved?.resolvedAt).toBeTruthy()
  })

  it('should reject a request', () => {
    const manager = new HITLManager({ hitlTimeout: 60_000 })
    const action: Action = { type: 'execute_command', id: 't1', params: { command: 'rm -rf' } }
    const guardrail: GuardrailResult = {
      action: 'request_approval', level: 'danger', reason: 'test', riskScore: 30,
    }

    manager.createRequest(action, guardrail)
    const rejected = manager.resolve('t1', 'rejected')
    expect(rejected?.status).toBe('rejected')
  })

  it('should auto-timeout after configured duration', async () => {
    const manager = new HITLManager({ hitlTimeout: 10_000 })
    const action: Action = { type: 'execute_command', id: 't1', params: { command: 'test' } }
    const guardrail: GuardrailResult = {
      action: 'request_approval', level: 'warning', reason: 'test', riskScore: 10,
    }

    manager.createRequest(action, guardrail)
    vi.advanceTimersByTime(11_000)

    const state = manager.getState('t1')
    expect(state?.status).toBe('timeout')
  })

  it('should return null for unknown action ID', () => {
    const manager = new HITLManager({ hitlTimeout: 60_000 })
    expect(manager.getState('unknown')).toBeNull()
    expect(manager.resolve('unknown', 'approved')).toBeNull()
  })

  it('should return isPending status correctly', () => {
    const manager = new HITLManager({ hitlTimeout: 60_000 })
    expect(manager.isPending('t1')).toBe(false)

    const action: Action = { type: 'execute_command', id: 't1', params: { command: 'test' } }
    const guardrail: GuardrailResult = {
      action: 'request_approval', level: 'warning', reason: 'test', riskScore: 10,
    }

    manager.createRequest(action, guardrail)
    expect(manager.isPending('t1')).toBe(true)

    manager.resolve('t1', 'approved')
    expect(manager.isPending('t1')).toBe(false)
  })
})