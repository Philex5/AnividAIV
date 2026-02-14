# Tasks: FEAT-WORLDS-visibility-level（世界观可见性等级）

**Related**:
- 设计：`docs/2-implementation/features/feature-worlds.md`
- API：`docs/2-implementation/api/world.md`
- 前端：`docs/2-implementation/frontend/page-world-create.md`
- 后端：`docs/2-implementation/backend/service-world.md`
- 测试：`tests/test-cases/FEAT-WORLDS-visibility-level.md`

## 任务清单
- [ ] 数据模型字段从 `visibility` 统一为 `visibility_level`（含迁移与索引）
- [ ] API 支持 `visibility_level` 查询/创建/更新
- [ ] 服务层加入订阅权限校验（私有可见性）
- [ ] 前端创建表单支持可见性选择与订阅限制提示
- [ ] 社区列表仅展示 `public` 世界观
- [ ] 测试用例补齐并通过

## 验收标准
- 非订阅用户创建世界观默认 `public` 且不能设置 `private`
- 订阅用户可将 `visibility_level` 设置为 `private`
- 社区/公开列表仅返回 `visibility_level = public`
- API 在订阅限制时返回 403 + `SUBSCRIPTION_REQUIRED`

## 变更历史
- 2026-01-22 FEAT-WORLDS-visibility-level 初始化任务卡
