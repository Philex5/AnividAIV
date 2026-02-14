**Related**: 账户与登录流程（参考前端 auth 页面与 next-auth 配置）

# API 契约：Authentication

## 当前版本
- Version: v1.0
- Auth: 无（由 NextAuth 内部处理）
- Errors: 统一英文

## 接口列表

- GET /api/auth/[...nextauth]
  - 用途：NextAuth 配置的多提供商登录回调与状态查询端点
  - Auth: 无
  - 说明：由 `@/auth` 暴露的 handlers 统一处理 GET/POST
  - 位置：`src/app/api/auth/[...nextauth]/route.ts`
  - 伪代码：
    ```
    export const { GET, POST } = handlers // next-auth handlers
    ```

- POST /api/auth/[...nextauth]
  - 用途：同上，处理登录/登出/回调等 form/json 请求
  - Auth: 无
  - 位置：`src/app/api/auth/[...nextauth]/route.ts`

## 变更历史
- 2025-10-20 v1.0 首次补齐（列出 NextAuth 统一端点）

