**Related**: FEAT-video-generator-model-capability (proposal)

# Video Generator 模型能力分层重构方案（支持现有模型 + Kling 3.0 复杂模式）

## 1. 背景与问题

当前 `VideoGenerator` 在组件层承载了较多模型差异逻辑，随着模型数量增长和特殊模式增多（如 Kling 3.0 的 `start_end_frame`、`multi_shot`），会出现以下问题：

- 模型特例分支逐步膨胀，主组件复杂度升高。
- 约束逻辑分散在多个 `useEffect` 和提交逻辑中，状态一致性风险增大。
- 同一能力在 UI 显示、请求组装、积分报价、复用参数恢复中重复判断，维护成本高。
- 新增特殊模型时，需要改动多个文件，回归范围不可控。

现状关键代码（当前实现）：

- `src/components/video/VideoGenerator.tsx`
- `src/components/video/DynamicVideoParams.tsx`
- `src/hooks/useVideoQuote.ts`
- `src/lib/configs/*`（模型配置读取）

## 2. 目标与非目标

### 2.1 目标

- 以“模型能力配置”为单一事实来源，统一控制：
  - 可见 UI
  - 参数约束
  - 请求参数构建
  - 前端校验与后端兜底校验
- 保持现有已上线模型行为兼容（默认模式不变）。
- 支持 Kling 3.0 特殊模式扩展，后续新增模式可插拔。
- 降低 `VideoGenerator` 组件复杂度，收敛为状态编排器。

### 2.2 非目标

- 本次不改 API 路由地址和核心业务流程。
- 本次不重做视觉样式，仅调整渲染结构与状态组织。
- 本次不引入新的全局状态库（保持局部 state）。

## 3. 方案总览

采用三层结构：

1. 能力层（Capability Layer）
2. 模式渲染层（Mode Renderer Layer）
3. 适配层（Adapter Layer）

### 3.1 能力层（配置驱动）

新增配置文件：

- `src/configs/video-model-capabilities.ts`（或放入现有模型配置结构）

能力层职责：声明每个模型可用能力与约束，不做 UI 渲染。

建议能力结构（伪结构）：

```text
model_id
  supported_modes: [standard, start_end_frame, multi_shot]
  default_mode: standard
  reference_rules:
    standard: { min: 0, max: 1, oc_compatible: true }
    start_end_frame: { min: 2, max: 2, oc_compatible: false }
    multi_shot: { min: 0, max: 1, oc_compatible: true }
  multi_shot_rules:
    min_segments: 2
    max_segments: 8
    max_total_duration_sec: 15
    segment_duration_range: [1, 12]
  ui_params: 复用 model.ui_config.params
  quote_fields: [duration_seconds, resolution, mode, video_mode, multi_prompt]
```

### 3.2 模式渲染层（专用交互）

新增目录：

- `src/components/video/modes/`

建议组件：

- `StandardModePanel.tsx`
- `StartEndFrameModePanel.tsx`
- `MultiShotModePanel.tsx`
- `VideoModePanel.tsx`（根据 mode 选择具体渲染器）

说明：

- 简单参数仍走 `DynamicVideoParams`。
- 复杂交互（双帧上传、分镜脚本编辑）由模式组件负责。
- `VideoGenerator` 只传入状态和事件，不直接硬编码模型特例 UI。

### 3.3 适配层（校验 + payload 组装）

新增目录：

- `src/services/generation/video-adapter/`

建议文件：

- `capability-registry.ts`：读取/缓存能力配置
- `video-mode-validator.ts`：统一前端校验
- `video-payload-builder.ts`：按模型+模式生成请求 payload
- `video-reuse-normalizer.ts`：复用参数恢复归一化

适配层职责：

- 对外提供统一接口（示意）：
  - `getInitialFormState(modelId)`
  - `validateBeforeSubmit(formState, capability)`
  - `buildCreateTaskPayload(formState, capability)`
  - `normalizeReuseData(videoData, capability)`
- 保证同一规则只定义一次，避免 UI/提交/复用各写一套。

## 4. Kling 3.0 特殊场景支持

### 4.1 Start/End Frame

能力规则：

- mode = `start_end_frame`
- 必须 2 张图（start、end）
- 禁止 OC（`oc_compatible = false`）
- 提交时映射为 `reference_image_urls[0..1]`

渲染规则：

- 固定两个上传槽位，不显示通用多图上传。
- 若当前已有 OC，切模式时触发清理并提示（英文）。

### 4.2 Multi-shot

能力规则：

- mode = `multi_shot`
- `multi_prompt` 至少 2 段
- 总时长 <= 配置上限（如 15s）
- 段数 <= 配置上限（如 8 段）
- 每段时长范围可配置

渲染规则：

- 显示分镜编辑器（增删段、段 prompt、段时长）
- 显示总时长计数和超限错误
- 参考图按能力规则限制（通常最多 1 张）

### 4.3 兼容性策略

- Kling 3.0 未配置 mode 时自动回退 `standard`。
- 旧数据复用时按 `video_mode` 恢复；字段缺失时回退默认模式。

## 5. 已有模型兼容方案

### 5.1 默认能力回退

对未声明能力的旧模型，提供默认能力模板：

- `supported_modes = [standard]`
- `default_mode = standard`
- `reference_rules.standard.max = 1`
- 其余使用现有 `ui_config.params` 与默认参数

### 5.2 API 兼容

- `POST /api/anime-video/create-task` 保持不变。
- 新增字段仅在有能力声明时提交。
- 不支持字段不下发，避免后端歧义。

### 5.3 报价兼容

- `useVideoQuote` 改为调用适配层统一取值，避免与提交参数不一致。

## 6. 目录与文件改造清单

新增：

- `src/configs/video-model-capabilities.ts`
- `src/services/generation/video-adapter/capability-registry.ts`
- `src/services/generation/video-adapter/video-mode-validator.ts`
- `src/services/generation/video-adapter/video-payload-builder.ts`
- `src/services/generation/video-adapter/video-reuse-normalizer.ts`
- `src/components/video/modes/VideoModePanel.tsx`
- `src/components/video/modes/StandardModePanel.tsx`
- `src/components/video/modes/StartEndFrameModePanel.tsx`
- `src/components/video/modes/MultiShotModePanel.tsx`

修改：

- `src/components/video/VideoGenerator.tsx`
- `src/components/video/DynamicVideoParams.tsx`
- `src/hooks/useVideoQuote.ts`
- （如需）`src/app/api/anime-video/create-task/route.ts` 的参数兜底校验

## 7. 分阶段实施计划

### Phase 1: 能力配置落地

- 建立 capability schema 与默认回退能力。
- 将现有模型映射到能力配置（先覆盖当前线上模型）。

### Phase 2: 适配层接管提交

- 提取校验与 payload 构建逻辑。
- `VideoGenerator` submit 改为调用 `validator + payload builder`。

### Phase 3: 模式渲染器拆分

- 拆出 `VideoModePanel` 和 3 个 mode 子组件。
- 将 Kling 3.0 特殊 UI 从主组件移除。

### Phase 4: 复用参数与报价统一

- 复用参数恢复走 `video-reuse-normalizer`。
- `useVideoQuote` 使用同一套归一化参数构建。

### Phase 5: 回归与灰度

- 覆盖主路径、错误路径、复用路径。
- 先在开发环境全量验证，再逐步上线。

## 8. 测试方案（建议）

新增测试文件建议：

- `tests/test-cases/FEAT-video-generator-model-capability-main-path.md`
- `tests/test-cases/FEAT-video-generator-model-capability-edge-cases.md`
- `tests/test-cases/FEAT-video-generator-model-capability-regression.md`

覆盖重点：

- 现有普通模型 `standard` 模式提交不回归。
- Kling 3.0 `start_end_frame`：
  - 无 2 张图阻断提交
  - 有 OC 时自动清理并提示
- Kling 3.0 `multi_shot`：
  - 段数下限/上限
  - 总时长超限拦截
- quote 参数与 create-task 参数一致性。
- 复用老视频参数时可恢复到正确 mode。

## 9. 风险与回滚

风险：

- 模式切换时状态迁移不完整导致参数丢失。
- 能力配置缺失导致 UI 不显示或参数误判。

控制措施：

- 提供默认能力回退。
- validator 返回结构化错误并在 UI 展示英文错误信息。
- 在提交前输出统一 debug 日志（mode/capability/payload keys）。

回滚方案：

- 保留旧提交流程分支（短期 feature flag）。
- 若出现高频失败，可切回旧流程并保留能力配置文件。

## 10. 完成判定（DoD）

- `VideoGenerator` 内不再出现 `model_id === "kling-3.0/video"` 之类硬编码分支。
- 所有模式约束来自 capability 配置。
- 提交与报价使用同一参数构建逻辑。
- 已有模型主路径回归通过。
- Kling 3.0 三种 mode（standard/start_end_frame/multi_shot）通过验收。

## 变更历史

- 2026-02-11 FEAT-video-generator-model-capability 新增重构方案（影响：前端组件/参数适配/模型能力配置）
