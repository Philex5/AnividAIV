# Tasks: FEAT-OC-REBUILD（OC 系统重构任务卡）

**Related**:
- 设计：`docs/2-implementation/features/feature-oc-rebuild.md`
- PRD：`docs/1-specs/PRD.md`

## 已完成（确认）
- [x] 数据模型增量变更（`oc_worlds` + `characters.modules/world_uuid/tags/background_url`）：`src/db/migrations/0002_0011_combined.sql`
- [x] 世界观 CRUD + 列表/详情缓存（服务端内存缓存）：`src/services/world.ts`
- [x] Character Modules 服务与 API 接入：`src/services/character-modules.ts`
- [x] OC Maker 首页（搜索框主导 + 快捷选项 + 随机建议 + 手动创建）：`docs/2-implementation/frontend/page-oc-maker-redesign.md`
- [x] 角色详情页（查看/编辑切换 + world 主题 + Tag + 背景 + 分享卡片入口）：`docs/2-implementation/frontend/page-character-detail-redesign.md`
- [x] Tag 系统（规范化 + 预置 + 建议）：`docs/2-implementation/frontend/component-tag-editor.md`
- [x] 分享卡片（OG 图片生成 + 缓存）：`src/app/api/og/character/[uuid]/route.ts`
- [x] 已在 Supabase Dashboard 执行数据迁移 SQL（flat → modules）：`docs/2-implementation/backend/sql/oc-rebuild-characters-data-migration.sql`
- [x] Auth 会话密钥热修复已落地（配置与 Runbook 已更新）：`docs/3-operations/changelog.md`

## 新增任务：FEAT-SHARE-EXPORTS（OC 导出功能）

### 已完成
- [x] 升级 OG API 支持多种模板（TCG/海报/名片）
- [x] 创建导出 API 路由（PDF/JSON/Markdown）
- [x] 创建 ExportDropdown 前端组件
- [x] 升级 ActionBar 集成导出功能
- [x] 升级 ShareMenu 使用新卡片
- [x] 添加国际化配置
- [x] 创建测试用例
- [x] 完善文档和实施报告

### 详细实施清单
参考：`docs/3-operations/tasks/IMPLEMENTATION-REPORT-SHARE-EXPORTS.md`

## 未完成（需要补齐）
- [ ] 数据迁移验证（必须做）：执行验证并归档输出（见下方"迁移验证"）
- [ ] Legacy 扁平字段与索引清理（必须延后到验证完成后）：确认不再读旧字段，再执行 DDL 清理
- [ ] 发布前回归清单（包含 Auth secret smoke + 关键页面访问）
- [ ] 详情页立绘重新生成（拆分任务）
  - [ ] UI：编辑模式在立绘区提供入口（按钮/菜单）与弹窗字段（art_style/aspect_ratio/model/custom_prompt_additions）
  - [ ] API 调用：接入 `POST /api/oc-maker/characters/generate-image`
  - [ ] 状态轮询：接入 `GET /api/generation/status/{generation_uuid}`，处理 pending/processing/completed/failed
  - [ ] 结果选择：展示候选结果列表，用户确认选择 1 张作为当前立绘
  - [ ] 写回：调用 `PUT /api/oc-maker/characters/{uuid}` 写入 `profile_generation_image_uuid`
  - [ ] 验收：刷新页面/切换设备尺寸后立绘一致；失败/超时必须提示（English message）并允许重试
- [ ] 详情页头像生成/替换（拆分任务）
  - [ ] UI：编辑模式头像区域提供操作菜单（Generate from profile / Upload / Crop）
  - [ ] 参考图规则：默认用当前立绘作为 `reference_image_urls[0]`；无立绘时阻止生成并提示（English message）
  - [ ] API 调用：接入 `POST /api/oc-maker/characters/generate-avatar`
  - [ ] 状态轮询：接入 `GET /api/generation/status/{generation_uuid}`
  - [ ] 结果选择：选择 1 张作为当前头像
  - [ ] 写回：调用 `PUT /api/oc-maker/characters/{uuid}` 写入 `avatar_generation_image_uuid`
  - [ ] Upload/Crop：仅预留入口与文案/验收口径，后续单独任务实现（不要假完成）
- [ ] 详情页背景图 AI 生成（拆分任务）
  - [ ] UI：背景设置仅支持图片（不支持纯色/URL）；复用 `src/components/anime-generator/ReferenceImageUpload.tsx`（上传/使用 gallery 图片）
  - [ ] UI：背景设置弹窗增加 "Generate background" tab（输入场景描述 + 风格/比例）
  - [ ] Prompt 模板：在 `src/configs/prompts/` 新增背景生成模板并按变量替换（后续实现任务）
  - [ ] API：新增 `POST /api/oc-maker/characters/generate-background`（返回 `generation_uuid`）
  - [ ] 状态轮询与选择：同上（status → results → 用户选择）
  - [ ] 写回：调用 `PUT /api/oc-maker/characters/{uuid}` 写入 `background_url`（仅图片 URL）
  - [ ] 验收：仅支持（生成/上传/画廊）三种图片来源；失败可重试；不允许静默吞错

## 迁移验证（本次重点）

### 目标（不满足则视为未完成）
- `characters.modules` 无 `NULL`（或仅允许极少数异常并记录 UUID）。
- `characters.world_uuid` 不存在悬空外键。
- `characters.tags` 为 JSON array。

### 执行方式（二选一）
- 方式 A（脚本）：运行 `scripts/verify-migration.ts`，保存输出 JSON。
- 方式 B（Dashboard SQL）：执行 `docs/2-implementation/backend/sql/oc-rebuild-characters-data-migration.sql` 的 “Quick checks” 查询并保存结果。

### 归档要求（必须）
- [ ] 新增报告文件：`tests/test-reports/FEAT-OC-REBUILD-migration-YYYYMMDD.md`（粘贴验证输出/截图与结论）
- [ ] 在 `docs/3-operations/changelog.md` 追加一条 “迁移验证完成” 的记录

## 备注（待确认项）
- `scripts/migrate-characters-to-modules.ts` 仍引用 legacy 字段（例如 `theme_id`）；若后续不再使用脚本迁移，请在任务清理阶段移除或对齐当前 schema。
