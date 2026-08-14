import { writeFile } from 'fs/promises'
import { resolve, normalize, dirname } from 'path'
import { mkdir } from 'fs/promises'
import { Observation } from '../core/types.js'

export async function handleWriteFile(params: Record<string, unknown>): Promise<Observation> {
  const path = params.path as string | undefined
  const content = params.content as string | undefined

  if (!path) {
    return {
      actionId: '', success: false, output: '',
      error: 'Missing required parameter: path', timestamp: Date.now(),
    }
  }
  if (content === undefined) {
    return {
      actionId: '', success: false, output: '',
      error: 'Missing required parameter: content', timestamp: Date.now(),
    }
  }

  const resolvedPath = resolve(process.cwd(), path)
  const normalizedPath = normalize(resolvedPath)
  const cwd = normalize(process.cwd())

  if (!normalizedPath.startsWith(cwd)) {
    return {
      actionId: '', success: false, output: '',
      error: `Security: path "${path}" is outside the project directory`,
      timestamp: Date.now(),
    }
  }

  // 安全保护：不允许覆盖 .env 和 credentials.enc
  const basename = normalizedPath.split(/[/\\]/).pop() || ''
  if (basename === '.env' || basename === 'credentials.enc') {
    return {
      actionId: '', success: false, output: '',
      error: `Security: writing to "${basename}" is not allowed`,
      timestamp: Date.now(),
    }
  }

  try {
    await mkdir(dirname(normalizedPath), { recursive: true })
    await writeFile(normalizedPath, content, 'utf-8')
    return {
      actionId: '', success: true,
      output: `Successfully wrote ${content.length} bytes to ${path}`,
      timestamp: Date.now(),
    }
  } catch (error) {
    return {
      actionId: '', success: false, output: '',
      error: `Failed to write file: ${(error as Error).message}`,
      timestamp: Date.now(),
    }
  }
}