import { describe, it, expect } from 'vitest'
import { validateTestOutput } from '../../../src/feedback/validator.js'

describe('Validator', () => {
  it('should parse passing tests', () => {
    const output = `
 PASS  tests/unit/core/agent.test.ts
  ✓ should complete a task (12ms)
  ✓ should detect loop (8ms)
  ✓ should stop at max iterations (10ms)
`
    const results = validateTestOutput(output)
    expect(results).toHaveLength(3)
    expect(results.every(r => r.passed)).toBe(true)
  })

  it('should parse failing tests', () => {
    const output = `
 FAIL  tests/unit/core/agent.test.ts
  ✗ should complete a task (12ms)
  ✗ should detect loop (8ms)
`
    const results = validateTestOutput(output)
    expect(results).toHaveLength(2)
    expect(results.every(r => !r.passed)).toBe(true)
  })

  it('should handle mixed results', () => {
    const output = `
 PASS  tests/unit/a.test.ts
  ✓ test A (5ms)
 FAIL  tests/unit/b.test.ts
  ✗ test B (3ms)
`
    const results = validateTestOutput(output)
    expect(results).toHaveLength(2)
    expect(results[0].passed).toBe(true)
    expect(results[0].testName).toBe('test A')
    expect(results[1].passed).toBe(false)
    expect(results[1].testName).toBe('test B')
  })

  it('should return empty array for output with no tests', () => {
    const results = validateTestOutput('No tests found')
    expect(results).toEqual([])
  })

  it('should handle empty output', () => {
    const results = validateTestOutput('')
    expect(results).toEqual([])
  })

  it('should calculate pass rate correctly', () => {
    const output = `
 PASS  tests/unit/a.test.ts
  ✓ test A (5ms)
  ✓ test B (3ms)
 FAIL  tests/unit/c.test.ts
  ✗ test C (10ms)
`
    const results = validateTestOutput(output)
    expect(results.filter(r => r.passed).length).toBe(2)
    expect(results.filter(r => !r.passed).length).toBe(1)
  })
})