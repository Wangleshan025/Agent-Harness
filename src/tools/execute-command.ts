import { execSync } from 'child_process'
import { Observation } from '../core/types.js'

export async function handleExecuteCommand(params: Record<string, unknown>): Promise<Observation> {
  const command = params.command as string | undefined
  const timeout = (params.timeout as number) ?? 120_000

  if (!command) {
    return {
      actionId: '', success: false, output: '',
      error: 'Missing required parameter: command', timestamp: Date.now(),
    }
  }

  try {
    const output = execSync(command, {
      cwd: (params.cwd as string) || process.cwd(),
      timeout,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })

    return {
      actionId: '', success: true,
      output: output || '(command produced no output)',
      exitCode: 0,
      timestamp: Date.now(),
    }
  } catch (error: any) {
    return {
      actionId: '', success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      exitCode: error.status ?? 1,
      timestamp: Date.now(),
    }
  }
}