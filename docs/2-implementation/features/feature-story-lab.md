# Story Lab 设计方案（对标 StoryGen-Atelier）

Related: FEAT-story-lab

更新时间：2026-02-11

## 背景与目标
Story Lab 目标是把“脚本输入”转化为“结构化分镜与可生产的视觉任务”，并在过程中完成角色、场景、道具资产沉淀与一致性绑定。

参考实现：StoryGen-Atelier（https://github.com/0xsline/StoryGen-Atelier/tree/main）

本次方案在现有 MVP 基线上，补充“可执行工作台”设计：
- 从一次性生成升级为“解析 -> 规划 -> 生产”的可回退流程。
- 明确 Scene/Shot 作为核心中间层，保证跨漫画/视频复用。
- 将一致性能力前置到规划阶段，而不是后置在生图阶段补救。

## StoryGen-Atelier 深入借鉴点（代码级）

### A. 阶段状态机与日志可观测
StoryGen-Atelier 在后端将流程拆为可跟踪状态：`started` -> `generating` -> `stitching` -> `completed/error`，并把中间产物持久化到日志表（如 transitionPlans、clipResults）。

可借鉴到 Story Lab：
- 引入 Story Lab 统一状态机：`draft` -> `parsing` -> `planning` -> `generating` -> `packaging` -> `completed/error`。
- 每个阶段产物落库并可导出（JSON），用于复盘、审计与回放。
- 失败时记录结构化错误上下文（phase、shot_id、provider、error_code、error_message）。

### B. 中间计划层（Plan Artifact）
StoryGen-Atelier 将镜头间过渡单独抽象为 `transitionPlans`，先分析再执行，避免“边生成边决定”导致的不可控。

可借鉴到 Story Lab：
- 增加 `ShotPlan`/`ContinuityPlan` 中间对象，先产出可审阅计划，再执行生成。
- 用户可在“计划层”修改镜头语义后再批量生成，减少返工。

### C. 一致性锚点策略
StoryGen-Atelier 使用首镜头提取 `heroSubject`，并将首帧图作为后续镜头的 reference image，实现角色形象连续性。

可借鉴到 Story Lab：
- 引入 `ConsistencyAnchor`（角色视觉锚）：
  - 文本锚：角色稳定描述（来自 Character Studio）
  - 图像锚：首镜头或角色标准参考图
- 后续镜头默认附带锚点，允许单镜头覆盖并留痕。

### D. 局部失败可恢复
StoryGen-Atelier 支持镜头级重新生成（regenerate-shot），而非全量重跑。

可借鉴到 Story Lab：
- 支持 `shot-level retry`、`scene-level retry`、`full rerun` 三档重跑。
- 局部重跑必须继承上次有效输入快照，保证可复现。

### E. Prompt 规范外置化
StoryGen-Atelier 把视频提示规范放在独立 guide 文档并注入到 LLM 调用，降低隐式 prompt 漂移。

可借鉴到 Story Lab：
- 严格使用 `src/configs/prompts/` 做模板与规则分层：
  - 系统规则（安全、结构输出约束）
  - 任务模板（scene parse / shot plan / render task）
  - 风格与模型参数（可配置）

### F. 轻量资产库与工作成果沉淀
StoryGen-Atelier 通过 gallery + logs 形成“可回看、可复用”的创作资产闭环。

可借鉴到 Story Lab：
- 产物分层保存：脚本版本、分镜计划、生成结果、导出包。
- 支持“一键从历史任务恢复到编辑态”。

## 对标洞察（含 StoryGen-Atelier）

| 竞品 | 核心定位 | 主流程（抽象） | 强项 | 短板/风险 | 对 Story Lab 的启发 | 参考链接 |
| --- | --- | --- | --- | --- | --- | --- |
| StoryGen-Atelier | 故事创作工作台 | Idea/Script -> Scene Plan -> Shot Prompt -> Image Generation -> Storyboard | 以“计划层”串联生成链路，阶段状态清晰 | 资产中台与协作能力相对轻量 | Story Lab 应采用“阶段化工作台 + 中间结构数据”模型 | https://github.com/0xsline/StoryGen-Atelier/tree/main |
| LTX Studio | 脚本到分镜与预演 | 脚本输入 -> 自动拆 scene/shot -> 自动抽取 Elements -> 逐镜生成 -> 预览导出 | 场景与镜头结构化，Elements 一致性强 | 偏影视预演，漫画链路弱 | 先做 scene/shot 结构与元素层 | https://ltx.studio/blog/ltx-storyboard-generator-update https://ltx.studio/platform/ai-storyboard-generator |
| Boords | 脚本导入与协作审阅 | 导入脚本 -> AI 结构化 -> 可选角色一致性 -> 生成 storyboard -> 导出 | 结构化导入与协作审阅强 | 生成深度与创作能力一般 | 强化脚本导入与可审核导出 | https://help.boords.com/en/articles/10894763-importing-scripts-with-ai https://boords.com/docs/creating-storyboards |
| Katalist | 一键脚本转分镜 | 脚本导入 -> 自动拆 shot -> 生成视觉 -> 手动调镜头 | 镜头级可控（角度、构图、pose） | 故事资产沉淀较弱 | 分镜编辑器必须保留镜头语义 | https://www.katalist.ai/ |
| StoryboardHero | 广告脚本分镜提效 | brief 或脚本 -> 场景/镜头拆解 -> 生成图像 -> 导出 | 方案转可交付物速度快 | 长篇叙事资产薄弱 | 提供从 brief 到可交付产物快路径 | https://storyboardhero.ai/features |
| Sudowrite Story Bible | 写作资产中台 | idea -> synopsis -> outline -> scenes/prose | 故事资产沉淀与一致性强 | 视觉分镜能力弱 | 先建资产层，再接视觉流水线 | https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC |
| NovelAI Lorebook | 可检索叙事资产库 | 创建角色/地点/物件条目 -> 上下文触发 -> 内容生成 | 资产检索与上下文注入强 | 分镜生产链路弱 | 角色与世界观需要可检索条目 | https://docs.novelai.net/en/text/lorebook |
| Dashtoon | 漫画生产 | 角色设定 -> 分镜/画格生成 -> 编辑 -> 发布 | 角色一致性与漫画链路强 | 跨媒介衔接弱 | 可用漫画输出补足 Story Lab 产出 | https://dashtoon.com/ai-comic-generator |

## 竞品共性核心思路
- 先资产化，再生成。角色、地点、道具是第一层资产。
- 分阶段流水线。script -> scene -> shot -> visual。
- AI 自动拆解 + 人工可编辑并行。
- 一致性是产品能力而非提示词技巧。
- 输出导向。要能导出或进入协作与发布。

## Story Lab 目标方案（MVP+）

### 1) 流程分层（对齐 StoryGen-Atelier 的工作台思想）
1. **Script Ingestion**：脚本导入/粘贴，章节化管理。
2. **Story Parsing**：自动拆分 Scene，并产出每个 Scene 的目标、情绪、时空、登场实体。
3. **Shot Planning**：自动生成 Shot 列表，支持用户编辑镜头语义（景别、机位、运动、时长、节奏）。
4. **Visual Task Build**：将 Shot 转为可执行视觉任务（prompt + negative prompt + 参考资产 + 参数）。
5. **Draft Generation**：逐镜生成草案并打分（角色一致性、构图匹配度、风格一致性）。
6. **Storyboard Packaging**：导出结构化 storyboard 包并流转到 Manga Studio / Video Engine。

### 1.1) 执行状态机（新增）
- `draft`: 用户编辑脚本与配置。
- `parsing`: 进行 Scene 解析与实体抽取。
- `planning`: 生成并校验 ShotPlan/ContinuityPlan。
- `generating`: 执行镜头级视觉任务。
- `packaging`: 组装导出包并写入下游入口。
- `completed | error`: 成功完成或失败终止（可重试）。

### 2) 核心对象（中间结构）
- **ScriptDocument**：章节、段落、语言、版本号。
- **SceneCard**：scene_id、summary、intent、location、time、participants。
- **ShotCard**：shot_id、scene_id、camera、composition、motion、duration、dialogue_ref。
- **AssetBinding**：角色/场景/道具的唯一引用（关联 Character Studio 与 Worlds）。
- **GenerationTask**：模型、prompt 模板、参数、状态、结果 URI。
- **ConsistencyAnchor**：hero_subject_text、reference_image_asset_id、anchor_version。
- **StoryLabRunLog**：phase、input_snapshot、output_snapshot、provider、error_code、duration_ms。

### 3) 关键交互规则
- 自动拆解结果必须可编辑且可重跑（保留人工改动）。
- 镜头重排后自动刷新 continuity 校验（角色出场顺序、场景跳转合理性）。
- 失败镜头支持单镜头重试，不阻塞整条流水线。
- 每次生成固定记录“输入快照”，保证可复现。
- 当上游阶段失败时必须抛出明确错误，不以静默默认值掩盖问题。
- 保留“计划先审后生”开关：可选择自动直出或人工确认后执行。

### 4) 与平台既有能力衔接
- 角色引用：复用 Character Studio 资产 ID，不重复存角色描述。
- 世界设定：复用 Worlds 中的场景氛围与禁用词规则。
- Prompt 体系：统一走 `src/configs/prompts/` 模板替换，不在业务代码硬编码 prompt。
- 生产出口：storyboard 包可直接作为 Manga Studio / Cinematic Video Engine 的输入。

## 验收标准（FEAT-story-lab）
1. 支持章节级脚本导入、保存草稿、版本回退。
2. Scene/Shot 自动拆分后，用户可逐项编辑并保存。
3. ShotCard 至少包含 camera、composition、duration 三类字段。
4. 任一镜头生成失败时，可单镜头重试且不影响其它镜头状态。
5. 可导出结构化 storyboard 包，并可被下游模块直接消费。
6. 系统可记录并查询完整执行状态机与阶段日志。
7. 同一任务支持从任意失败阶段恢复继续执行。

## MVP 指标（建议）
- Scene/Shot 自动拆分一次通过率 >= 70%。
- 同角色跨 5 镜头一致性评分 >= 0.75。
- 从脚本到可导出 storyboard 完成率 >= 80%。
- 每 10 个镜头平均人工编辑次数 <= 4。
- 单镜头重试成功率 >= 85%。
- 失败任务可恢复执行比例 >= 70%。

## 影响清单（当前方案）
- API: `docs/2-implementation/api/story-lab.md`
- 数据模型: `docs/1-specs/data-models.md`（Story Lab 数据模型规划段落）
- 前端: `docs/2-implementation/frontend/page-story-lab.md`
- 后端: `docs/2-implementation/backend/module-story-lab.md`
- 测试: `tests/test-cases/FEAT-story-lab-mvp.md`（待补充）

## 后续落地建议（基于本次借鉴）
- API 增补：`/api/story-lab/runs/:id`（状态查询）、`/api/story-lab/shots/:id/retry`（局部重试）、`/api/story-lab/runs/:id/export`（日志导出）。
- 数据模型增补：`story_lab_runs`、`story_lab_shots`、`story_lab_logs`、`story_lab_anchors`。
- 前端增补：阶段进度条、失败节点定位、局部重试按钮、运行记录面板。
- 后端增补：阶段编排器（orchestrator）、快照存储、错误分层编码。

## 变更历史
- 2026-02-11 FEAT-story-lab 完成文档落地：补齐 API/数据模型/前端/后端四份实现文档并建立双向链接（影响：Docs）
- 2026-02-11 FEAT-story-lab 深入对标 StoryGen-Atelier 本地实现：新增状态机、计划层产物、一致性锚点、局部重试与可观测日志设计（影响：Feature）
- 2026-02-11 FEAT-story-lab 对标 StoryGen-Atelier 升级 Story Lab 设计：补充阶段化工作台、核心对象、交互规则与验收标准（影响：PRD/Feature）
- 2026-02-08 FEAT-story-lab 新增 Story Lab MVP 竞品对标与流程基线（影响：文档）
