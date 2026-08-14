import { readFile, writeFile } from 'fs/promises'
import { resolve, normalize } from 'path'
import { Observation } from '../core/types.js'

export async function handleEditFile(params: Record<string, unknown>): Promise<Observation> {
  const path = params.path as string | undefined
  const oldString = params.old_string as string | undefined
  const newString = params.new_string as string | undefined

  if (!path) return { actionId: '', success: false, output: '', error: 'Missing path', timestamp: Date.now() }
  if (oldString === undefined) return { actionId: '', success: false, output: '', error: 'Missing old_string', timestamp: Date.now() }
  if (newString === undefined) return { actionId: '', success: false, output: '', error: 'Missing new_string', timestamp: Date.now() }

  const resolvedPath = resolve(process.cwd(), path)
  const normalizedPath = normalize(resolvedPath)

  try {
    const content = await readFile(normalizedPath, 'utf-8')
    if (!content.includes(oldString)) {
      return {
        actionId: '', success: false, output: '',
        error: `old_string not found in file: "${oldString.substring(0, 50)}..."`,
        timestamp: Date.now(),
      }
    }

    // 只替换第一次出现
    const newContent = content.replace(oldString, newString)
    await writeFile(normalizedPath, newContent, 'utf-8')
    return {
      actionId: '', success: true,
      output: `Successfully edited ${path}`,
      timestamp: Date.now(),
    }
  } catch (error) {
    return {
      actionId: '', success: false, output: '',
      error: `Failed to edit file: ${(error as Error).message}`,
      timestamp: Date.now(),
    }
  }
}