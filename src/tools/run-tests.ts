import { execSync } from 'child_process'
import { Observation, TestResult } from '../core/types.js'

export async function handleRunTests(params: Record<string, unknown>): Promise<Observation> {
  const testCommand = (params.testCommand as string) || 'npx vitest run'

  try {
    const output = execSync(testCommand, {
      cwd: process.cwd(),
      timeout: 120_000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    })

    // 解析测试结果（简化版）
    const testResults = parseTestOutput(output)

    return {
      actionId: '', success: true,
      output,
      testResults,
      exitCode: 0,
      timestamp: Date.now(),
    }
  } catch (error: any) {
    const output = error.stdout || ''
    const testResults = parseTestOutput(output)

    return {
      actionId: '', success: false,
      output,
      error: error.stderr || error.message,
      testResults,
      exitCode: error.status ?? 1,
      timestamp: Date.now(),
    }
  }
}

function parseTestOutput(output: string): TestResult[] {
  const results: TestResult[] = []
  // 匹配 Vitest/Jest 格式： ✓ test name (x ms) 或 ✗ test name (x ms)
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