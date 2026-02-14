# 主立绘管理（FEAT-primary-portrait）

Related: FEAT-OC-REBUILD | [feature-oc-rebuild.md](./feature-oc-rebuild.md)

## 背景与目标

当前 OC 生成多张立绘时会覆盖 `profile_generation_image_uuid`，导致用户无法明确控制“主立绘”。本方案确保主立绘可控、默认合理、删除可回退，并与画廊存储结构一致。对外文案不再使用 portrait，统一为 **Full-body Key Art**。组件层支持 UUID 与 URL 双模式，但主立绘与 OC 详情页头像均要求 UUID 可追踪。

## 验收标准

- 新生成立绘不会自动覆盖主立绘；仅进入 `modules.art.gallery` 列表
- 主立绘可从任意画廊图片中选择且全局单选（仅 OC 详情页画廊，要求 UUID）
- 未显式选择时，默认使用排序第一张图片作为主立绘
- 删除主立绘时弹出提示；若仍有图片自动补位，否则等待新生成图片
- 上传新增不需要指定 portrait 类型，统一为 user upload

## 系统级流程（文字版）

1. 用户新增图片（生成/上传/从作品集选择）→ 写入 `modules.art.gallery`
2. 若是首张图片 → 自动设置为主立绘（写入 `profile_generation_image_uuid`）
3. 用户在编辑列表选择 primary → 更新 `profile_generation_image_uuid`
4. 删除 primary → 弹窗确认 → 自动改用下一张图片或清空 primary

## 影响清单

- 数据模型：`docs/1-specs/data-models.md`
- OC 数据模板：`docs/1-specs/oc-data-template.md`
- 前端页面：`docs/2-implementation/frontend/page-character-detail-redesign.md`
- API 文档（复用，无新增）：`docs/2-implementation/api/characters.md`
- 测试用例：`tests/test-cases/FEAT-primary-portrait.md`
- 任务卡：`docs/3-operations/tasks/tasks-feature-primary-portrait.md`

## 当前方案

### 主立绘定义与默认规则

- `profile_generation_image_uuid` 指向 `modules.art.gallery` 中任意条目（与类型无关，必须是 UUID）
- 无手动选择时，默认取排序第一张图片
- 当画廊为空：`profile_generation_image_uuid` 为空，等待下一次图片新增

### 删除与回退

- 删除 primary 前必须提示影响
- 删除后若仍有图片：自动选择第一张作为 primary

### 上传类型归类

- 上传统一为 `type=user_upload`，不再要求指定 portrait
- 主立绘与类型解耦：用户可将任意图片设为 primary（仅 OC 详情页画廊图片，必须有 UUID）

### 对外展示口径

- 对外只展示 **Full-body Key Art** badge
- `portrait` 不作为对外文案与标签展示
- 且全局仅允许一个 primary

## 变更历史

- 2026-01-28 FEAT-primary-portrait 初版方案（影响：文档/前端交互/测试）
- 2026-01-29 FEAT-primary-portrait 主图允许任意画廊选择与 UUID 约束（影响：交互/文案/上传）
