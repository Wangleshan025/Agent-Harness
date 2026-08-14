import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { Memory } from '../core/types.js'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const SALT_LENGTH = 16
const IV_LENGTH = 16
const TAG_LENGTH = 16

interface MemoryStoreConfig {
  filePath?: string
  password: string
}

export class MemoryStore {
  private filePath: string
  private password: string

  constructor(config: MemoryStoreConfig) {
    this.filePath = config.filePath ?? resolve(process.cwd(), '.harness-memory.enc')
    this.password = config.password
  }

  async save(memory: Memory): Promise<void> {
    const salt = randomBytes(SALT_LENGTH)
    const key = this.deriveKey(this.password, salt)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    const json = JSON.stringify(memory)
    const encrypted = Buffer.concat([cipher.update(json, 'utf-8'), cipher.final()])
    const tag = cipher.getAuthTag()

    const payload = Buffer.concat([salt, iv, tag, encrypted])

    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, payload)
  }

  async load(): Promise<Memory | null> {
    if (!existsSync(this.filePath)) return null

    try {
      const data = await readFile(this.filePath)
      const salt = data.subarray(0, SALT_LENGTH)
      const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
      const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
      const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

      const key = this.deriveKey(this.password, salt)
      const decipher = createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(tag)

      const decrypted = decipher.update(encrypted) + decipher.final('utf-8')
      return JSON.parse(decrypted) as Memory
    } catch {
      return null
    }
  }

  async updateField<K extends keyof Memory>(
    field: K,
    value: Memory[K],
  ): Promise<void> {
    const memory = await this.load() ?? {
      projectConventions: {},
      decisions: [],
      workingMemory: { currentGoal: '', completedSteps: [], remainingSteps: [] },
    }
    memory[field] = value
    await this.save(memory)
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return scryptSync(password, salt, KEY_LENGTH)
  }
}