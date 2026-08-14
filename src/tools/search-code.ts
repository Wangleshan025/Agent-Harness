import { execSync } from 'child_process'
import { Observation } from '../core/types.js'

export async function handleSearchCode(params: Record<string, unknown>): Promise<Observation> {
  const pattern = params.pattern as string | undefined
  const glob = params.glob as string | undefined

  if (!pattern) {
    return {
      actionId: '', success: false, output: '',
      error: 'Missing required parameter: pattern', timestamp: Date.now(),
    }
  }

  try {
    let cmd = `grep -rn "${pattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" .`
    if (glob) {
      cmd = `grep -rn "${pattern}" "${glob}" .`
    }

    const output = execSync(cmd, {
      cwd: process.cwd(),
      timeout: 30_000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })

    return {
      actionId: '', success: true,
      output: output || 'No matches found.',
      timestamp: Date.now(),
    }
  } catch (error: any) {
    // grep 返回非零退出码意味着没有匹配
    return {
      actionId: '', success: true,
      output: 'No matches found.',
      timestamp: Date.now(),
    }
  }
}