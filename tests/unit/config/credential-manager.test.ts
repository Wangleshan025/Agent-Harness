import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CredentialManager } from '../../../src/config/credential-manager.ts'
import { existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'

const TEST_CRED_FILE = resolve(process.cwd(), '.test-credentials.enc')

describe('CredentialManager', () => {
  const masterPassword = 'test-master-password-456'
  const apiKey = 'sk-test-api-key-12345'

  beforeEach(() => {
    if (existsSync(TEST_CRED_FILE)) {
      unlinkSync(TEST_CRED_FILE)
    }
  })

  afterEach(() => {
    if (existsSync(TEST_CRED_FILE)) {
      unlinkSync(TEST_CRED_FILE)
    }
  })

  it('should initialize and store API key', async () => {
    const manager = new CredentialManager({
      masterPassword,
      filePath: TEST_CRED_FILE,
    })
    await manager.init(apiKey)

    const status = await manager.status()
    expect(status.initialized).toBe(true)
    expect(status.keyExists).toBe(true)
  })

  it('should retrieve stored API key', async () => {
    const manager = new CredentialManager({
      masterPassword,
      filePath: TEST_CRED_FILE,
    })
    await manager.init(apiKey)

    const retrieved = await manager.getKey()
    expect(retrieved).toBe(apiKey)
  })

  it('should update API key', async () => {
    const manager = new CredentialManager({
      masterPassword,
      filePath: TEST_CRED_FILE,
    })
    await manager.init(apiKey)
    await manager.update('sk-new-key-67890')

    const retrieved = await manager.getKey()
    expect(retrieved).toBe('sk-new-key-67890')
  })

  it('should clear credentials', async () => {
    const manager = new CredentialManager({
      masterPassword,
      filePath: TEST_CRED_FILE,
    })
    await manager.init(apiKey)
    await manager.clear()

    const status = await manager.status()
    expect(status.initialized).toBe(false)
    expect(status.keyExists).toBe(false)
  })

  it('should return null for uninitialized manager', async () => {
    const manager = new CredentialManager({
      masterPassword,
      filePath: TEST_CRED_FILE,
    })

    const key = await manager.getKey()
    expect(key).toBeNull()
  })

  it('should return correct status for uninitialized state', async () => {
    const manager = new CredentialManager({
      masterPassword,
      filePath: TEST_CRED_FILE,
    })

    const status = await manager.status()
    expect(status.initialized).toBe(false)
    expect(status.keyExists).toBe(false)
    expect(status.fileExists).toBe(false)
  })
})