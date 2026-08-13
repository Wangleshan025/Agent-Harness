import { describe, it, expect } from 'vitest'
import { loadConfig } from '../../../src/config/loader.ts'
import { DEFAULT_CONFIG } from '../../../src/core/types.ts'

describe('ConfigLoader', () => {
  it('should return default config when no overrides and no config file', () => {
    const config = loadConfig()
    expect(config.maxIterations).toBe(DEFAULT_CONFIG.maxIterations)
    expect(config.commandTimeout).toBe(DEFAULT_CONFIG.commandTimeout)
    expect(config.llmTimeout).toBe(DEFAULT_CONFIG.llmTimeout)
    expect(config.hitlTimeout).toBe(DEFAULT_CONFIG.hitlTimeout)
    expect(config.projectDir).toBeTruthy()
  })

  it('should merge overrides with defaults', () => {
    const config = loadConfig({ maxIterations: 10, commandTimeout: 300_000 })
    expect(config.maxIterations).toBe(10)
    expect(config.commandTimeout).toBe(300_000)
    expect(config.llmTimeout).toBe(DEFAULT_CONFIG.llmTimeout) // 未被覆盖
  })

  it('should have default blockList with dangerous commands', () => {
    const config = loadConfig()
    expect(config.blockList.length).toBeGreaterThan(0)
    expect(config.blockList).toContain('rm -rf /')
  })
})