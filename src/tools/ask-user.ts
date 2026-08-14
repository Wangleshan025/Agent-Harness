import { createInterface } from 'readline'
import { Observation } from '../core/types.js'

export async function handleAskUser(params: Record<string, unknown>): Promise<Observation> {
  const question = params.question as string | undefined

  if (!question) {
    return {
      actionId: '', success: false, output: '',
      error: 'Missing required parameter: question', timestamp: Date.now(),
    }
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await new Promise<string>((resolve) => {
    rl.question(`\n[HarnessX] ${question}\n> `, (answer) => {
      resolve(answer)
    })
  })

  rl.close()

  return {
    actionId: '', success: true,
    output: answer,
    timestamp: Date.now(),
  }
}