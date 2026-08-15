# SPEC_PROCESS.md

> HarnessX — Coding Agent Harness 规约与计划生成过程文档
> 记录 brainstorming → writing-plans → 冷启动验证 的完整过程

---

## 一、Brainstorming 关键节点

### 节点 1：从模糊想法到聚焦方向

初始想法是"做一个 agent harness"，但范围太宽。Brainstorming 技能通过追问澄清了几个关键问题：

- **Q：harness 的核心用户是谁？** → 确定是开发者，不是终端用户
- **Q：与 LangChain/AutoGen 的区别是什么？** → 确定差异化方向：治理/护栏是代码而非提示词、可 mock 测试、轻量级
- **Q：重点维度是什么？** → 确定治理护栏（三层架构）为重点深度方向，反馈闭环为次重点

### 节点 2：治理护栏的架构设计

Brainstorming 过程中，治理护栏从单层设计演进为三层架构：

1. 最初方案：一个简单的 `guardrail(action) → boolean` 函数
2. AI 追问："如果一个命令看起来不危险但实际做了危险操作怎么办？"
3. 迭代后方案：静态规则匹配（第一层）→ 动态风险评估（第二层）→ HITL 人工审批（第三层）
4. 这一设计被采纳，成为整个项目的核心贡献

### 节点 3：凭据管理方案选择

在凭据存储方案上讨论了三种选项：

| 方案 | 优点 | 缺点 |
|------|------|------|
| 操作系统钥匙串 | 安全 | 跨平台实现复杂 |
| 环境变量 | 简单 | 明文、shell history 泄露 |
| 加密文件 + 主密码 | 跨平台、可控 | 需自行实现加密 |

**决策**：选择加密文件方案（AES-256-GCM + scrypt），因为跨平台一致性最好，且加密实现本身就是工程深度的体现。

---

## 二、关键迭代记录

### 迭代 1：SPEC 中"机制必须是代码"的澄清

**背景**：初版 SPEC 的护栏设计描述为"在系统提示词中加入安全规则"。

**AI 建议**："提示词版护栏不算实现——移除 LLM 后无法测试。建议改为代码版：`guardrail(action)` 函数，传入危险命令直接断言拦截。"

**处理**：重写了 SPEC 中所有"提示词依赖"的设计，改为确定性代码实现。在 §A.4 中明确"移除真实 LLM 后仍能用单测验证"的硬标准。

**影响**：这一修正直接决定了整个项目的架构方向——所有模块（护栏、反馈、解析）都面向确定性测试设计。

---

### 迭代 2：工具集的路径安全设计

**背景**：初版工具设计没有考虑路径安全，agent 可以读写任意路径。

**AI 问题**："如果 agent 被提示读取 `/etc/passwd` 或写入系统目录，怎么办？"

**处理**：在所有文件操作工具中加入路径安全检查：`resolve → normalize → startsWith(cwd)`。同时加入了 `.env` 和 `credentials.enc` 的文件名保护，禁止 agent 读取凭据文件。

**影响**：这一设计后来在 review 中真的发现了 edit_file 缺少路径安全检查（Task 7），验证了安全设计的必要性。

---

### 迭代 3：循环检测策略

**背景**：Agent 主循环的停机条件最初只有"最大迭代次数"。

**AI 建议**："如果 agent 反复执行同一个操作（如不断 read_file），应该提前检测并停机，而不是等到最大迭代。"

**处理**：加入了循环检测机制：记录连续相同动作，>= 3 次即触发停机。

**后续修正**：PLAN 中的阈值 `>= 3` 在实现时发现计数器逻辑有误（从 0 开始计数，3 次相同只能达到 count=2），修正为 `>= 2`。这一 PLAN 数值错误在 subagent 实现阶段被捕获。

---

## 三、AI 建议采纳与修正记录

### 采纳的 AI 建议

| 建议 | 来源 | 为何采纳 |
|------|------|----------|
| 三层治理护栏架构 | Brainstorming | 比单层设计更安全、更可测试 |
| 加密文件方案存凭据 | Brainstorming | 跨平台且能展示加密工程深度 |
| 循环检测机制 | Brainstorming | 防止 agent 无限循环 |
| 路径安全检查 | Brainstorming | 基本安全要求 |
| MockLLM 确定性测试 | Brainstorming | 核心机制可测试的基石 |

### 用户修正的 AI 输出

| 修正 | 说明 |
|------|------|
| MockLLM 索引 bug | AI 生成的 MockLLM 使用 Array.find() 导致总是返回第一个响应，改为按 callIndex 索引 |
| 循环检测阈值 | PLAN 中的 `>= 3` 修正为 `>= 2` |
| edit_file 路径安全 | AI 实现的 edit_file 做了路径解析但忘了检查 cwd 边界 |
| 置信度公式 | Classifier 的 `matchCount / rule.patterns.length` 产出过低，修正为 `0.5 + matchCount / rule.patterns.length` |
| vitest.config.ts 空配置 | AI 添加了空的 resolve.alias 和 server.deps.inline 块 |

---

## 四、冷启动验证

### 验证设置

- **验证 agent**：Claude Code（与主开发 agent 同类型，但启动全新 session）
- **输入**：仅提供 SPEC.md + PLAN.md
- **选择 task**：Task 5（Action 解析器）
- **指令**：仅凭两个文件理解并实现，遇到不确定即暂停

### 发现的 SPEC/PLAN 缺陷

共发现 **7 个问题**，按严重程度排列：

#### 问题 1（严重）：PLAN 中测试文件导入路径错误

**PLAN 原文**（第 727 行）：
```typescript
import { parseAction } from '../../src/core/action-parser.js'
```

**实际正确路径**：`../../../src/core/action-parser.js`

**说明**：PLAN 中测试文件路径写错。如果开发者按 PLAN 逐字抄写，导入会失败。实际实现中已使用正确路径，但 PLAN 文本未更新。

**修正**：已在 PLAN 中修正导入路径。

---

#### 问题 2（中等）：Action type 无校验

**发现**：实现中使用 `tc.function.name as Action['type']` 做类型断言。如果 LLM 返回一个未知工具名（如 `delete_file`），会被静默接受，直到在 ToolRegistry 中查找 handler 时才会失败。

**说明**：SPEC §10 提到"严格 schema 校验"作为风险缓解措施，但 parser 中并没有对 type 做校验。

**建议**：在 parser 中加入对 `tc.function.name` 合法性的校验，未知工具名应返回错误或跳过。

---

#### 问题 3（中等）：`thought` 字段空字符串策略不明确

**发现**：实现中 `thought: response.content || undefined` 意味着：
- `content = 'Let me read the file'` → `thought = 'Let me read the file'`
- `content = ''` → `thought = undefined`（空字符串是 falsy）

**说明**：SPEC 和 PLAN 都未说明当 `response.content` 为空字符串时 `thought` 应设为 `undefined` 还是 `''`。当前实现使用 `||` 是隐式行为，可能与其他开发者的预期不一致。

---

#### 问题 4（轻微）：`finishReason` 未被利用

**发现**：parser 完全忽略 `finishReason` 字段。如果 LLM 返回 `finishReason: 'stop'` 同时带有非空 `toolCalls`（理论上不应发生，但可能是异常响应），parser 仍然解析这些 toolCalls。

**建议**：SPEC 应说明 parser 是否应该将 `finishReason === 'tool_calls'` 作为解析前置条件。

---

#### 问题 5（轻微）：缺少 `toolCalls: []` 测试覆盖

**发现**：测试只覆盖了 `toolCalls` 为 `undefined` 的情况，没有覆盖 `toolCalls: []`（显式空数组）的情况。

---

#### 问题 6（轻微）：`id` 字段测试断言过弱

**发现**：第一个测试用例对 `id` 只用了 `toBeTruthy()`，而不是检查具体值 `'call_1'`。如果实现错误地使用了随机生成的 ID，测试仍然会通过。

---

#### 问题 7（轻微）：SPEC 未明确定义 LLM 返回格式

**发现**：SPEC §3.2 说"调用 LLM，解析响应为 Action"，但 §6 的数据模型中 `LLMResponse` 包含 `toolCalls?: ToolCall[]`。SPEC 没有明确说明 LLM 响应是应该包含 toolCalls（function calling）还是应该从纯文本中解析 Action。

**说明**：PLAN 选择了 tool_calls 路径，但 SPEC 本身对此是模糊的。

---

### 冷启动验证总结

| 指标 | 结果 |
|------|------|
| 验证 task | Task 5（Action 解析器） |
| 规约缺陷 | 7 个（1 严重 + 2 中等 + 4 轻微） |
| 实际代码与 PLAN 一致性 | 代码逻辑完全一致，仅导入路径不同 |
| 验证结论 | SPEC 整体清晰度良好，但 PLAN 中存在一处可直接导致开发失败的文本错误（导入路径） |

---

## 五、反思

### Brainstorming 技能评价

**做得好**：
- 追问环节有效，帮助从模糊想法收敛到具体设计
- 三层护栏架构的追问是最高价值的问题
- 凭据存储方案的讨论产出了正确的决策

**不足**：
- 对"机制必须是代码"的强调不够早——初版 SPEC 仍有提示词依赖的设计，需要人工修正
- 没有主动提醒冷启动验证的重要性

### SPEC 质量的自我评估

SPEC 整体覆盖了全部 §4.2 要求的 10 个章节，并额外包含了 §A.5 要求的"领域与机制设计"章节。从冷启动验证结果看：

- **强项**：架构设计、数据模型、技术选型
- **弱项**：部分接口行为描述不够精确（如 `thought` 字段策略、`finishReason` 使用方式）
- **PLAN 的文本错误**：导入路径错误是明显的 PLAN 质量问题，subagent review 环节也未发现

### 改进方向

1. PLAN 中的代码片段应通过实际编译验证，而非手写
2. SPEC 中应增加对每个接口字段的精确行为描述（包括边界情况）
3. 冷启动验证应覆盖 2-3 个不同类型的 task，而非仅 1 个