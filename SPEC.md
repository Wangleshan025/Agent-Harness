# HarnessX — Coding Agent Harness 设计说明书

> **项目**：AI4SE 期末项目 · A · Coding Agent Harness
> **技术栈**：TypeScript / Node.js 20+
> **LLM 供应商**：DeepSeek（OpenAI-compatible API）
> **版本**：v0.1.0（草案）

---

## 1. 问题陈述

### 1.1 要解决什么问题

当 LLM 能完成大部分"思考"工作时，一个可靠、可控、可观察的编码 agent 系统需要大量工程支撑。本项目旨在构建一个轻量级的 Coding Agent Harness，它封装了 agent 主循环、工具分发、治理护栏、反馈闭环与记忆管理，使 LLM 能在一个安全、受控的环境中自主完成编码任务。

### 1.2 目标用户

- 希望用 AI 辅助编码但需要安全护栏的开发者
- 需要在受控环境中运行自动化编码 agent 的团队
- 对 agentic SE 方法论感兴趣的 AI4SE 学生

### 1.3 为什么值得做

现有 agent 框架（LangChain、AutoGen、CrewAI）要么过于重量级，要么将安全治理寄托于提示词而非代码。本项目证明：**一个精炼的、以治理为中心的自研 harness，比依赖外部框架更可控、更可测试、更安全**。

---

## 2. 用户故事

1. **作为开发者**，我希望给 agent 一个自然语言的任务描述（如"为这个函数添加单元测试"），agent 能自主完成，无需我逐条指令。
2. **作为开发者**，我希望 agent 在执行危险命令（如 `rm -rf`）前暂停并请求我的批准，避免意外破坏。
3. **作为开发者**，我希望 agent 在运行测试失败后能自动分析失败原因并尝试修复，而不是直接放弃。
4. **作为开发者**，我希望 agent 能记住项目约定和技术栈信息，跨会话保持一致的行为。
5. **作为开发者**，我希望能在新机器上安全地配置 API Key，凭据用加密存储，不暴露在文件系统中。
6. **作为开发者**，我希望能通过 `npm install` 或 `docker run` 快速启动 harness，无需复杂配置。

---

## 3. 功能规约

### 3.1 模块划分

| 模块 | 职责 | 优先级 |
|------|------|--------|
| **Core** | Agent 主循环、LLM 抽象层、核心类型 | P0 |
| **Tools** | 工具注册表与 7 个内置工具 | P0 |
| **Governance** | 三层护栏、HITL 状态机、沙箱 | P0（重点） |
| **Feedback** | 校验器、失败分类器、修正策略 | P0（次重点） |
| **Memory** | 加密存储、检索、工作记忆 | P1 |
| **Config** | 凭据加密管理、配置加载 | P0 |
| **CLI** | 命令行入口、交互流程 | P0 |

### 3.2 Core — Agent 主循环

**输入**：用户任务描述（字符串）
**行为**：
1. 构建上下文（系统提示 + 历史记录 + 记忆）
2. 调用 LLM，解析响应为 Action
3. 通过治理护栏检查
4. 执行 Action 对应 Tool
5. 收集 Observation（含测试结果）
6. 判断停机条件：
   - 任务完成 → 输出最终结果
   - 达到最大迭代次数（默认 20）→ 强制停机
   - 未完成 → 带 Observation 回到步骤 1
**输出**：任务完成报告（包含所有 Turn 记录、最终结果、统计信息）
**边界条件**：
- LLM 返回格式错误 → 重试最多 3 次，失败则报错
- 连续相同 Action 重复 3 次 → 判定为"陷入循环"并停机
- 用户可发送 SIGINT 中断

### 3.3 Tools — 工具集

| 工具 | 输入 | 行为 | 输出 |
|------|------|------|------|
| `read_file` | path | 读取文件内容 | 文件内容字符串 |
| `write_file` | path, content | 写入文件（覆盖） | 成功/失败 |
| `edit_file` | path, old_string, new_string | 精确替换 | 成功/失败 |
| `execute_command` | command, cwd?, timeout? | 执行 shell 命令 | stdout + stderr + exit code |
| `run_tests` | testCommand? | 运行测试并解析结果 | TestResult[] |
| `search_code` | pattern, glob? | 搜索代码 | 匹配文件列表 |
| `ask_user` | question | 向用户提问 | 用户回答 |

**错误处理**：
- 文件不存在 → 返回错误信息，不 crash
- 命令超时 → 返回超时信号，agent 可重试
- 路径越界（超出项目目录）→ 阻止并返回安全警告

### 3.4 Governance — 治理护栏（重点维度）

**三层架构**：

**第一层：静态规则匹配**
- 危险命令黑名单：`rm -rf /`, `dd if=`, `format`, `mkfs`, `> /dev/sda` 等
- 文件路径白名单：只允许操作项目目录（`cwd`）内的文件
- 命令前缀黑名单：`sudo`, `chmod 777`, `shutdown` 等

**第二层：动态风险评估**
- 命令参数分析：检测递归删除、强制写入等危险标志
- 文件写入路径检查：是否覆盖 `.env`, `credentials.enc`, `node_modules` 等
- 网络访问检测：`curl`, `wget` 等是否指向外部 URL
- 评分模型：每项风险累加，超过阈值则拦截

**第三层：HITL 状态机**
- 状态：`pending` → `approved` / `rejected` / `timeout`
- 超时：默认 60 秒无响应则拒绝
- 显示信息：动作描述、风险等级、参数详情
- 用户选项：批准 / 拒绝 / 查看详情 / 永久禁止

**HITL 状态机接口**：
```typescript
interface HITLState {
  action: Action
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'timeout'
  createdAt: number
  resolvedAt?: number
  approvedBy?: string
}
```

### 3.5 Feedback — 反馈闭环（次重点维度）

**校验器（Validator）**：
- 解析测试输出（兼容 Jest / Vitest / Mocha 格式）
- 提取每个测试用例的通过/失败状态
- 计算通过率、失败数、耗时

**失败分类器（Classifier）**：
- `compilation_error`：TypeScript 编译错误、语法错误
- `test_failure`：测试断言失败
- `runtime_error`：Node.js 运行时异常、crash
- `lint_error`：ESLint 规则违反
- `timeout`：测试超时
- `unknown`：无法分类

**修正策略选择器（Corrector）**：
- 每种失败类型对应一个修正策略（最大重试次数 + 建议行为）
- 超过最大重试次数 → 标记为"无法自动修复"并报告用户

### 3.6 Memory — 记忆系统

**存储内容**：
- 项目约定（技术栈、测试命令、lint 规则）
- 历史决策（架构选择、理由、时间戳）
- 工作记忆（当前目标、已完成的步骤、剩余步骤）

**存储方式**：
- 加密 JSON 文件（`~/.harness/memory.enc`）
- AES-256-GCM 加密，密钥由主密码派生
- 每次会话加载，会话结束时保存

### 3.7 Config — 凭据管理

**功能**：
- `init`：引导用户输入主密码 + API Key（隐藏输入）
- `update`：更新 API Key
- `clear`：清除所有凭据
- `status`：查看凭据状态（不回显明文）

**安全设计**：
- 主密码通过 scrypt 派生为 AES-256-GCM 密钥
- 凭据存储在 `~/.harness/credentials.enc`
- 内存中明文使用后立即置零
- 不写入任何日志

---

## 4. 非功能性需求

### 4.1 性能
- 单次 LLM 调用超时：60 秒
- 单次命令执行超时：120 秒（可通过配置调整）
- 最大迭代次数：20（可配置）
- 启动时间：< 2 秒

### 4.2 安全（凭据威胁模型）
- **威胁**：API Key 泄露（文件系统泄露、日志泄露、进程内存 dump）
- **对策**：AES-256-GCM 加密存储、scrypt 密钥派生、内存置零、.env 不 git 提交
- **威胁**：恶意命令执行
- **对策**：三层护栏 + HITL 审批
- **威胁**：路径穿越攻击
- **对策**：路径白名单 + 规范化路径比较

### 4.3 可用性
- CLI 交互清晰，错误信息有指导性
- 首次运行引导用户配置凭据
- 支持 `--help` 查看所有命令

### 4.4 可观测性
- 每个 Turn 记录到日志
- 护栏拦截记录原因和时间
- 支持 `--verbose` 模式输出详细日志

---

## 5. 系统架构

### 5.1 组件图

```
┌─────────────────────────────────────────────────────────┐
│                       CLI (入口)                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Agent 主循环 (Core)                   │   │
│  │  ┌─────┐  ┌──────┐  ┌───────┐  ┌────────────┐   │   │
│  │  │Context│→│ LLM  │→│ Parse │→│ Governance │   │   │
│  │  │Builder│ │Call  │ │Action │ │ Guardrail   │   │   │
│  │  └───────┘ └──────┘ └───────┘ └─────┬──────┘   │   │
│  │                                      │          │   │
│  │  ┌───────────────────────────────────▼────────┐ │   │
│  │  │           Tool Registry                     │ │   │
│  │  │  ┌──────┐ ┌───────┐ ┌───────┐ ┌────────┐ │ │   │
│  │  │  │Read  │ │Write  │ │Edit   │ │Execute │ │ │   │
│  │  │  │File  │ │File   │ │File   │ │Command │ │ │   │
│  │  │  └──────┘ └───────┘ └───────┘ └────────┘ │ │   │
│  │  │  ┌──────┐ ┌────────┐ ┌────────┐          │ │   │
│  │  │  │Run   │ │Search  │ │Ask     │          │ │   │
│  │  │  │Tests │ │Code    │ │User    │          │ │   │
│  │  │  └──────┘ └────────┘ └────────┘          │ │   │
│  │  └───────────────────────────────────────────┘ │   │
│  │                      │                          │   │
│  │  ┌───────────────────▼──────────────────────┐   │   │
│  │  │           Feedback Loop                    │   │   │
│  │  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │   │   │
│  │  │  │Validator│→│Classifier│→│Corrector   │  │   │   │
│  │  │  └─────────┘ └──────────┘ └───────────┘  │   │   │
│  │  └───────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │   Memory   │  │  Credential  │  │   Config       │   │
│  │   Store    │  │  Manager     │  │   Loader       │   │
│  └────────────┘  └──────────────┘  └────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 数据流

```
用户输入任务 → Core.buildContext() → LLM.call() → Parse Action
  → Governance.guardrail() → [拦截/HITL/放行]
  → Tool.execute() → Observation
  → Feedback.validate() → Feedback.classify() → Feedback.correct()
  → [继续循环 / 停机]
  → 输出最终结果
```

### 5.3 外部依赖

| 依赖 | 用途 | 是否必须 |
|------|------|----------|
| DeepSeek API | LLM 推理 | 是（可替换为 mock） |
| Node.js 20+ | 运行时 | 是 |
| npm 包（commander / vitest 等） | CLI 与测试 | 开发时 |

---

## 6. 数据模型

```typescript
// === 核心 ===
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

interface LLMResponse {
  content: string
  toolCalls?: ToolCall[]
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error'
}

// === Action ===
type ActionType = 'read_file' | 'write_file' | 'edit_file' 
  | 'execute_command' | 'run_tests' | 'search_code' | 'ask_user'

interface Action {
  type: ActionType
  params: Record<string, any>
  thought?: string
  id: string
}

// === Observation ===
interface Observation {
  actionId: string
  success: boolean
  output: string
  error?: string
  exitCode?: number
  testResults?: TestResult[]
  timestamp: number
}

interface TestResult {
  testName: string
  passed: boolean
  output: string
  error?: string
  duration: number
}

// === Turn ===
interface Turn {
  action: Action
  observation: Observation
  iteration: number
}

// === 治理 ===
interface GuardrailResult {
  action: 'allow' | 'block' | 'request_approval'
  level: 'safe' | 'warning' | 'danger' | 'critical'
  reason: string
  riskScore?: number
}

interface HITLState {
  id: string
  action: Action
  riskLevel: 'medium' | 'high' | 'critical'
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'timeout'
  createdAt: number
  resolvedAt?: number
}

// === 反馈 ===
type FailureCategory = 'compilation_error' | 'test_failure' 
  | 'runtime_error' | 'lint_error' | 'timeout' | 'unknown'

interface CorrectionStrategy {
  maxRetries: number
  action: 'edit_file' | 'retry' | 'ask_user'
  prompt: string
}

// === 记忆 ===
interface Memory {
  projectConventions: Record<string, string>
  decisions: Decision[]
  workingMemory: {
    currentGoal: string
    completedSteps: string[]
    remainingSteps: string[]
  }
}

// === 配置 ===
interface HarnessConfig {
  maxIterations: number
  commandTimeout: number
  llmTimeout: number
  hitlTimeout: number
  allowList: string[]
  blockList: string[]
  projectDir: string
}
```

---

## 7. 凭据与分发设计

### 7.1 凭据安全存储

见 §3.7 Config 和 §4.2 安全。

### 7.2 分发

**npm 包**：
```bash
npm install -g harnessx
harnessx run "为这个函数添加单元测试"
```

**Docker 镜像**：
```bash
docker pull yourusername/harnessx
docker run -v $(pwd):/workspace -it yourusername/harnessx run "为这个函数添加单元测试"
```

**Key 配置**（两种方式）：
1. 首次运行交互式引导：`harnessx cred init`
2. 环境变量：`DEEPSEEK_API_KEY=sk-xxx harnessx run "task"`（不推荐，但可用于 CI）

---

## 8. 技术选型与理由

| 组件 | 选型 | 理由 |
|------|------|------|
| 语言 | TypeScript 5.x | 类型安全、静态检查、Node.js 生态 |
| 运行时 | Node.js 20+ | 已安装、LTS、内置 fetch |
| LLM 调用 | 原生 fetch | 零依赖，直接调 DeepSeek/OpenAI API |
| 加密 | Node.js crypto | 内置 AES-256-GCM + scrypt |
| CLI 框架 | commander | 成熟、轻量、声明式 |
| 测试 | Vitest | 快、兼容 Jest API |
| 打包 | tsup | esbuild 打包，支持 CJS/ESM |
| 代码风格 | ESLint + Prettier | 标准配置 |

---

## 9. 验收标准

| 功能 | 验收标准 |
|------|----------|
| 主循环 | 给定任务，agent 能自主完成多轮思考-行动-观察循环 |
| LLM 抽象层 | 可替换为 MockLLM 运行完整测试 |
| 工具集 | 7 个工具均能正确调用并返回结果 |
| 三层护栏 | 危险命令被拦截、路径越界被阻止、HITL 状态机正确流转 |
| 反馈闭环 | 测试失败后能分类并选择修正策略 |
| 凭据管理 | 加密存储、引导录入、更新、清除、状态查看 |
| 记忆 | 能保存和加载项目约定 |
| 测试 | 核心机制有 mock-LLM 单元测试，一键 `npm test` 全部通过 |
| 机制演示 | 三个演示均能在 mock LLM 下确定性复现 |
| 分发 | `npm install` 和 `docker build` 两种方式均可运行 |

---

## 10. 风险与未决问题

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LLM 输出格式不稳定 | 解析失败 | 多格式兼容 + 重试 + 严格 schema 校验 |
| 命令执行安全风险 | 误删文件 | 三层护栏 + 沙箱 + 路径白名单 |
| 加密密钥丢失 | 无法访问凭据 | 提供重置流程 |
| Windows 兼容性 | 路径分隔符、shell 差异 | 使用 `path.resolve`、跨平台测试 |
| 项目规模过大 | 开发周期超出预期 | 优先 P0 功能，P1 功能作为迭代增量 |

---

## 11. 领域与机制设计

### 11.1 领域分析

Coding Agent Harness 的运作领域可以分解为四个核心维度：**信号（Feedback Signals）**、**危险动作（Dangerous Actions）**、**工具（Tools）**、**记忆（Memory）**。每个维度对应的具体内容如下：

| 维度 | 具体内容 | 在 HarnessX 中的体现 |
|------|----------|---------------------|
| **反馈信号** | 编译错误、测试失败、运行时异常、lint 违规、超时 | Feedback 模块的 Validator + Classifier + Corrector |
| **危险动作** | 危险 shell 命令、路径穿越、文件覆盖、网络访问 | Governance 三层护栏 |
| **工具** | 文件读写、命令执行、搜索、测试、用户交互 | 7 个内置 Tool，通过 ToolRegistry 注册分发 |
| **记忆** | 项目约定、历史决策、工作记忆 | Memory 模块（加密存储） |

### 11.2 重点维度：治理（Governance）

治理是本项目**最核心的设计维度**，投入了最多的设计精力和代码量。核心思路是：**将安全护栏从"提示词依赖"变为"代码级强制"**。

**三层架构实现**：
- **第一层：静态规则匹配**（`src/governance/guardrail.ts`）— 黑名单/白名单模式，O(1) 匹配，零开销
- **第二层：动态风险评估**（`src/governance/risk-scorer.ts`）— 多因子评分模型，覆盖递归删除、强制写入、网络访问等场景
- **第三层：HITL 状态机**（`src/governance/hitl.ts`）— 带超时的人机协同审批，状态流转为 `pending → approved/rejected/timeout`

**设计理由**：在 agentic SE 中，LLM 的"自律"不可靠。提示词中的安全约束可以被忽略、被注入、被遗忘。三层架构将安全从"建议"变为"强制"——每一层都是独立的代码逻辑，互不依赖，即使前两层失效，HITL 仍能拦截。

**代码结构**：
```
src/governance/
├── guardrail.ts      # 第一层 + 第二层：静态规则 + 动态风险
├── hitl.ts           # 第三层：HITL 状态机
├── risk-scorer.ts    # 动态风险评估评分模型
└── types.ts          # 治理相关类型定义
```

### 11.3 次重点维度：反馈闭环（Feedback）

反馈闭环是**次重点设计维度**。其核心价值在于：让 agent 具备"自我修正"能力，而非在失败后直接放弃。

**实现机制**：
- **Validator**（`src/feedback/validator.ts`）— 解析测试输出，兼容 Jest/Vitest/Mocha 格式，输出结构化 TestResult[]
- **Classifier**（`src/feedback/classifier.ts`）— 根据错误信息分类为 6 种失败类型：compilation_error、test_failure、runtime_error、lint_error、timeout、unknown
- **Corrector**（`src/feedback/corrector.ts`）— 每种失败类型对应一个修正策略（最大重试次数 + 建议行为），超过上限则标记为"无法自动修复"

**设计理由**：agent 在编码过程中不可避免地会犯错。反馈闭环让错误成为"可处理的信号"而非"终止条件"。分类器帮助 agent 快速定位根因，修正策略提供具体的修复路径。

### 11.4 其他维度的基线实现

| 维度 | 基线实现状态 | 说明 |
|------|-------------|------|
| **LLM 抽象层** | ✅ 已实现 | `LLMProvider` 接口 + `DeepSeekProvider` 实现 + `MockLLMProvider`（测试用） |
| **工具注册表** | ✅ 已实现 | `ToolRegistry` 类，7 个工具注册，支持类型安全路由 |
| **配置管理** | ✅ 已实现 | `HarnessConfig` 类型 + `DEFAULT_CONFIG` 默认值 + 环境变量加载 |
| **凭据管理** | ✅ 已实现 | `credential-manager.ts` 基于 AES-256-GCM + scrypt |
| **记忆系统** | ✅ 已实现 | `Memory` 类型 + 上下文注入（context-builder） |
| **CLI 入口** | ✅ 已实现 | commander 框架，`run`/`cred`/`init` 子命令 |
| **测试覆盖** | ✅ 68 个测试用例 | 15 个测试文件，全部基于 mock LLM，零网络依赖 |
| **分发** | ⚠️ 部分实现 | Dockerfile 已就绪；npm 发布尚未配置 |

### 11.5 与 §A.4 要求的对照

| §A.4 要求 | 对应实现 | 状态 |
|-----------|----------|------|
| Agent 主循环 | `src/core/agent.ts` — buildContext → LLM → parse → execute → observe | ✅ |
| 上下文构建 | `src/core/context-builder.ts` — 系统提示 + 历史 + 记忆 | ✅ |
| 工具管理 | `src/tools/` — 7 个工具 + ToolRegistry | ✅ |
| LLM 集成 | `src/core/llm.ts` — DeepSeekProvider + MockLLMProvider | ✅ |
| 治理/护栏 | `src/governance/` — 三层架构 | ✅（重点） |
| 反馈闭环 | `src/feedback/` — Validator + Classifier + Corrector | ✅（次重点） |
| 凭据管理 | `src/config/credential-manager.ts` — 加密存储 | ✅ |
| 记忆系统 | memory 字段在 context-builder 中注入 | ✅ |
| 测试 | 68 测试用例，mock-LLM，零网络依赖 | ✅ |
| 分发 | Dockerfile + npm 打包（tsup 构建） | ✅ |