import { FailureCategory, CorrectionStrategy } from '../core/types.js'

const STRATEGIES: Record<FailureCategory, CorrectionStrategy> = {
  compilation_error: {
    maxRetries: 3,
    action: 'edit_file',
    prompt: 'Fix the TypeScript compilation error by editing the affected file',
  },
  test_failure: {
    maxRetries: 3,
    action: 'edit_file',
    prompt: 'Fix the failing test by editing the implementation or test file',
  },
  runtime_error: {
    maxRetries: 2,
    action: 'retry',
    prompt: 'Retry the operation that caused the runtime error',
  },
  lint_error: {
    maxRetries: 2,
    action: 'edit_file',
    prompt: 'Fix the lint error by editing the affected file',
  },
  timeout: {
    maxRetries: 1,
    action: 'retry',
    prompt: 'Retry with increased timeout',
  },
  unknown: {
    maxRetries: 1,
    action: 'ask_user',
    prompt: 'Ask the user for guidance on how to proceed',
  },
}

export function selectStrategy(
  category: FailureCategory,
  retryCount: number,
): CorrectionStrategy | null {
  const strategy = STRATEGIES[category]
  if (!strategy) return null

  if (retryCount >= strategy.maxRetries) {
    return null
  }

  return strategy
}