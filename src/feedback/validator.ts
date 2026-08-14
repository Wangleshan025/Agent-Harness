import { TestResult } from '../core/types.js'

export function validateTestOutput(output: string): TestResult[] {
  if (!output) return []

  const results: TestResult[] = []
  const passRegex = /✓\s+(.+?)\s+\((\d+)\s*ms\)/g
  const failRegex = /✗\s+(.+?)\s+\((\d+)\s*ms\)/g

  let match: RegExpExecArray | null
  while ((match = passRegex.exec(output)) !== null) {
    results.push({
      testName: match[1].trim(),
      passed: true,
      output: '',
      duration: parseInt(match[2], 10),
    })
  }
  while ((match = failRegex.exec(output)) !== null) {
    results.push({
      testName: match[1].trim(),
      passed: false,
      output: '',
      duration: parseInt(match[2], 10),
    })
  }

  return results
}