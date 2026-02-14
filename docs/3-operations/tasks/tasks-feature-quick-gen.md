# 任务卡：FEAT-QUICK-GEN 快速生成 OC（一句话生成）

- 验收标准：docs/2-implementation/features/feature-oc-maker.md（快速生成模式设计 FEAT-QUICK-GEN）
- 设计：docs/2-implementation/features/feature-oc-maker.md
- API：docs/2-implementation/api/oc-maker.md（quick-generate）
- 后端：docs/2-implementation/backend/service-oc-maker.md（QuickGeneration Service）
- 前端：docs/2-implementation/frontend/page-oc-maker.md（生成方式说明）
- 测试：tests/test-cases/FEAT-QUICK-GEN-quick-generation.md

## 任务拆解

- [ ] 新增 `POST /api/oc-maker/quick-generate`（鉴权 + 入参校验 + 错误码）
- [ ] 新增 `QuickGenerationService`（LLM 解析 + 字段补全 + credit 扣费 + 创建角色 + 可选自动生图）
- [ ] 新增前端 `QuickGenerationPanel` 并接入 `QuickCreationHero` / `OCMakerProvider`（生成后跳转到 `/characters/{uuid}?mode=edit`）
- [ ] 新增页面级 i18n：`src/i18n/pages/oc-maker/*` 的 quick_gen 文案
- [ ] 校验与回归（至少覆盖：未登录、余额不足、LLM JSON 解析失败、自动生图失败）

## 变更历史
- 2026-01-04 FEAT-QUICK-GEN 初始化任务卡（影响：API/服务/前端组件/页面 i18n）
