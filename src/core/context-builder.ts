import { Message, Action, Observation, Memory } from './types.js'

const SYSTEM_PROMPT = `You are HarnessX, a coding agent that helps developers with software engineering tasks.

You have access to the following tools:
- read_file: Read a file's contents
- write_file: Write content to a file (overwrites existing)
- edit_file: Make precise text replacements in a file
- execute_command: Run shell commands in the project directory
- run_tests: Run tests and parse results
- search_code: Search for patterns in the codebase
- ask_user: Ask the user a question when you need clarification

For each task, think step by step, then use tools to accomplish the goal.
When the task is complete, respond with a summary of what was done.`

export function buildContext(
  task: string,
  history: Array<{ action: Action; observation: Observation }>,
  memory?: Memory,
): Message[] {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  // 注入记忆
  if (memory?.projectConventions && Object.keys(memory.projectConventions).length > 0) {
    const conventions = Object.entries(memory.projectConventions)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')
    messages.push({
      role: 'system',
      content: `Project conventions:\n${conventions}`,
    })
  }

  // 注入历史记录
  for (const turn of history) {
    // Assistant message with tool call metadata
    messages.push({
      role: 'assistant',
      content: turn.action.thought ?? '',
      tool_calls: [{
        id: turn.action.id,
        type: 'function',
        function: {
          name: turn.action.type,
          arguments: JSON.stringify(turn.action.params),
        },
      }],
    })
    // Tool response message with matching tool_call_id
    messages.push({
      role: 'tool',
      content: turn.observation.error || turn.observation.output,
      tool_call_id: turn.action.id,
    })
  }

  // 注入当前任务
  messages.push({ role: 'user', content: task })

  return messages
}