import { HarnessConfig, DEFAULT_CONFIG } from '../core/types.js'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export function loadConfig(overrides?: Partial<HarnessConfig>): HarnessConfig {
  const configFile = resolve(process.cwd(), 'harnessx.config.json')
  let fileConfig: Partial<HarnessConfig> = {}

  if (existsSync(configFile)) {
    try {
      const raw = readFileSync(configFile, 'utf-8')
      fileConfig = JSON.parse(raw)
    } catch {
      // 忽略无效配置文件
    }
  }

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...overrides,
  }
}