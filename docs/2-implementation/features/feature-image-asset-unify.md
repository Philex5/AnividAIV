# 生成图片资源统一与解析（FEAT-IMAGE-ASSET-UNIFY）

**Related**:

- PRD：`docs/1-specs/PRD.md`
- Feature：`docs/2-implementation/features/feature-oc-rebuild.md`
- Feature：`docs/2-implementation/features/feature-worlds.md`
- API：`docs/2-implementation/api/admin-file-transfer.md`

## 背景与问题

- 当前异步后处理（上传 R2 + 多分辨率）仅覆盖 `generation_images`，但业务侧仍存在直接使用临时 URL 的场景。
- 临时 URL 过期后，相关页面（OC 世界观封面、角色事件插图、用户背景等）无法继续访问图片。
- 不同业务字段混用 `url` 与 `image uuid`，缺少统一解析层和回填机制。

## 目标与原则

- **统一资产入口**：业务字段不直接绑定临时 URL，统一保存 `image_uuid`（或 URL），由解析服务返回最终可用 URL。
- **后处理一致性**：异步处理完成后可被所有业务读取到，避免只更新 `generation_images` 而页面仍拿临时 URL。
- **兼容用户上传**：支持用户自带 URL 与生成图片共存，读取逻辑统一。
- **不改现有业务语义**：仅改变资源引用方式，不改变页面结构与内容含义。

## 影响范围（明确场景）

1. **oc_worlds**
   - 字段：`cover_url`
   - 文档：`docs/2-implementation/features/feature-worlds.md`

2. **角色详情页**
   - 文件：`src/app/[locale]/(default)/characters/[uuid]/page.tsx`
   - appearance 模块：`art.gallery[x].url`
     - 必须为 `image_uuid`（OC 详情页画廊图片/视频要求 UUID）
   - background 模块：`background_segments[x].image_url`
     - 支持 URL 或 `image_uuid`

3. **用户 profile 页面**
   - 文件：`src/app/[locale]/(default)/user/[uuid]/page.tsx`
   - 字段：用户头像、用户背景图
   - 支持 URL 或 `image_uuid`

4. **OC Maker 生成**
   - 文件：`src/app/[locale]/(default)/oc-maker/page.tsx`
   - 生成结果写入 `art.gallery[x].url = image_uuid`（非用户上传一律写 uuid）
   - 不直接写入临时 URL

5. **角色详情生成（breakdown-sheet / portrait）**
   - 文件：`src/components/character-detail/CharacterVisualSection.tsx`
   - 生成结果写入 `art.gallery[x].url = image_uuid`（非用户上传一律写 uuid）
   - 具体类型由调用方设置（便于扩展更多 OC 特色图）

## 方案概述（当前设计）

### 1) 资源统一模型（逻辑层）

- 业务层字段统一存 `url`，允许两种值：
  - 真实 URL（用户上传或外链）
  - `image_uuid`（生成图片或需要追踪的上传）
- 例外规则：
  - OC 详情页画廊图片/视频必须使用 `image_uuid`
- 资源解析规则：
  - 若为 URL：直接使用（用户上传）
  - 若为 `image_uuid`：通过统一解析接口获取可用 URL

### 2) 解析与回填链路

- 生成完成：记录 `image_uuid` 与临时 URL
- 后处理完成：写入 R2 地址与多分辨率信息
- 业务读取：
  - 优先返回匹配分辨率 URL
  - 未命中时回退到原图或临时 URL
- 异步补偿：若业务仍存临时 URL，可通过后台任务回填为 `image_uuid`

### 3) 兼容策略

- 现有字段允许 `url` 与 `uuid` 混存，逐步迁移为统一解析逻辑
- 非用户上传统一写入 `image_uuid` 到 `url` 字段
- OC 详情页画廊新增上传需强制生成 `image_uuid`
- 读取逻辑统一封装，避免页面自行拼 URL

## 系统流程（文字版）

1. 生成图片完成，记录 `image_uuid` 与临时 URL
2. 异步任务触发 R2 上传与多分辨率处理
3. 处理完成后写入资源解析表（或 generation 扩展字段）
4. 业务读取时调用解析接口：
   - 返回优先级：R2 多分辨率 > R2 原图 > 临时 URL
5. 对仍存临时 URL 的历史数据触发补偿回填

## 数据模型变更

- 不新增字段，直接复用 `generation_images` 现有的缩略图/原图字段

## API 影响

- 新增轻量解析接口：`GET /api/generation/image-resolve/[uuid]`
  - 输出：当前设备适配 URL + 原图兜底
  - 文档：`docs/2-implementation/api/generation.md`
- 现有接口保留：`GET /api/generation/image/[uuid]`
  - 仅用于需要关联 OC 与复杂权限校验的场景
- 管理工具：继续复用 `docs/2-implementation/api/admin-file-transfer.md`

## 前端影响（方案占位）

- 角色详情页：统一 `resolveImageUrl()` 读取逻辑
- OC 世界观封面：读取 `cover_url` 时支持 `asset_id` / `image_uuid`
- 用户 profile：头像与背景图支持 URL 或 UUID
- OC Maker 生成：写入 `art.gallery[x].url = image_uuid`，不写临时 URL
- 角色详情生成（breakdown-sheet / portrait）：写入 `art.gallery[x].url = image_uuid`，类型由调用方设置

## 迁移与补偿策略

- 扫描业务字段（worlds、characters、profiles），识别临时 URL
- 对可识别的生成图片写回 `image_uuid`（保留 URL 兜底）
- 保留 URL 兜底，确保迁移过程无中断

## 验收标准

- 临时 URL 过期后，OC 世界观封面、角色事件插图、用户头像/背景依然可用
- 所有生成图片可通过轻量解析接口返回设备适配 URL
- 页面只使用解析结果，不直接拼接 R2 或临时 URL

## 变更历史

- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 方案更新（影响：image-resolve 轻量解析/页面读取规则）
- 2026-01-29 FEAT-IMAGE-ASSET-UNIFY 明确 OC 画廊 UUID 必需与用户资料 URL-only（影响：解析/上传口径）
