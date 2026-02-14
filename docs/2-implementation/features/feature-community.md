# Feature: 社区资源展示与 gen_type 白名单

Related: FEAT-community

## 背景与目标

社区列表已有一级类型筛选（OC/Image/Video），为避免每新增一种 gen_type 都要修改多处逻辑，展示侧改为“白名单配置驱动”。社区仅展示白名单内的 gen_type，并将筛选与展示口径统一到配置文件中。

## 验收标准

- 社区列表仅展示白名单配置允许的 gen_type。
- gen_type Badge 列表来源于白名单配置（而非硬编码）。
- `gen_types` 仅允许白名单内的值；非法值忽略，不返回 400。
- Badge 样式与主题一致，动画过渡自然且响应式布局不破版。

## 系统级流程（文字版）

1. 用户在 Community 页选择一级类型（image/oc/video）。
2. 前端读取白名单配置，展示对应 gen_type Badge。
3. 列表展示仅保留白名单内的资源（同场景、同大类）。
4. 用户选择 Badge 时，仅在白名单内做过滤与 URL 同步。
5. 服务层按白名单与可选 gen_types 过滤结果集合。

## 影响清单

- 配置：src/configs/gen-type-display.ts
- API：docs/2-implementation/api/community.md
- 数据模型：无新增字段，OC 通过 `generation_images.gen_type` 补齐
- 前端：docs/2-implementation/frontend/page-community.md
- 后端：docs/2-implementation/backend/service-community-view.md
- 测试：tests/test-cases/FEAT-community-gen-types.md

## 测试要点与用例索引

- 参见 tests/test-cases/FEAT-community-gen-types.md

## 变更历史

- 2025-01-24 FEAT-community 新增 gen_type 二级分类筛选（影响：API/页面/服务）
- 2025-11-20 FEAT-community 切换为 gen_type 白名单配置驱动展示（影响：配置/API/页面）
