import { Action, GuardrailResult } from '../core/types.js'

const RISK_PATTERNS: Array<{
  pattern: RegExp
  score: number
  description: string
}> = [
  { pattern: /rm\s+-rf/, score: 30, description: 'Recursive force delete' },
  { pattern: /--force/, score: 20, description: 'Force flag detected' },
  { pattern: /\bcurl\b/, score: 10, description: 'Network access (curl)' },
  { pattern: /\bwget\b/, score: 10, description: 'Network access (wget)' },
  { pattern: /git\s+push.*--force/, score: 40, description: 'Force push to git' },
  { pattern: /git\s+reset.*--hard/, score: 35, description: 'Hard git reset' },
  { pattern: /drop\s+table/i, score: 50, description: 'Database drop table' },
  { pattern: /delete\s+from\s+\w+/i, score: 30, description: 'Database delete' },
]

const PROTECTED_PATHS = [
  /node_modules[/\\]/,
  /\.git[/\\]/,
  /dist[/\\]/,
  /coverage[/\\]/,
  /\.env$/,
  /credentials\.enc$/,
]

const REQUEST_APPROVAL_THRESHOLD = 30

export function assessDynamicRisk(
  action: Action,
  staticResult: GuardrailResult,
): GuardrailResult {
  // 如果静态规则已经拦截，直接返回
  if (staticResult.action === 'block') {
    return staticResult
  }

  let riskScore = staticResult.riskScore ?? 0

  // 对 execute_command 做参数分析
  if (action.type === 'execute_command') {
    const command = (action.params.command as string) || ''

    for (const rp of RISK_PATTERNS) {
      if (rp.pattern.test(command)) {
        riskScore += rp.score
      }
    }
  }

  // 对 write_file 做路径检查
  if (action.type === 'write_file') {
    const filePath = (action.params.path as string) || ''
    for (const pp of PROTECTED_PATHS) {
      if (pp.test(filePath)) {
        riskScore += 15
      }
    }
  }

  // 根据风险分决定动作
  if (riskScore >= REQUEST_APPROVAL_THRESHOLD) {
    return {
      action: 'request_approval',
      level: riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'danger' : 'warning',
      reason: `Risk score ${riskScore} exceeds approval threshold`,
      riskScore,
    }
  }

  if (riskScore > 0) {
    return {
      action: 'allow',
      level: 'warning',
      reason: `Low risk (score: ${riskScore}), allowing`,
      riskScore,
    }
  }

  return {
    action: 'allow',
    level: 'safe',
    reason: 'No dynamic risk detected',
    riskScore: 0,
  }
}