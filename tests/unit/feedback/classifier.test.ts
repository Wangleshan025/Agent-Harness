import { describe, it, expect } from 'vitest'
import { classifyFailure } from '../../../src/feedback/classifier.js'

describe('Classifier', () => {
  it('should classify compilation errors', () => {
    const result = classifyFailure("TS2345: Type 'string' is not assignable to type 'number'", [])
    expect(result.category).toBe('compilation_error')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should classify test failures', () => {
    const result = classifyFailure('AssertionError: expected 1 to equal 2', [])
    expect(result.category).toBe('test_failure')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should classify runtime errors', () => {
    const result = classifyFailure('TypeError: Cannot read property of undefined', [])
    expect(result.category).toBe('runtime_error')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should classify lint errors', () => {
    const result = classifyFailure('ESLint: Unexpected console statement (no-console)', [])
    expect(result.category).toBe('lint_error')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should classify timeout', () => {
    const result = classifyFailure('Timeout - Async callback was not invoked within 5000ms', [])
    expect(result.category).toBe('timeout')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should classify unknown errors', () => {
    const result = classifyFailure('Something weird happened', [])
    expect(result.category).toBe('unknown')
    expect(result.confidence).toBeLessThan(0.5)
  })
})