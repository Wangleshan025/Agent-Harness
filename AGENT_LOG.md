# AGENT_LOG.md

> HarnessX — Coding Agent Harness 开发过程日志
> 项目时间：2026-08-14 ~ 2026-08-15
> 开发智能体：Claude Code (DeepSeek-v4-flash)
> Superpowers 版本：6.3.0
> 仓库：https://github.com/Wangleshan025/Coding-Agent-Harness

---

## 2026-08-14

### 01:48 — 项目初始化
- **技能**: 无（手动）
- **操作**: 创建项目目录，初始化 git 仓库
- **提交**: `81deddd` — init: project scaffold

### 01:55 — Task 1: 项目脚手架
- **技能**: brainstorming → writing-plans → subagent-driven-development
- **操作**: 创建 package.json、tsconfig.json、tsup.config.ts、vitest.config.ts、eslint、prettier、gitignore、src/index.ts
- **人工干预**: 无
- **提交**: `593f7a9` — chore: initialize project scaffold

### 01:58 — Task 2: 核心类型定义
- **技能**: subagent-driven-development
- **操作**: 定义 Message、LLMResponse、ToolCall、Action、Observation、Turn、Memory、HarnessConfig、DEFAULT_CONFIG 等核心类型
- **人工干预**: 无
- **提交**: `767fa00` — feat: add core type definitions

### 02:02 — Task 3: 配置加载器
- **技能**: subagent-driven-development
- **操作**: 实现 loadConfig() 函数，支持默认值 → 配置文件 → 运行时覆盖的三层合并
- **人工干预**: 修复了 vitest.config.ts 中残留的空配置块（resolve.alias、server.deps.inline）
- **提交**: `c466043` — feat: add config loader with defaults and overrides

### 22:45 — Task 4: LLM 抽象层 + MockLLM
- **技能**: subagent-driven-development
- **操作**: 实现 LLMProvider 接口、DeepSeekProvider（原生 fetch，AbortController 超时）、MockLLMProvider（确定性响应）
- **人工干预**: 修复了 MockLLMProvider 使用 Array.find() 的 bug（导致总是返回第一个响应），改为按 callIndex 索引；修复了 DeepSeekProvider 中未使用的 errorText 变量
- **提交**: `32fa603` — feat: add LLM abstraction layer; `c6bbb5a` — fix: remove unused errorText

### 22:49 — Task 5: Action 解析器
- **技能**: subagent-driven-development
- **操作**: 实现 parseAction()，解析 LLM 的 tool_calls 输出为 Action 对象，含 try/catch JSON 解析
- **人工干预**: 无
- **提交**: `cb69dfa` — feat: add action parser from LLM responses

### 22:56 — Task 6: Agent 主循环
- **技能**: subagent-driven-development
- **操作**: 实现 Agent 类，含 buildContext()、runTask()、循环检测（连续相同动作 >= 3 次触发）
- **人工干预**: 修复了循环检测阈值 bug（`>= 3` 改为 `>= 2`，因为计数器从 1 开始计数）
- **提交**: `52b1df7` — feat: add agent main loop

### 23:00 — Task 7: 工具集 + 注册表
- **技能**: subagent-driven-development
- **操作**: 实现 ToolRegistry 和 7 个工具：read_file、write_file、edit_file、execute_command、run_tests、search_code、ask_user
- **人工干预**: 修复了 edit_file 缺少路径安全检查（加入了 startsWith(cwd) 守卫）
- **提交**: `5e9b16e` — feat: add tool registry; `2de412e` — fix: add path security check

### 23:07–23:12 — Task 8–10: 三层治理护栏
- **技能**: subagent-driven-development
- **操作**: 实现静态规则匹配（blocklist + 危险前缀 + 路径遍历检测）、动态风险评估（风险模式 + 保护路径）、HITL 状态机（4 状态：idle/pending/approved/rejected，含自动超时）
- **人工干预**: 无
- **提交**: `a31b0da`, `bb19a00`, `cf452af`

### 23:15–23:20 — Task 11–13: 反馈闭环
- **技能**: subagent-driven-development
- **操作**: 实现 Validator（正则解析测试输出）、Classifier（6 种失败类别）、Corrector（策略映射）
- **人工干预**: 修复了 Classifier 置信度公式（`matchCount / rule.patterns.length` 产出 0.25–0.5，改为 `0.5 + matchCount / rule.patterns.length` 并 cap 到 1.0）
- **提交**: `4cdb16e`, `8664737`, `1fb386a`

### 23:21 — Task 14: 加密记忆存储
- **技能**: subagent-driven-development
- **操作**: 实现 MemoryStore，AES-256-GCM + scrypt 加密，save/load/list/delete/clear
- **人工干预**: 无
- **提交**: `52dda2c` — feat: add encrypted memory store

### 23:25 — Task 15: 凭据管理
- **技能**: subagent-driven-development
- **操作**: 实现 CredentialManager，AES-256-GCM 加密，init/update/clear/getKey/status
- **人工干预**: 修正了测试文件的 import 路径
- **提交**: `7466d24` — feat: add credential manager

### 23:27 — Task 16: CLI 入口
- **技能**: subagent-driven-development
- **操作**: 实现 commander CLI，harnessx run 和 harnessx cred 两个子命令
- **人工干预**: 无
- **提交**: `10c4486` — feat: add CLI entry point

### 23:29 — Task 17–18: 集成测试 + 全部测试
- **技能**: subagent-driven-development
- **操作**: 创建 3 个集成测试场景（多步工具调用、无工具调用、循环检测），运行全部 68 个测试全部通过
- **人工干预**: 无
- **提交**: `e9ea045`, `728b705`

### 23:29 — Task 19: README
- **技能**: subagent-driven-development
- **操作**: 创建 README.md
- **人工干预**: 评审发现 7 个工具枚举不完整（只列了 5 个），已修正；补了文件末尾换行符
- **提交**: `e9ea045`（与 Task 17 同 commit）

### 23:29 — Task 20: Docker 分发
- **技能**: subagent-driven-development
- **操作**: 创建 Dockerfile（多阶段构建）+ .dockerignore
- **人工干预**: 无（Docker 构建未验证，环境无 Docker 守护进程）
- **提交**: `e9ea045`（与 Task 17 同 commit）

---

## 2026-08-15

### 18:20 — CI 配置
- **技能**: 手动
- **操作**: 创建 .github/workflows/ci.yml，含 unit-test 和 docker-build 两个 job
- **人工干预**: 无
- **提交**: `0b2c593` — ci: add GitHub Actions CI workflow

### 18:20 — 冷启动验证
- **技能**: 无（使用独立 subagent）
- **操作**: 用全新 agent 仅凭 SPEC + PLAN 验证 Task 5，检查规约清晰度
- **结果**: 待记录

---

## 学到的教训

### 1. 循环检测阈值
PLAN 写的是 `consecutiveSameAction >= 3`，但计数器从 0 开始，第一次相同动作后 count=1，第三次相同后 count=2。需要改为 `>= 2`。教训：PLAN 中的数值需要在实现时验证，不能直接照搬。

### 2. MockLLM 索引
PLAN 给出的 MockLLM.chat() 实现使用了 Array.find()，导致总是返回第一个响应。改为按 callIndex 索引数组。教训：subagent 模板代码也可能有 bug，review 环节很重要。

### 3. 路径安全一致性问题
edit_file 工具做了路径 resolve/normalize 但忘了检查 startsWith(cwd)，而 read_file 和 write_file 都有。教训：同类工具的安全检查必须一致，review 时应横向对比。

### 4. 置信度公式
Classifier 的置信度公式 `matchCount / rule.patterns.length` 在单模式匹配时产出 0.25–0.5，无法达到测试期望的 `> 0.8`。教训：公式设计需要在测试前做边界值估算。

### 5. review 覆盖了 code quality 但未覆盖 plan 中的数值错误
Task 4 和 Task 6 的 bug 都是在 review 环节未被发现的"plan 中的数值/公式错误"，直到集成测试才暴露。教训：review 时应将 plan 中的数值与实现逐一对照。