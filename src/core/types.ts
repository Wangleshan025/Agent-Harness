// === 核心 ===
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

export interface LLMResponse {
  content: string
  toolCalls?: ToolCall[]
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

// === Action ===
export type ActionType =
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'execute_command'
  | 'run_tests'
  | 'search_code'
  | 'ask_user'

export interface Action {
  type: ActionType
  params: Record<string, unknown>
  thought?: string
  id: string
}

// === Observation ===
export interface Observation {
  actionId: string
  success: boolean
  output: string
  error?: string
  exitCode?: number
  testResults?: TestResult[]
  timestamp: number
}

export interface TestResult {
  testName: string
  passed: boolean
  output: string
  error?: string
  duration: number
}

// === Turn ===
export interface Turn {
  action: Action
  observation: Observation
  iteration: number
}

// === 治理 ===
export interface GuardrailResult {
  action: 'allow' | 'block' | 'request_approval'
  level: 'safe' | 'warning' | 'danger' | 'critical'
  reason: string
  riskScore?: number
}

export interface HITLState {
  id: string
  action: Action
  riskLevel: 'medium' | 'high' | 'critical'
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'timeout'
  createdAt: number
  resolvedAt?: number
}

// === 反馈 ===
export type FailureCategory =
  | 'compilation_error'
  | 'test_failure'
  | 'runtime_error'
  | 'lint_error'
  | 'timeout'
  | 'unknown'

export interface CorrectionStrategy {
  maxRetries: number
  action: 'edit_file' | 'retry' | 'ask_user'
  prompt: string
}

// === 记忆 ===
export interface Decision {
  title: string
  choice: string
  reason: string
  timestamp: number
}

export interface Memory {
  projectConventions: Record<string, string>
  decisions: Decision[]
  workingMemory: {
    currentGoal: string
    completedSteps: string[]
    remainingSteps: string[]
  }
}

// === 配置 ===
export interface HarnessConfig {
  maxIterations: number
  commandTimeout: number
  llmTimeout: number
  hitlTimeout: number
  allowList: string[]
  blockList: string[]
  projectDir: string
}

export const DEFAULT_CONFIG: HarnessConfig = {
  maxIterations: 20,
  commandTimeout: 120_000,
  llmTimeout: 60_000,
  hitlTimeout: 60_000,
  allowList: [],
  blockList: [
    'rm -rf /',
    'dd if=',
    'format',
    'mkfs',
    '> /dev/sda',
  ],
  projectDir: process.cwd(),
}