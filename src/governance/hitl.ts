import { Action, GuardrailResult, HITLState } from '../core/types.js'

interface HITLConfig {
  hitlTimeout: number
}

export class HITLManager {
  private states = new Map<string, HITLState>()
  private config: HITLConfig
  private timers = new Map<string, NodeJS.Timeout>()

  constructor(config: HITLConfig) {
    this.config = config
  }

  createRequest(action: Action, guardrail: GuardrailResult): HITLState {
    const state: HITLState = {
      id: action.id,
      action,
      riskLevel: guardrail.level === 'critical' ? 'critical'
        : guardrail.level === 'danger' ? 'high'
        : 'medium',
      reason: guardrail.reason,
      status: 'pending',
      createdAt: Date.now(),
    }

    this.states.set(action.id, state)

    // 自动超时
    const timer = setTimeout(() => {
      const current = this.states.get(action.id)
      if (current && current.status === 'pending') {
        current.status = 'timeout'
        current.resolvedAt = Date.now()
      }
      this.timers.delete(action.id)
    }, this.config.hitlTimeout)

    this.timers.set(action.id, timer)

    return state
  }

  resolve(actionId: string, decision: 'approved' | 'rejected'): HITLState | null {
    const state = this.states.get(actionId)
    if (!state) return null

    // 清除超时计时器
    const timer = this.timers.get(actionId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(actionId)
    }

    state.status = decision
    state.resolvedAt = Date.now()
    return state
  }

  getState(actionId: string): HITLState | null {
    return this.states.get(actionId) ?? null
  }

  isPending(actionId: string): boolean {
    const state = this.states.get(actionId)
    return state?.status === 'pending'
  }
}