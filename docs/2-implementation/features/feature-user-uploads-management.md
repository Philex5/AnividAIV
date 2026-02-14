# Feature: 用户上传资源管理（统一存储与配额）

Related: FEAT-user-uploads

## 背景与目标

当前用户上传的 OC 头像与艺术图通过 OC Maker 流程写入生成记录，但缺少统一的“用户上传资源”分层与统计口径。后续还会新增世界观设定图等类型，需要统一管理、统一统计、并支持按用户等级做配额限制。同时，组件需要支持 UUID 与 URL 双重模式：OC 详情页的头像与画廊图片/视频必须是 UUID；用户头像、用户背景、world 背景支持 UUID 或 URL。

### 目标

- 统一所有**用户主动上传**的素材存储路径，集中到 `uploads/{user_uuid}/` 前缀，便于用量统计与限制。
- 上传资源统一归类为 `user_upload`，通过 `sub_type` 区分场景（oc-avatar / oc-gallery / oc-gallery-video / user-avatar / world-background / user-background 等）。
- 建立可追踪的元数据记录（优先写入 `generations` + `generation_images` / `generation_videos`），支持溯源、审计、配额核算。
- `reference/{user_uuid}` 作为参考图无需处理，不计入配额

### 一期实现目标（Phase 1）

- 仅完成用户上传能力与统一路径落盘，并确保 OC 详情页头像与画廊图片/视频具备 UUID 可追踪。
- 暂不进行配额统计与限制，相关配置与接口预留。

## 验收标准（可测试）

- ✅ 所有新增上传资源均落在 `uploads/{user_uuid}/` 前缀。
- ✅ 上传接口可明确区分资源子类型（sub_type），并返回标准化的资源记录（含 storage_key、size、mime、upload_uuid）。
- ✅ 上传错误信息统一为英文。

## 资源类型与范围

### 当前已支持（sub_type）

- `reference`：生成参考图（不计入用户配额，不生成 UUID）
- `oc-avatar`：OC 详情页头像（生成 UUID）
- `oc-gallery`：OC 详情页上传图（生成 UUID）
- `oc-gallery-video`：OC 详情页上传视频（生成 UUID）
- `user-avatar`：用户头像上传（支持 UUID 或 URL）
- `user-background`：用户资料背景图（支持 UUID 或 URL）
- `world-background`：世界观背景图（支持 UUID 或 URL）

### 未来扩展（预留）
- `scene`：场景设定图
- `other`：临时扩展类型（需配置白名单）

## 存储与路径规划

**统一路径规范：**

```
uploads/{user_uuid}/{asset_type}/{yyyy}/{mm}/{uuid}.{ext}
```

**示例：**

```
uploads/7d4a.../oc-avatar/2026/01/0f6a2cbe.png
uploads/7d4a.../world-setting/2026/01/91c22f43.jpg
```

## 生成记录策略（必须）

- 所有需要 UUID 跟踪的上传（oc-avatar / oc-gallery / oc-gallery-video）必须创建：
  - `generations` 记录（`type=user_upload`）
  - `generation_images` 或 `generation_videos`（`sub_type` 按场景区分）
- `reference` 不创建 generation 记录，仅保存 URL。


## API 方案（建议）

### 上传接口（基于现有 `/api/upload` 扩展）

- `type` 固定为 `user_upload`；`sub_type` 为 `reference` / `oc-avatar` / `oc-gallery` / `oc-gallery-video` / `user-avatar` / `user-background` / `world-background` 等。
- `reference` 不生成 UUID（仅保存 URL）。
- 其他 sub_type 若使用上传文件，则创建 `generations` + `generation_images`（视频则 `generation_videos`），并返回 `upload_uuid`。
- 返回统一结构：`{ url, key, size, mime, upload_uuid }`。

### 查询与配额接口（新增）

- `GET /api/uploads/summary`：返回用户已用容量、配额上限、剩余额度。
- `GET /api/uploads/list`：分页返回用户上传记录（用于管理与回收）。

## 配额与限制策略

- 二期再启用：按用户等级配置配额（建议在 `src/configs/` 下新增 `upload-limits` 配置），仅统计用户上传艺术品类资源（如 `oc-avatar` / `oc-gallery` / `oc-gallery-video`）。
- 二期再启用：限制指标（`size_bytes` 总和 + 单文件大小限制 + 类型白名单）。
- 二期再启用：超限时错误码与文案（英文）`Upload quota exceeded`。

## 影响清单（待补齐）

- 数据模型：`docs/1-specs/data-models.md`（新增 uploads 表）
- API 文档：`docs/2-implementation/api/uploads.md`
- 前端文档：`docs/2-implementation/frontend/component-upload-manager.md`
- 后端文档：`docs/2-implementation/backend/service-upload-manager.md`
- 测试用例：`tests/test-cases/FEAT-user-uploads-*.md`

## 变更历史

- 2026-01-24 FEAT-user-uploads 初始方案（影响：存储/配额/上传接口）
- 2026-01-29 FEAT-user-uploads 区分 UUID 必需场景与 URL-only 场景（影响：上传类型/API/前端）
