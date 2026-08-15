#!/usr/bin/env node
import { Command } from 'commander'
import { createInterface } from 'readline'
import { Agent } from './core/agent.js'
import { MockLLMProvider } from './core/mock-llm.js'
import { DeepSeekProvider } from './core/llm.js'
import { ToolRegistry } from './tools/registry.js'
import { handleReadFile } from './tools/read-file.js'
import { handleWriteFile } from './tools/write-file.js'
import { handleEditFile } from './tools/edit-file.js'
import { handleExecuteCommand } from './tools/execute-command.js'
import { handleRunTests } from './tools/run-tests.js'
import { handleSearchCode } from './tools/search-code.js'
import { handleAskUser } from './tools/ask-user.js'
import { Guardrail } from './governance/index.js'
import { loadConfig } from './config/loader.js'
import { CredentialManager } from './config/credential-manager.js'

const program = new Command()

program
  .name('harnessx')
  .description('Coding Agent Harness — 安全、可控、可观察的编码 agent 运行引擎')
  .version('0.1.0')

program
  .command('run')
  .description('运行一个编码任务')
  .argument('<task>', '任务描述')
  .option('-m, --mock', '使用 MockLLM（测试模式）')
  .option('-v, --verbose', '详细输出')
  .action(async (task: string, options: { mock?: boolean; verbose?: boolean }) => {
    const config = loadConfig()
    const credentialManager = new CredentialManager({
      masterPassword: process.env.HARNESS_MASTER_PASSWORD || '',
    })

    // 获取 API Key
    let apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      const stored = await credentialManager.getKey()
      if (stored) apiKey = stored
    }

    // 初始化 LLM
    const llm = options.mock
      ? new MockLLMProvider([
          { response: { content: 'Task completed successfully.' } },
        ])
      : apiKey
        ? new DeepSeekProvider({ apiKey })
        : new MockLLMProvider([
            { response: { content: 'No API key configured. Running in mock mode.' } },
          ])

    // 初始化工具注册表
    const registry = new ToolRegistry()
    registry.register('read_file', handleReadFile)
    registry.register('write_file', handleWriteFile)
    registry.register('edit_file', handleEditFile)
    registry.register('execute_command', handleExecuteCommand)
    registry.register('run_tests', handleRunTests)
    registry.register('search_code', handleSearchCode)
    registry.register('ask_user', handleAskUser)

    // 初始化治理护栏
    const guardrail = new Guardrail(config)

    // 创建 Agent（传入工具注册表和护栏，实现完整循环）
    const agent = new Agent(llm, config, undefined, registry, guardrail)

    console.log(`\n🔧 HarnessX — Running task: "${task}"\n`)

    if (options.verbose) {
      console.log(`Config: ${JSON.stringify(config, null, 2)}\n`)
    }

    const result = await agent.runTask(task)

    if (result.success) {
      console.log(`\n✅ Task completed in ${result.totalIterations} iterations`)
      console.log(`Summary: ${result.summary}`)
    } else {
      console.log(`\n❌ Task failed after ${result.totalIterations} iterations`)
      console.log(`Reason: ${result.summary}`)
    }

    // 详细输出：显示每一步的 action + observation
    if (options.verbose && result.turns.length > 0) {
      console.log(`\n📋 Execution log:`)
      for (const turn of result.turns) {
        console.log(`  [#${turn.iteration}] ${turn.action.type}`)
        console.log(`    params: ${JSON.stringify(turn.action.params)}`)
        if (turn.observation.error) {
          console.log(`    ❌ error: ${turn.observation.error}`)
        } else {
          console.log(`    ✅ output: ${turn.observation.output.slice(0, 200)}`)
        }
      }
    }
  })

program
  .command('cred')
  .description('管理 API Key 凭据')
  .addCommand(
    new Command('init')
      .description('初始化凭据存储（首次使用）')
      .action(async () => {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const password = await new Promise<string>(resolve => {
          rl.question('Enter master password: ', resolve)
        })
        const apiKey = await new Promise<string>(resolve => {
          rl.question('Enter DeepSeek API Key: ', resolve)
        })
        rl.close()

        const manager = new CredentialManager({ masterPassword: password })
        await manager.init(apiKey)
        console.log('✅ Credentials initialized successfully.')
      }),
  )
  .addCommand(
    new Command('update')
      .description('更新 API Key')
      .action(async () => {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const password = await new Promise<string>(resolve => {
          rl.question('Enter master password: ', resolve)
        })
        const apiKey = await new Promise<string>(resolve => {
          rl.question('Enter new DeepSeek API Key: ', resolve)
        })
        rl.close()

        const manager = new CredentialManager({ masterPassword: password })
        await manager.update(apiKey)
        console.log('✅ Credentials updated successfully.')
      }),
  )
  .addCommand(
    new Command('clear')
      .description('清除所有凭据')
      .action(async () => {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const password = await new Promise<string>(resolve => {
          rl.question('Enter master password to confirm: ', resolve)
        })
        rl.close()

        const manager = new CredentialManager({ masterPassword: password })
        await manager.clear()
        console.log('✅ Credentials cleared.')
      }),
  )
  .addCommand(
    new Command('status')
      .description('查看凭据状态')
      .action(async () => {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const password = await new Promise<string>(resolve => {
          rl.question('Enter master password: ', resolve)
        })
        rl.close()

        const manager = new CredentialManager({ masterPassword: password })
        const status = await manager.status()
        console.log(`Initialized: ${status.initialized}`)
        console.log(`Key exists: ${status.keyExists}`)
        console.log(`File exists: ${status.fileExists}`)
      }),
  )

program.parse(process.argv)