# 通用生成器弹窗 Feature 实现方案（图片/视频）

**Related**: 组件化能力建设（PRD 段落：待补充）

## 背景与目标

面向任意工具或页面提供可复用的“生成能力”，根据参数是否完整决定是否弹出弹窗：当所有参数已确定且 prompt 由模板构建时，不弹出弹窗，直接创建任务；当仍需用户确认或补充参数时，使用生成弹窗承载交互。同时统一“生成中动画弹窗”作为状态反馈入口，供所有类型复用。

目标：
- 统一图片/视频生成能力，支持弹窗与非弹窗两种路径
- 通过 `gen_type` 与参数约束判断是否需要弹窗
- 提示词统一来自 `src/configs/prompts/` 模板并进行变量替换
- 支持可选的 LLM 构建层，将模板信息精炼为最终生成提示词（默认关闭）
- 提供统一的生成中动画弹窗作为状态展示
- 前端复用 ShipAny 组件与主题配色，支持响应式

## 验收标准（待补充 PRD）
- 参数确定且 prompt 由模板构建时，不弹出弹窗
- 参数未完整确定时，进入图片/视频生成弹窗完成补充与确认
- LLM 构建层默认关闭；开启后先生成“构建提示词”，再由 LLM 输出最终生成提示词
- LLM 构建层与原始模板在同一 JSON 配置内管理，缺失则必须抛错
- 支持 3 个无弹窗场景：
  - Major Event 配图（`src/components/character-detail/ModuleDisplayTabs.tsx`）
  - OC 特色展示图（如 breakdown sheet，`src/components/character-detail/CharacterDetailClient.tsx`）
  - World 背景图生成（`src/components/worlds/WorldDetailView.tsx`）
- 所有类型共用统一生成中动画弹窗，展示任务状态与结果入口
- 通用组件使用全局国际化配置，不依赖页面级文案字段
- Breakdown sheet（design_sheet）固定参数：`aspect_ratio=16:9`、`image_resolution=16:9`、`model_uuid=google/nano-banana`，提示词使用 `src/configs/prompts/ocs/breakdown_sheet.json`
- World cover 使用无弹窗模式，必须复用通用生成入口 + prompt 配置驱动，不允许页面内拼接 prompt
- World cover 的 LLM 构建层在前端触发，配置来自 `src/configs/prompts/world-cover.json`

## 系统级流程/时序

### 主流程 A：无弹窗生成
1. **触发生成**：页面触发并传入 `gen_type` 与固定参数
2. **模板构建**：从 `src/configs/prompts/` 读取模板并替换变量
3. **LLM 构建层（可选）**：生成“构建提示词”，调用 LLM 输出最终生成提示词
4. **创建任务**：调用对应创建任务 API（图片/视频）
5. **生成中弹窗**：展示统一生成中动画弹窗并开始轮询
6. **Webhook 更新**：服务端接收 Webhook 更新任务状态
7. **结果呈现**：页面接收回调并更新结果区域

### 主流程 B：弹窗生成
1. **打开弹窗**：由任意页面/工具触发并传入 `gen_type` 与可选约束
2. **参数补充**：用户在弹窗内选择模型/风格/分辨率等
3. **模板构建**：从 `src/configs/prompts/` 读取模板并替换变量
4. **LLM 构建层（可选）**：生成“构建提示词”，调用 LLM 输出最终生成提示词
5. **创建任务**：确认后创建任务
6. **生成中弹窗**：展示统一生成中动画弹窗并开始轮询
7. **结果呈现**：弹窗回调结果给页面

## 组件设计

### 1. 组件拆分
- **ImageGenerationModal**：图片生成弹窗（需要用户选择/补充参数时使用）
- **VideoGenerationModal**：视频生成弹窗（需要用户选择/补充参数时使用）
- **GenerationStatusModal**：统一生成中动画弹窗（所有类型共用）

### 2. Props（伪代码）
```
GenerationEntryProps {
  gen_type: "image" | "video";
  mode?: "modal" | "silent"; // silent 表示不弹出生成弹窗
  resolution?: string | string[];
  model?: string | string[];
  style?: string | string[];
  quantity?: number | { min?: number; max?: number };
  templateKey?: string; // prompt 模板 key
  templateParams?: Record<string, string>;
  useExtractPrompt?: boolean; // 是否启用 LLM 构建层，默认 false
  onSuccess?: (result) => void;
  onError?: (error) => void;
}

GenerationStatusModalProps {
  open: boolean;
  status: "submitting" | "polling" | "success" | "error";
  message?: string;
  onClose?: () => void;
}
```

### 3. 字段与交互规则
- **模型/风格/分辨率/数量**：
  - 传入单值：固定值展示或直接使用
  - 传入数组：作为候选项
  - 未传入：使用对应配置默认列表
- **提示词**：
  - 必须使用 `src/configs/prompts/` 模板
  - 生成前用 `templateParams` 替换变量
  - 可选 LLM 构建层：从同一 JSON 读取 LLM 配置，输出最终生成提示词
  - LLM 输出为空或缺少必需变量时必须抛错，不进行兜底
- **World cover 特例**：
  - 无弹窗直出：参数就绪后直接创建任务，统一状态弹窗展示进度
  - 使用前端 LLM 构建层生成最终 prompt，再创建任务
  - LLM 配置必须来自 `src/configs/prompts/world-cover.json`
- **弹窗判定**：
  - 参数完整 + 模板可用 → `mode="silent"`，不弹出生成弹窗
  - 需要用户补充 → `mode="modal"`，进入生成弹窗
- **完成态处理**：
  - 生成中状态弹窗不展示“OK/完成”状态
  - 完成后直接关闭弹窗并回填图片结果

## LLM 提取层实现要点（开始实现）

### 1. 配置来源与结构约束
- 配置文件统一放在 `src/configs/prompts/`，与模板同源
- 读取目标 JSON 内的 `llm_build` 与 `output_rules`，缺失即抛错
- `llm_build.required_fields` 为必填字段，缺失必须阻断流程并抛错

### 2. 执行流程（前端触发）
1. **读取配置**：根据 `templateKey` 加载 prompt 配置
2. **变量替换**：将 `templateParams` 注入 `user_prompt_template`
3. **必填校验**：校验 `required_fields` 对应值是否存在且非空
4. **LLM 调用**：基于 `model/temperature/max_tokens/system_prompt` 组装请求
5. **输出清理**：按 `output_rules` 执行截断与清理
6. **产出 prompt**：LLM 输出作为最终生成 prompt

### 3. 错误处理（必须抛错）
- 缺少配置或字段：抛错并阻断生成
- LLM 输出为空或超限后为空：抛错并阻断生成
- 模板变量缺失：抛错并阻断生成

### 4. 当前缺口
- 前端 LLM 调用的统一 API 契约仍缺失（需在 API 文档中补齐）

### 4. 轮询 + Webhook 机制
- **创建任务**：根据 `gen_type` 路由到不同 API
  - 图片：`POST /api/anime-generation/create-task`
  - 视频：`POST /api/anime-video/create-task`
- **轮询状态**：`GET /api/generation/status/[uuid]`
- **Webhook 回调**：`POST /api/generation/webhook`
- **状态机**：`idle → submitting → polling → success/error`

## 复用与集成方式

### 1. 任意页面集成
- 无弹窗场景直接调用生成入口并展示 `GenerationStatusModal`
- 弹窗场景由上层页面控制显隐与参数约束
- 结果通过回调传回页面，避免页面直接耦合生成逻辑

### 2. 与现有生成架构对齐
- 使用统一 BaseGenerationService 相关的状态查询与回调
- 复用现有参数验证策略与错误码定义

## Major Event 配图生成流程（oc_events）

场景：角色详情页 Background Story → Major Events 的事件配图生成。

1. **触发生成**：`EventCard` 点击 “AI Generate”，不弹出生成弹窗
2. **模板构建**：读取 `src/configs/prompts/ocs/oc_events.json`，用 `templateParams` 替换变量
   - 新增时间语义变量：`timelinePeriod`（childhood/adolescence/early adulthood/adulthood）
   - 新增构图策略变量：`compositionGuidance`（按事件阶段自适应，不固定主体居中）
   - `characterInfo` 仅保留外观与身份信息，不注入角色名称
3. **LLM 构建层（升级示例）**：
   - 同一 JSON 中新增 `extract_prompt` 与 `extract_params_schema`
   - `useExtractPrompt=true` 时先生成“提取提示词”，调用 LLM 输出最终提示词
   - 将 LLM 输出作为 `prompt` 传入创建任务
4. **固定参数**：`aspect_ratio=16:9`、`image_resolution=16:9`、`model_uuid=google/nano-banana`
5. **创建任务**：`POST /api/anime-generation/create-task`，`gen_type=oc_events`
6. **参考图**：若存在角色立绘，作为 `reference_image_urls` 传入
7. **生成中弹窗**：展示统一生成中动画弹窗并轮询状态
8. **结果写回**：成功后覆盖已有图片，写回 `segment.image_url` 与 `segment.image_uuid`

### 校验与错误处理
- 缺少模板或变量时必须抛错，不进行兜底
- 仍遵循通用参数校验与错误码规则
- 启用 LLM 构建层但缺少 `extract_prompt` 或输出为空时必须抛错
- major event 的模板必须禁止渲染角色名、标签、水印等可见文字

## Breakdown sheet 生成流程（design_sheet）

场景：角色详情页画廊中的 OC 特色展示图（breakdown sheet）。

1. **触发生成**：用户在详情页触发 breakdown sheet，走无弹窗模式
2. **模板构建**：读取 `src/configs/prompts/ocs/breakdown_sheet.json`，用 `templateParams` 替换变量（`{locale}`）
3. **创建任务**：`POST /api/anime-generation/create-task`，`gen_type=design_sheet`
4. **固定参数**：`aspect_ratio=16:9`、`image_resolution=16:9`、`model_uuid=google/nano-banana`
5. **参考图**：必须传入角色立绘作为 `reference_image_urls[0]`
6. **可见性**：`visibility_level=public`
7. **结果写回**：成功后由前端选择结果并写入画廊

### 校验与错误处理
- 缺少模板或变量时必须抛错，不进行兜底
- 缺少立绘时必须提示错误并阻断请求

## World cover 生成流程（world_cover）

场景：World 创建/编辑页封面图生成。

1. **触发生成**：无弹窗模式，参数就绪后直接触发创建任务
2. **模板构建**：从 `src/configs/prompts/world-cover.json` 读取模板并替换变量
3. **LLM 构建**：通用生成组件调用 LLM 构建层，得到最终 prompt
4. **创建任务**：`POST /api/anime-generation/create-task`，`gen_type=world_cover`
5. **生成中弹窗**：统一状态弹窗展示进度并轮询
6. **结果写回**：选择首张结果写入 `cover_url`

### 校验与错误处理
- 缺少模板或变量时必须抛错，不进行兜底
- World cover 的非必选字段允许为空：`world_factions`、`world_history`、`world_extra`、`scene_hint`
- World cover 的必选字段为：`world_description`、`world_genre`、`world_name`、`world_theme_colors`、`world_tech_magic`、`world_species`

## 影响清单

### API 设计
- [动漫生图 API](../api/anime-generation.md) - `POST /api/anime-generation/create-task`
- [动漫生图 API](../api/anime-generation.md) - `POST /api/anime-generation/build-extract-prompt`（待实现）
- [动漫视频 API](../api/anime-video.md) - `POST /api/anime-video/create-task`
- [统一状态 API](../api/API-INDEX.md#api) - `GET /api/generation/status/[uuid]`
- [Webhook 回调 API](../backend/service-generation-architecture.md) - `POST /api/generation/webhook`

### 前端组件
- `docs/2-implementation/frontend/component-generation-modals.md`

### 后端服务
- [生图服务架构](../backend/service-generation-architecture.md)

### 测试用例
- 计划新增：`tests/test-cases/FEAT-generator-modals-*.md`

## 风险与待确认事项
- 该能力未在 PRD 中落点，需要补充 PRD 段落与验收标准
- 需确认 gen_type 与模板映射的配置来源及校验规则
- 需确认视频生成是否支持“数量 > 1”的业务规则
- 需确认 LLM 构建层的模型选择与费用统计归属
- 需确认 world cover 使用的模板来源与变量清单，避免页面自行拼接 prompt
- 需补充前端 LLM 构建层调用的统一 API 契约（当前缺失）

## 变更历史
2026-02-07 FEAT-generator-modals 优化 major event 构图与禁文案约束（影响：oc_events prompt/前端变量注入）
2026-01-27 FEAT-generator-modals 补充 LLM 提取层与 world cover 落地要点（影响：前端流程/配置约束）
2026-01-27 FEAT-generator-modals 补齐 API 契约与前端组件文档（影响：API/前端）
- 2026-01-26 FEAT-generator-modals 增加可选 LLM 构建层与 oc_events 升级示例（影响：模板/流程）
- 2026-01-25 FEAT-generator-modals 优化弹窗判定与生成中状态弹窗方案（影响：前端/文案）
- 2026-01-24 FEAT-generator-modals 补充 Major Event 配图生成流程与模板校验（影响：前端/模板）
- 2026-01-21 创建通用生成弹窗 Feature 实现方案 v1.0（图片/视频）
