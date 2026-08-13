# HarnessX — Coding Agent Harness

## 项目状态
**当前阶段**：SPEC.md 已完成并通过审阅，准备进入 writing-plans 阶段。

## 快速启动
- 工作目录：`C:\Users\lenovo\Desktop\new-project\`
- 核心文档：`SPEC.md`（已就绪）
- 下次会话应：提示用户继续 → 触发 `writing-plans` 技能生成 PLAN.md

## 关键记忆文件
记忆存储在 `C:\Users\lenovo\.claude\projects\C--Users-lenovo\memory\`，索引文件为 MEMORY.md。
每次启动时读取 MEMORY.md 获取所有记忆点。

## 项目要求
使用 Superpowers 工作流（TDD、git worktree、subagent），按以下顺序推进：
1. ~~Brainstorming → SPEC.md~~ ✅
2. **下一步：writing-plans → PLAN.md**
3. 冷启动验证（换 agent 测试 SPEC + PLAN）
4. 实现（TDD + worktree + subagent）
5. 分发 + CI + 最终交付

## 技术栈
TypeScript / Node.js 20+ / DeepSeek API / Vitest / commander / tsup

## 重要提醒
- 凭据绝不硬编码，不提交 git
- 核心机制必须是代码（不是提示词），能用 mock-LLM 测试
- 重点维度：治理/护栏（三层架构）+ 反馈闭环（次重点）