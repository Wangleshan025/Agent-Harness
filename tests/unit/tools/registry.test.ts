import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../../../src/tools/registry.js'
import { handleReadFile } from '../../../src/tools/read-file.js'
import { Action } from '../../../src/core/types.js'

describe('ToolRegistry', () => {
  it('should register and execute a tool', async () => {
    const registry = new ToolRegistry()
    registry.register('read_file', handleReadFile)

    expect(registry.has('read_file')).toBe(true)
    expect(registry.has('unknown_tool')).toBe(false)
  })

  it('should return error for unknown tool', async () => {
    const registry = new ToolRegistry()
    const action: Action = {
      type: 'unknown_tool' as any,
      params: {},
      id: 'test_1',
    }

    const obs = await registry.execute(action)
    expect(obs.success).toBe(false)
    expect(obs.error).toContain('Unknown tool')
  })
})