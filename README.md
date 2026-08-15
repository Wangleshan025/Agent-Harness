# HarnessX — Coding Agent Harness

> 轻量级编码 agent 运行引擎 | 安全 · 可控 · 可观察

## 快速开始

```bash
# 克隆并安装依赖
git clone <repo-url>
cd harnessx
npm install

# 配置 API Key（可选，首次使用）
npx tsx src/cli.ts cred init

# 运行任务（模拟模式）
npx tsx src/cli.ts run "为 utils.ts 添加排序函数" --mock

# 运行任务（真实 AI 模式，需先配置 DEEPSEEK_API_KEY）
export DEEPSEEK_API_KEY=sk-...
npx tsx src/cli.ts run "为 utils.ts 添加排序函数"
```

## 功能

- **Agent 主循环**：自主思考-行动-观察循环
- **7 个内置工具**：文件读取、写入、精确替换、命令执行、测试运行、代码搜索、用户提问
- **三层治理护栏**：静态规则 → 动态风险 → HITL 审批
- **反馈闭环**：测试失败自动分类与修正
- **加密凭据管理**：AES-256-GCM 安全存储
- **记忆系统**：跨会话保持项目约定

## 开发

```bash
npm install
npm run build
npm test
```

## 技术栈

TypeScript / Node.js 20+ / DeepSeek API / Vitest / commander / tsup