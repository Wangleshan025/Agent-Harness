import { FailureCategory, TestResult } from '../core/types.js'

interface ClassificationRule {
  patterns: RegExp[]
  category: FailureCategory
}

const RULES: ClassificationRule[] = [
  {
    patterns: [/TS\d{4,}/, /TypeScript.*error/i, /Cannot find module/, /is not assignable to type/],
    category: 'compilation_error',
  },
  {
    patterns: [/AssertionError/, /expected.*to equal/, /assert\.(strict)?Equal/, /expect\(.*\)\.toBe/],
    category: 'test_failure',
  },
  {
    patterns: [/TypeError:/, /ReferenceError:/, /RangeError:/, /SyntaxError:/, /Cannot read propert/],
    category: 'runtime_error',
  },
  {
    patterns: [/ESLint:/, /eslint/, /no-unused-vars/, /no-console/],
    category: 'lint_error',
  },
  {
    patterns: [/Timeout/, /timed? out/i, /aborted/],
    category: 'timeout',
  },
]

export function classifyFailure(
  output: string,
  _testResults: TestResult[],
): { category: FailureCategory; confidence: number } {
  let bestMatch = { category: 'unknown' as FailureCategory, confidence: 0 }

  for (const rule of RULES) {
    let matchCount = 0
    for (const pattern of rule.patterns) {
      if (pattern.test(output)) {
        matchCount++
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(1, 0.5 + matchCount / rule.patterns.length)
      if (confidence > bestMatch.confidence) {
        bestMatch = { category: rule.category, confidence }
      }
    }
  }

  if (bestMatch.confidence === 0) {
    return { category: 'unknown', confidence: 0.3 }
  }

  return bestMatch
}