# Tasks: FEAT-subscription-world-limit（会员 worlds 数量限制）

**Related**:
- 设计：`docs/2-implementation/features/feature-subscription.md`
- 前端：`docs/2-implementation/frontend/page-world-create.md`
- 后端：`docs/2-implementation/backend/service-world.md`
- 测试：`tests/test-cases/FEAT-subscription-world-limit.md`

## 任务清单
- [ ] 服务端创建世界观校验会员上限（free/basic/plus/pro）
- [ ] API 返回 `LIMIT_EXCEEDED` 并映射 402
- [ ] 前端创建世界观时提示升级文案
- [ ] 会员配置加入 worlds 限制特性
- [ ] 测试用例补齐并通过

## 验收标准
- free/basic/plus/pro 对应限制：3/20/50/无限
- 超出限制时创建失败，返回 402 + `LIMIT_EXCEEDED`
- 前端显示英文错误提示并保留表单数据

## 变更历史
- 2026-01-21 FEAT-subscription-world-limit 初始化任务卡
