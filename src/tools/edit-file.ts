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
  const cwd = normalize(process.cwd())

  if (!normalizedPath.startsWith(cwd)) {
    return {
      actionId: '', success: false, output: '',
      error: `Security: path "${path}" is outside the project directory`,
      timestamp: Date.now(),
    }
  }

  try {
    const content = await readFile(normalizedPath, 'utf-8')
    if (!content.includes(oldString)) {
      // 找到附近的内容帮助 Agent 诊断
      const lines = content.split('\n')
      const searchWords = oldString.split(/\s+/).filter(w => w.length > 3)
      let hint = ''
      if (searchWords.length > 0) {
        for (let i = 0; i < lines.length; i++) {
          if (searchWords.some(w => lines[i].toLowerCase().includes(w.toLowerCase()))) {
            const start = Math.max(0, i - 2)
            const end = Math.min(lines.length, i + 3)
            const context = lines.slice(start, end).map((l, idx) => `${start + idx + 1}: ${l}`).join('\n')
            hint = `\nNear match found at line ${i + 1}:\n${context}`
            break
          }
        }
      }
      return {
        actionId: '', success: false, output: '',
        error: `old_string not found in file.${hint}\n\nFile is ${content.length} chars, ${lines.length} lines.`,
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