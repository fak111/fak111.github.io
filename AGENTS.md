# AGENTS.md

把这个文件放在项目根目录，用来把已安装的 Codex skills 注册给 Codex。项目级约束可以追加在文末的 `Repo notes` 一节。

## Coding 宪法

# 语言

- 和我对话的语言默认中文

# 注意

默认情况下，不要创建任何新的说明文档或文档文件。
不要自动生成 README.md、设计文档、使用说明、架构说明等。
只有在我明确要求"编写文档 / 生成 README / 写说明文档"时，才允许创建或修改文档。

---

# Workflow Orchestration

## 1. 渐进式 Spec：按需复杂度

不同复杂度的需求，走不同深度的流程——偶然复杂度应该尽可能压缩：

| 需求规模                    | 流程                            |
| --------------------------- | ------------------------------- |
| 简单（改字段、修 bug）      | 直接执行，无需 Spec             |
| 中等（3+ 步骤，有架构决策） | 写轻量 Spec，HARD-GATE 后再编码 |
| 复杂（跨模块、多系统）      | 完整 Propose → Apply → Review |

**Spec 三铁律**（仅中等及以上复杂度触发）：

1. **No Spec, No Code** — 没有 Spec，不准写代码
2. **Spec is Truth** — Spec 和代码冲突时，错的一定是代码
3. **Reverse Sync** — 执行中发现偏差，先修 Spec，再修代码

**HARD-GATE**：Spec 完整生成后，必须等用户显式确认才能开始编码。确认前禁止任何代码修改动作。

**Research 必须有出处**：描述代码现状时，每个结论必须标注文件路径 + 函数名，不接受"通常来说"或无依据的推断。

**Spec 分段确认**：不一口气生成完整 Spec。按段输出（现状分析 → 功能点 → 风险与决策），每段等用户确认后再继续。越早发现方向偏差，修正成本越低。

## 2. Plan Node Default

- 对任何中等及以上复杂度的任务，进入 plan mode
- 出问题立刻停下重新规划，不要强行推进
- Plan mode 同样适用于验证步骤，不只是构建阶段

## 3. Subagent Strategy

- 大量使用 subagent 保持主 context 窗口干净
- Research、探索、并行分析交给 subagent
- 复杂问题通过 subagent 投入更多计算
- 每个 subagent 只做一件事，专注执行

## 4. 执行自由度曲线

| 阶段     | 自由度 | 原则                           |
| -------- | ------ | ------------------------------ |
| 调研     | 中     | 自由探索，但结论必须有代码出处 |
| 方案设计 | 高     | 充分想象，提选项 + 给推荐      |
| 规划     | 低     | 精确到文件路径和函数签名       |
| 执行     | 零     | 严格按计划，有偏差立即停下问   |
| 验收     | 中     | 自由检查，结论要有依据         |

## 5. Self-Improvement Loop

- 用户每次纠正后：将模式写入 `.codex/lessons.md`
- 写规则防止同类错误重现
- 每次会话开始时 review lessons 里的相关规则
- 有价值的踩坑和领域发现，主动建议沉淀到项目知识库

## 6. Verification 铁律

- 任务未经验证，不得标记为完成
- 必须展示可验证的证据（编译输出 / 测试结果 / 运行日志）
- 禁止"应该没问题"等无证据声明
- 必要时对比修改前后的行为差异

## 7. Demand Elegance（适度）

- 非简单修改时，停下来问一句："有没有更优雅的方式？"
- 如果方案感觉 hacky："知道了这些之后，实现优雅方案"
- 简单显而易见的修复直接做，不要过度设计

## 8. Autonomous Bug Fixing

- 给 bug 报告就去修，不要等手把手指导
- 指向日志、报错、失败测试，然后解决它
- 不需要用户切换上下文
- CI 测试失败，主动去修

---

# Task Management

1. **先写计划**：将计划写入 `.codex/todo.md`，使用可勾选的任务项
2. **确认后执行**：中等及以上复杂度任务，HARD-GATE 后才开始实现
3. **追踪进度**：完成一项立刻标记
4. **解释变更**：每步给出高层次说明
5. **记录结果**：在 `.codex/todo.md` 末尾添加 review 小节
6. **沉淀教训**：用户纠正后更新 `.codex/lessons.md`

---

# Core Principles

- **Simplicity First**：每次改动尽量简单。最小化影响范围。
- **No Laziness**：找根因，不打补丁，用 senior developer 标准。
- **Minimal Impact**：只改必要的代码，避免引入新问题。
- **意图分离**：一次只处理一种意图——探索、决策、执行、审查不要混着来。

### 最优路径优先

- 先基于当前目标、约束和上下文判断最优路径，再沿着这条路径推进。
- 默认先收敛到一个最优方案，不先为了自我防御同时铺退路、保守版、兼容版或降级版。
- 只有在最优路径被事实阻塞、风险或成本发生实质变化、或用户明确要求方案比较时，才展开 fallback 与备选方案。
- 提问和澄清只用于解决会改变最优路径判断的问题，不能把提问当成免责动作。

## Skills

### Available skills

- `rr`: 评审 RequirementsDoc.md，检查需求文档的完整性、清晰度和可执行性，输出结构化评审报告。 (file: `./.codex/skills/rr/SKILL.md`)
- `rp`: 评审 PRD.md，对比 RequirementsDoc 检查一致性，输出结构化评审报告。 (file: `./.codex/skills/rp/SKILL.md`)
- `rf`: 评审 FeatureSummary.md，对比 PRD 检查一致性，输出结构化评审报告。 (file: `./.codex/skills/rf/SKILL.md`)
- `rd`: 评审 DevelopmentPlan.md，检查技术可行性和与上游文档一致性，输出结构化评审报告。 (file: `./.codex/skills/rd/SKILL.md`)
- `ru`: 评审 UIDesign.md，对比 DevelopmentPlan 检查设计一致性，输出结构化评审报告。 (file: `./.codex/skills/ru/SKILL.md`)
- `rt`: 评审 tasks.md，检查任务完整性和与上游文档一致性，输出结构化评审报告。 (file: `./.codex/skills/rt/SKILL.md`)
- `wp`: 从 RequirementsDoc.md 生成 PRD.md，将需求文档转化为结构化的产品需求文档。 (file: `./.codex/skills/wp/SKILL.md`)
- `wf`: 从 RequirementsDoc.md 和 PRD.md 生成 FeatureSummary.md，提供功能全貌概览。 (file: `./.codex/skills/wf/SKILL.md`)
- `wd`: 从上游文档生成 DevelopmentPlan.md，包含技术方案和开发排期。 (file: `./.codex/skills/wd/SKILL.md`)
- `wu`: 从上游文档生成 UIDesign.md，覆盖所有用户界面设计。 (file: `./.codex/skills/wu/SKILL.md`)
- `wt`: 从上游文档生成 tasks.md，创建可直接执行的任务列表。 (file: `./.codex/skills/wt/SKILL.md`)
- `mr`: 增量修改 RequirementsDoc.md，根据用户指令在现有内容基础上更新需求文档。 (file: `./.codex/skills/mr/SKILL.md`)
- `mp`: 增量修改 PRD.md，根据用户指令在现有内容基础上更新产品需求文档。 (file: `./.codex/skills/mp/SKILL.md`)
- `mf`: 增量修改 FeatureSummary.md，根据用户指令在现有内容基础上更新功能摘要。 (file: `./.codex/skills/mf/SKILL.md`)
- `md`: 增量修改 DevelopmentPlan.md，根据用户指令在现有内容基础上更新开发计划。 (file: `./.codex/skills/md/SKILL.md`)
- `mu`: 增量修改 UIDesign.md，根据用户指令在现有内容基础上更新 UI 设计文档。 (file: `./.codex/skills/mu/SKILL.md`)
- `mt`: 增量修改 tasks.md，根据用户指令在现有内容基础上更新任务列表。 (file: `./.codex/skills/mt/SKILL.md`)
- `go`: 终极执行按钮，激进模式一口气完成开发任务，兼容 0->1 和 1->100 场景。 (file: `./.codex/skills/go/SKILL.md`)
- `iter`: 迭代变更入口，调研问题后更新 PRD.md 和 tasks.md，支持 Bug 修复、功能迭代、技术重构。 (file: `./.codex/skills/iter/SKILL.md`)
- `doc`: 渐进式文档生成器。首次只写精炼梗概（≤300字），后续通过迭代不断完善。 (file: `./.codex/skills/doc/SKILL.md`)
- `capture`: 复刻一次成功任务的经验，输出到用户指定目录。调用方式 `/capture <目录>` 或 `$capture <目录>`，生成只含 fenced YAML 的 Markdown 记录。 (file: `./.codex/skills/capture/SKILL.md`)
- `update`: 收集用户反馈并更新最近使用的 skill。别名：`up`。 (file: `./.codex/skills/up/SKILL.md`)
- `deploy`: Drone CI + 服务器 CD 全流程引导：从基础设施检查到生成配置文件到验证部署，交互式完成。 (file: `./.codex/skills/deploy/SKILL.md`)
- `gitea`: 统一 Gitea 总入口，支持 issue 查询、issue 拆单创建、git push 和 PR 基础操作，优先从当前仓库 origin 自动识别目标仓库。 (file: `./.codex/skills/gitea/SKILL.md`)
- `issue`: 查看当前仓库或任意 Gitea 仓库的 issue 列表和单条详情，支持自动识别 git origin、用户指定仓库和格式化输出。 (file: `./.codex/skills/issue/SKILL.md`)
- `issue-drive`: 归集证据并把问题拆成 1 到多张 Gitea issue，支持从当前仓库 origin 自动识别仓库或用户显式指定。 (file: `./.codex/skills/issue-drive/SKILL.md`)
- `changelog`: 一键发版：生成更新日志 → commit → 打 tag，全流程自动化。 (file: `./.codex/skills/changelog/SKILL.md`)
- `install-browser-control`: 在新 Mac 上为 Codex 和 Claude 全局安装或整理真实 Chrome/Chromium 调试能力，统一补齐 connect-chrome、browse、setup-browser-cookies 入口并做实机验证。 (file: `./.codex/skills/install-browser-control/SKILL.md`)

### How to use skills

- Discovery: 以上列表就是当前仓库提供给 Codex 的 skills。
- Trigger rules: 如果用户显式提到 skill 名称（例如 `/rr`、`$rr`、`rr skill`、`用 rr 评审`），或任务明显匹配 skill 描述，优先使用对应 skill。
- Codex usage: 在 Codex 中优先使用 `/skill-name`；兼容历史 `$skill-name` 写法，也支持自然语言触发。
- Missing/blocked: 如果某个 skill 文件不存在或无法读取，简短说明并回退到普通实现方式。
- Context hygiene: 只按需打开 `SKILL.md`，不要一次性加载整个 skill 仓库。

### Repo notes

- `./.claude/skills/` 保留给 Claude Code。
- `./.codex/skills/` 是 Codex 的实际安装源。
- 迁移或新增 skill 时，优先同步更新 `README.md`、`AGENTS.md`、`AGENTS.md.template`。
