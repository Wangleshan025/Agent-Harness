import { Action, GuardrailResult, HarnessConfig } from '../core/types.js'
import { resolve, normalize } from 'path'

const DANGEROUS_PREFIXES = ['sudo ', 'chmod 777 ', 'shutdown', 'reboot', 'init 0', 'poweroff']

export function checkStaticRules(action: Action, config: HarnessConfig): GuardrailResult {
  // 只对 execute_command 做命令检查
  if (action.type === 'execute_command') {
    const command = (action.params.command as string) || ''

    // 精确匹配危险命令黑名单
    for (const dangerous of config.blockList) {
      if (command.includes(dangerous)) {
        return {
          action: 'block',
          level: 'critical',
          reason: `Command contains dangerous pattern: "${dangerous}"`,
          riskScore: 100,
        }
      }
    }

    // 前缀黑名单检查
    for (const prefix of DANGEROUS_PREFIXES) {
      if (command.trim().startsWith(prefix)) {
        return {
          action: 'block',
          level: 'critical',
          reason: `Command starts with dangerous prefix: "${prefix}"`,
          riskScore: 90,
        }
      }
    }
  }

  // 对 read_file / write_file / edit_file 做路径越界检查
  if (['read_file', 'write_file', 'edit_file'].includes(action.type)) {
    const filePath = action.params.path as string
    if (filePath) {
      const resolvedPath = resolve(config.projectDir, filePath)
      const normalizedPath = normalize(resolvedPath)
      const normalizedCwd = normalize(config.projectDir)

      if (!normalizedPath.startsWith(normalizedCwd)) {
        return {
          action: 'block',
          level: 'danger',
          reason: `Path "${filePath}" is outside the project directory`,
          riskScore: 80,
        }
      }
    }
  }

  return {
    action: 'allow',
    level: 'safe',
    reason: 'Passed static rules',
    riskScore: 0,
  }
}