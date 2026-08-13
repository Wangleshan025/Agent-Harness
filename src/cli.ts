#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
  .name('harnessx')
  .description('轻量级 Coding Agent Harness — 安全、可控、可观察的编码 agent 运行引擎')
  .version('0.1.0')

program.parse(process.argv)