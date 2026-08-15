import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { Observation } from '../core/types.js'

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.json']

function collectFiles(dir: string, extensions: string[], maxFiles = 500): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (results.length >= maxFiles) break
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          results.push(...collectFiles(fullPath, extensions, maxFiles - results.length))
        }
      } else if (entry.isFile()) {
        const ext = entry.name.slice(entry.name.lastIndexOf('.'))
        if (extensions.includes(ext)) {
          results.push(fullPath)
        }
      }
    }
  } catch { /* skip unreadable directories */ }
  return results
}

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
    const cwd = process.cwd()
    const extensions = glob
      ? [glob.slice(glob.lastIndexOf('.'))]
      : DEFAULT_EXTENSIONS

    const files = collectFiles(cwd, extensions)
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const matches: string[] = []

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            const relPath = relative(cwd, file)
            matches.push(`${relPath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`)
            if (matches.length >= 50) break // limit results
          }
        }
      } catch { /* skip unreadable files */ }
      if (matches.length >= 50) break
    }

    return {
      actionId: '', success: true,
      output: matches.length > 0 ? matches.join('\n') : 'No matches found.',
      timestamp: Date.now(),
    }
  } catch (error: any) {
    return {
      actionId: '', success: true,
      output: 'No matches found.',
      timestamp: Date.now(),
    }
  }
}