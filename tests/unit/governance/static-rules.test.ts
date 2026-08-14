import { describe, it, expect } from 'vitest'
import { checkStaticRules } from '../../../src/governance/static-rules.js'
import { Action, DEFAULT_CONFIG } from '../../../src/core/types.js'

describe('StaticRules', () => {
  it('should block dangerous command: rm -rf /', () => {
    const action: Action = {
      type: 'execute_command', id: 't1',
      params: { command: 'rm -rf /' },
    }
    const result = checkStaticRules(action, DEFAULT_CONFIG)
    expect(result.action).toBe('block')
    expect(result.level).toBe('critical')
  })

  it('should block dangerous command: dd if=/dev/zero of=/dev/sda', () => {
    const action: Action = {
      type: 'execute_command', id: 't2',
      params: { command: 'dd if=/dev/zero of=/dev/sda bs=1M' },
    }
    const result = checkStaticRules(action, DEFAULT_CONFIG)
    expect(result.action).toBe('block')
    expect(result.level).toBe('critical')
  })

  it('should block sudo commands', () => {
    const action: Action = {
      type: 'execute_command', id: 't3',
      params: { command: 'sudo apt install something' },
    }
    const result = checkStaticRules(action, DEFAULT_CONFIG)
    expect(result.action).toBe('block')
    expect(result.level).toBe('critical')
  })

  it('should allow safe commands', () => {
    const action: Action = {
      type: 'execute_command', id: 't4',
      params: { command: 'npm test' },
    }
    const result = checkStaticRules(action, DEFAULT_CONFIG)
    expect(result.action).toBe('allow')
    expect(result.level).toBe('safe')
  })

  it('should allow non-command actions', () => {
    const action: Action = {
      type: 'read_file', id: 't5',
      params: { path: 'test.txt' },
    }
    const result = checkStaticRules(action, DEFAULT_CONFIG)
    expect(result.action).toBe('allow')
  })

  it('should detect path traversal attempts', () => {
    const action: Action = {
      type: 'read_file', id: 't6',
      params: { path: '../../../etc/passwd' },
    }
    const result = checkStaticRules(action, DEFAULT_CONFIG)
    expect(result.action).toBe('block')
    expect(result.level).toBe('danger')
  })
})