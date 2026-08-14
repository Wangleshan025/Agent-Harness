import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const SALT_LENGTH = 16
const IV_LENGTH = 16
const TAG_LENGTH = 16

interface CredentialData {
  apiKey: string
  createdAt: number
  updatedAt: number
}

interface CredentialConfig {
  masterPassword: string
  filePath?: string
}

interface CredentialStatus {
  initialized: boolean
  keyExists: boolean
  fileExists: boolean
}

export class CredentialManager {
  private filePath: string
  private password: string

  constructor(config: CredentialConfig) {
    this.filePath = config.filePath ?? resolve(process.env.HOME || process.env.USERPROFILE || '~', '.harness', 'credentials.enc')
    this.password = config.masterPassword
  }

  async init(apiKey: string): Promise<void> {
    const data: CredentialData = {
      apiKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await this.writeEncrypted(data)
  }

  async update(apiKey: string): Promise<void> {
    const existing = await this.readEncrypted()
    const data: CredentialData = {
      apiKey,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    await this.writeEncrypted(data)
  }

  async clear(): Promise<void> {
    if (existsSync(this.filePath)) {
      await unlink(this.filePath)
    }
  }

  async getKey(): Promise<string | null> {
    const data = await this.readEncrypted()
    return data?.apiKey ?? null
  }

  async status(): Promise<CredentialStatus> {
    const fileExists = existsSync(this.filePath)
    const data = fileExists ? await this.readEncrypted() : null

    return {
      initialized: data !== null,
      keyExists: data !== null,
      fileExists,
    }
  }

  private async writeEncrypted(data: CredentialData): Promise<void> {
    const salt = randomBytes(SALT_LENGTH)
    const key = scryptSync(this.password, salt, KEY_LENGTH)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    const json = JSON.stringify(data)
    const encrypted = Buffer.concat([cipher.update(json, 'utf-8'), cipher.final()])
    const tag = cipher.getAuthTag()

    const payload = Buffer.concat([salt, iv, tag, encrypted])

    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, payload)
  }

  private async readEncrypted(): Promise<CredentialData | null> {
    if (!existsSync(this.filePath)) return null

    try {
      const fileData = await readFile(this.filePath)
      const salt = fileData.subarray(0, SALT_LENGTH)
      const iv = fileData.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
      const tag = fileData.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
      const encrypted = fileData.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

      const key = scryptSync(this.password, salt, KEY_LENGTH)
      const decipher = createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(tag)

      const decrypted = decipher.update(encrypted) + decipher.final('utf-8')
      return JSON.parse(decrypted)
    } catch {
      return null
    }
  }
}