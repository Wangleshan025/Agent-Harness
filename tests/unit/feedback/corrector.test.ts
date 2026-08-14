import { describe, it, expect } from 'vitest'
import { selectStrategy } from '../../../src/feedback/corrector.js'

describe('Corrector', () => {
  it('should return edit_file strategy for compilation errors', () => {
    const strategy = selectStrategy('compilation_error', 0)
    expect(strategy).not.toBeNull()
    expect(strategy!.action).toBe('edit_file')
    expect(strategy!.maxRetries).toBeGreaterThan(0)
  })

  it('should return edit_file strategy for test failures', () => {
    const strategy = selectStrategy('test_failure', 0)
    expect(strategy).not.toBeNull()
    expect(strategy!.action).toBe('edit_file')
  })

  it('should return retry strategy for runtime errors', () => {
    const strategy = selectStrategy('runtime_error', 0)
    expect(strategy).not.toBeNull()
    expect(strategy!.action).toBe('retry')
  })

  it('should return ask_user strategy for unknown errors', () => {
    const strategy = selectStrategy('unknown', 0)
    expect(strategy).not.toBeNull()
    expect(strategy!.action).toBe('ask_user')
  })

  it('should return null when max retries exceeded', () => {
    const strategy = selectStrategy('compilation_error', 5)
    expect(strategy).toBeNull()
  })

  it('should return strategy when retries within limit', () => {
    const strategy = selectStrategy('compilation_error', 2)
    expect(strategy).not.toBeNull()
  })
})