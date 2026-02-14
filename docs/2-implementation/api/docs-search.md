**Related**: 文档检索（Fumadocs）

# API 契约：Docs Search

## 当前版本
- Version: v1.0
- Auth: 无
- Errors: 统一英文

## 接口

- GET /api/docs/search
  - 用途：文档站内搜索（基于 fumadocs-core/search/server）
  - Auth: No
  - 位置：`src/app/api/docs/search/route.ts`
  - 说明：内部使用 `createFromSource(source, { language: 'english' })` 生成 GET handler

## 变更历史
- 2025-10-20 v1.0 首次补齐（文档检索）

