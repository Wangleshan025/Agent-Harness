import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryStore } from '../../../src/memory/store.js'
import { Memory } from '../../src/core/types.js'
import { unlinkSync, existsSync } from 'fs'
import { resolve } from 'path'

const TEST_FILE = resolve(process.cwd(), '.test-memory.enc')

describe('MemoryStore', () => {
  const testPassword = 'test-master-password-123'

  beforeEach(() => {
    // 清理测试文件
    if (existsSync(TEST_FILE)) {
      unlinkSync(TEST_FILE)
    }
  })

  afterEach(() => {
    if (existsSync(TEST_FILE)) {
      unlinkSync(TEST_FILE)
    }
  })

  it('should save and load memory', async () => {
    const store = new MemoryStore({ filePath: TEST_FILE, password: testPassword })
    const memory: Memory = {
      projectConventions: { testFramework: 'vitest', language: 'TypeScript' },
      decisions: [],
      workingMemory: {
        currentGoal: 'Test memory',
        completedSteps: [],
        remainingSteps: ['Step 1'],
      },
    }

    await store.save(memory)

    const loaded = await store.load()
    expect(loaded).not.toBeNull()
    expect(loaded!.projectConventions.testFramework).toBe('vitest')
    expect(loaded!.projectConventions.language).toBe('TypeScript')
    expect(loaded!.workingMemory.currentGoal).toBe('Test memory')
  })

  it('should return null for missing file', async () => {
    const store = new MemoryStore({ filePath: '/nonexistent/path.enc', password: testPassword })
    const loaded = await store.load()
    expect(loaded).toBeNull()
  })

  it('should return null for wrong password', async () => {
    const store = new MemoryStore({ filePath: TEST_FILE, password: testPassword })
    const memory: Memory = {
      projectConventions: { key: 'value' },
      decisions: [],
      workingMemory: { currentGoal: 'test', completedSteps: [], remainingSteps: [] },
    }

    await store.save(memory)

    const wrongStore = new MemoryStore({ filePath: TEST_FILE, password: 'wrong-password' })
    const loaded = await wrongStore.load()
    expect(loaded).toBeNull()
  })

  it('should update specific fields', async () => {
    const store = new MemoryStore({ filePath: TEST_FILE, password: testPassword })
    const memory: Memory = {
      projectConventions: {},
      decisions: [],
      workingMemory: { currentGoal: 'test', completedSteps: [], remainingSteps: [] },
    }

    await store.save(memory)
    await store.updateField('projectConventions', { framework: 'vitest' })

    const loaded = await store.load()
    expect(loaded!.projectConventions.framework).toBe('vitest')
  })
})