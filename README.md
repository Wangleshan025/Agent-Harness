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

# 运行任务（模拟模式，无需 API Key）
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

## 目录结构

```
harnessx/
├── src/
│   ├── cli.ts                  # CLI 入口（commander 框架）
│   ├── core/
│   │   ├── agent.ts            # Agent 主循环
│   │   ├── context-builder.ts  # 上下文构建
│   │   ├── llm.ts              # LLM 抽象层（DeepSeek + Mock）
│   │   └── types.ts            # 核心类型定义
│   ├── tools/
│   │   ├── registry.ts         # 工具注册表
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── edit-file.ts
│   │   ├── execute-command.ts
│   │   ├── run-tests.ts
│   │   ├── search-code.ts
│   │   └── ask-user.ts
│   ├── governance/
│   │   ├── guardrail.ts        # 静态规则 + 动态风险
│   │   ├── hitl.ts             # HITL 状态机
│   │   └── risk-scorer.ts      # 风险评估评分模型
│   ├── feedback/
│   │   ├── validator.ts        # 测试输出解析
│   │   ├── classifier.ts       # 失败分类
│   │   └── corrector.ts        # 修正策略
│   ├── config/
│   │   └── credential-manager.ts  # 凭据加密管理
│   └── memory/
│       └── memory-store.ts     # 记忆存储
├── tests/                      # 68 个测试用例
├── SPEC.md                     # 设计说明书
├── Dockerfile                  # Docker 构建
├── tsconfig.json
└── package.json
```

## 安全配置

### 凭据管理

HarnessX 使用 AES-256-GCM 加密存储 API Key，密钥通过 scrypt 从主密码派生：

```bash
# 交互式配置（推荐）
npx tsx src/cli.ts cred init

# 环境变量方式（适用于 CI）
export DEEPSEEK_API_KEY=sk-...
```

### 三层治理护栏

| 层级 | 机制 | 拦截范围 |
|------|------|----------|
| L1 静态规则 | 黑名单/白名单匹配 | 危险命令（`rm -rf /`）、路径越界 |
| L2 动态风险 | 多因子评分模型 | 递归删除、强制写入、网络访问 |
| L3 HITL | 人机协同审批 | 高风险操作需用户确认 |

### 安全最佳实践

- 凭据文件存储在 `~/.harness/credentials.enc`，不提交到 git
- 路径白名单限制操作范围，防止路径穿越
- 所有危险命令在代码层面拦截，不依赖 LLM "自律"

## 已知限制

- **单 agent 模式**：当前不支持多 agent 协作，一次只能运行一个任务循环
- **流式输出**：LLM 响应为完整返回，不支持实时流式显示思考过程
- **插件机制**：工具集为固定 7 个，不支持用户自定义工具扩展
- **npm 发布**：尚未配置 npm 发布流程，当前需通过源码或 Docker 运行
- **Windows 兼容**：工具函数已适配 Windows，但部分 shell 命令可能在 Windows 上行为略有差异

## 开发

```bash
npm install
npm run build
npm test       # 运行 68 个测试用例
```

## 技术栈

TypeScript / Node.js 20+ / DeepSeek API / Vitest / commander / tsup

## Docker

```bash
docker build -t harnessx .
docker run -v $(pwd):/workspace -it harnessx run "任务描述"
```