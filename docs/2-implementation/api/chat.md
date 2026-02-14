**Related**: feature-chat-with-oc

# API 契约：Chat with OC

## 当前版本
- Version: v1.0
- Auth: 需要登录
- Errors: 统一英文

## 接口列表

### 1. 发送消息
- **Endpoint**: `POST /api/chat/send-message`
- **用途**: 向角色发送消息并获取AI回复（流式响应）
- **Auth**: Required
- **文件位置**: `src/app/api/chat/send-message/route.ts`
- **Request**:
  ```json
  {
    "character_uuid": "角色UUID",
    "session_id": "会话UUID（可选）",
    "message": "消息内容",
    "stream": true
  }
  ```
- **Response**: Server-Sent Events (SSE) 流式响应
  ```
  event: message
  data: {"type":"token","content":"回复内容"}

  event: message
  data: {"type":"done","session_id":"xxx","message_uuid":"yyy","tokens_used":120,"credits_deducted":1}
  ```
- **积分**: 每次对话消耗 1 MC

### 2. 获取聊天历史
- **Endpoint**: `GET /api/chat/history`
- **用途**: 获取指定会话的历史消息记录
- **Auth**: Required
- **文件位置**: `src/app/api/chat/history/route.ts`
- **Query Parameters**:
  - `session_id`: 会话ID（必填）
  - `limit`: 返回数量（默认50，最大200）
  - `offset`: 分页偏移（默认0）
  - `order`: 排序方向（默认'asc'）

### 3. 获取会话列表
- **Endpoint**: `GET /api/chat/sessions`
- **用途**: 获取用户的所有聊天会话列表
- **Auth**: Required
- **文件位置**: `src/app/api/chat/sessions/route.ts`
- **Query Parameters**:
  - `character_uuid`: 筛选特定角色（可选）
  - `limit`: 返回数量（默认20，最大100）
  - `offset`: 分页偏移（默认0）
  - `order_by`: 排序字段（默认'updated'）

### 4. 创建新会话
- **Endpoint**: `POST /api/chat/sessions/create`
- **用途**: 显式创建新会话
- **Auth**: Required
- **文件位置**: `src/app/api/chat/sessions/create/route.ts`
- **Request**:
  ```json
  {
    "character_uuid": "角色UUID",
    "title": "会话标题（可选）"
  }
  ```

### 5. 获取聊天配置
- **Endpoint**: `GET /api/chat/config`
- **用途**: 获取当前用户的聊天限制配置（根据会员等级）
- **Auth**: Required
- **文件位置**: `src/app/api/chat/config/route.ts`

## 错误码
- `UNAUTHORIZED` (401): 用户未登录
- `VALIDATION_ERROR` (400): 参数验证失败
- `INSUFFICIENT_CREDITS` (402): 积分不足
- `FORBIDDEN` (403): 权限不足
- `RATE_LIMIT_EXCEEDED` (429): 频率限制
- `LLM_SERVICE_UNAVAILABLE` (503): LLM服务不可用

## 变更历史
- 2025-10-27 FEAT-CHAT 初始版本
