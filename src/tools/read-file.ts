import { readFile } from 'fs/promises'
import { resolve, normalize } from 'path'
import { Observation } from '../core/types.js'

export async function handleReadFile(params: Record<string, unknown>): Promise<Observation> {
  const path = params.path as string | undefined
  if (!path) {
    return {
      actionId: '',
      success: false,
      output: '',
      error: 'Missing required parameter: path',
      timestamp: Date.now(),
    }
  }

  // 路径越界检查
  const resolvedPath = resolve(process.cwd(), path)
  const normalizedPath = normalize(resolvedPath)
  const cwd = normalize(process.cwd())

  if (!normalizedPath.startsWith(cwd)) {
    return {
      actionId: '',
      success: false,
      output: '',
      error: `Security: path "${path}" is outside the project directory`,
      timestamp: Date.now(),
    }
  }

  try {
    const content = await readFile(normalizedPath, 'utf-8')
    return {
      actionId: '',
      success: true,
      output: content,
      timestamp: Date.now(),
    }
  } catch (error) {
    return {
      actionId: '',
      success: false,
      output: '',
      error: `Failed to read file: ${(error as Error).message}`,
      timestamp: Date.now(),
    }
  }
}