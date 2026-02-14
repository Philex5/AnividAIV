# API 文档总览

本文档目录包含 AnividAI 项目的完整 API 契约。

## 文档结构

### 核心模块

- **user.md** - 用户管理 API（用户信息、积分、会员状态）
- **anime-generation.md** - 动漫图片生成 API
- **anime-video.md** - 动漫视频生成 API
- **generation.md** - 生成服务通用 API（状态查询、Webhook）
- **chat.md** - 聊天 API（与角色对话）
- **oc-maker.md** - OC Maker API（角色创建与管理）
- **community.md** - 社区作品 API
- **characters.md** - 角色资源 API（头像、立绘等）
- **artworks.md** - 作品管理 API（我的作品、收藏）

### 功能模块

- **admin.md** - 管理员后台 API（用户分析、生成管理、收入统计）
- **admin-file-transfer.md** - 管理员文件转存 API（R2 存储管理）
- **admin-manager-system.md** - 管理员系统管理 API
- **payments.md** - 支付 API（Stripe、Creem）
- **subscriptions.md** - 订阅管理 API（订阅、取消、退款）
- **membership.md** - 会员系统 API（会员等级、权益）
- **auth.md** - 认证 API
- **upload.md** - 文件上传 API
- **download.md** - 文件下载 API（图片、视频）
- **emails.md** - 邮件发送 API
- **feedback.md** - 反馈 API
- **demo.md** - 演示 API
- **docs-search.md** - 文档搜索 API

### 业务系统

- **affiliate.md** - 邀请返利系统 API
- **oc-apps.md** - OC 应用工具 API（手办生成等）
- **export.md** - OC 导出 API（卡片生成、PDF、JSON、Markdown 导出）

## API 统计

- **总计**: 94+ API 端点
- **业务域**: 15 个主要业务域
- **文档文件**: 25 个 API 文档

## API 设计规范

### 认证与授权
- **认证**: 所有用户 API 需要登录认证（基于 NextAuth 会话）
- **管理员**: 部分管理 API 需要管理员权限（通过 ADMIN_EMAILS 校验）
- **公开 API**: 部分社区、文档 API 支持匿名访问

### 请求与响应
- **请求格式**: `Content-Type: application/json`
- **响应格式**: 统一响应格式 `{ success: boolean, data: any, error?: string }`
- **错误信息**: 统一使用英文错误信息
- **日期格式**: ISO 8601 格式（`2025-10-30T10:00:00.000Z`）

### 版本管理
- **当前版本**: 所有 API 默认为 v1.0
- **版本策略**: URL 不包含版本号，通过文档变更历史追踪
- **Breaking Changes**: 重大变更时创建新端点或新参数，保持向后兼容

### 分页规范
- **Query Parameters**:
  - `page`: 页码，从 1 开始
  - `limit`: 每页数量，默认 20，最大 100
- **Response**:
  ```json
  {
    "items": [...],
    "total": 150,
    "page": 1,
    "limit": 20,
    "has_more": true
  }
  ```

### 频率限制
- **用户 API**: 单用户每分钟 60 次请求
- **管理 API**: 单管理员每分钟 120 次请求
- **公开 API**: 单 IP 每分钟 30 次请求
- **超限响应**: `429 Too Many Requests`

## 常用状态码

- `200` - 成功
- `201` - 创建成功
- `204` - 无内容（操作成功但无返回）
- `400` - 参数错误
- `401` - 未认证
- `403` - 权限不足
- `404` - 资源不存在
- `409` - 冲突（如重复创建）
- `429` - 频率限制
- `500` - 服务器内部错误
- `503` - 服务不可用

## 错误响应格式

```json
{
  "error": "Invalid parameters",
  "code": "ERR_INVALID_PARAMS",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

## 数据流架构

```
[前端] → [API Routes] → [Services] → [Models] → [Database]
                ↓
           [External APIs]
           (KieAI, Stripe, Resend)
```

## 相关文档

- **数据模型**: `docs/1-specs/data-models.md`
- **架构设计**: `docs/1-specs/architecture.md`
- **前端实现**: `docs/2-implementation/frontend/`
- **后端实现**: `docs/2-implementation/backend/`

## 变更历史

- 2026-01-23 FEAT-SHARE-EXPORTS 新增 OC 导出 API：支持卡片生成、PDF、JSON、Markdown 导出
- 2025-11-12 补充订阅、会员、作品、下载、邮件、文件转存等 API 文档，优化文档结构
- 2025-11-06 文档结构优化，移除过时内容
- 2025-10-31 管理员系统 API 完善
- 2025-10-27 聊天 API 新增
- 2025-10-20 初始版本发布
