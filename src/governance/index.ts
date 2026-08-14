import { Action, GuardrailResult, HarnessConfig } from '../core/types.js'
import { checkStaticRules } from './static-rules.js'
import { assessDynamicRisk } from './dynamic-risk.js'
import { HITLManager } from './hitl.js'

export class Guardrail {
  private config: HarnessConfig
  private hitlManager: HITLManager

  constructor(config: HarnessConfig) {
    this.config = config
    this.hitlManager = new HITLManager({ hitlTimeout: config.hitlTimeout })
  }

  async check(action: Action): Promise<GuardrailResult> {
    // 第一层：静态规则
    const staticResult = checkStaticRules(action, this.config)
    if (staticResult.action === 'block') {
      return staticResult
    }

    // 第二层：动态风险评估
    const dynamicResult = assessDynamicRisk(action, staticResult)
    if (dynamicResult.action === 'request_approval') {
      // 第三层：HITL 审批
      this.hitlManager.createRequest(action, dynamicResult)
      return dynamicResult
    }

    return dynamicResult
  }

  getHITLManager(): HITLManager {
    return this.hitlManager
  }
}

export { checkStaticRules } from './static-rules.js'
export { assessDynamicRisk } from './dynamic-risk.js'
export { HITLManager } from './hitl.js'