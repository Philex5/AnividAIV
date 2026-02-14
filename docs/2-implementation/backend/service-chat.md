# Chat Service 后端服务

Related: FEAT-CHAT

## 概述

Chat Service 负责处理角色聊天的核心业务逻辑，包括消息发送、上下文管理、LLM调用、积分扣费等功能。

## 服务架构

### 目录结构
```
src/services/chat/
├── chat-service.ts              # 核心聊天服务类
├── chat-context-manager.ts      # 上下文管理(滑动窗口)
├── chat-prompt-builder.ts       # 角色提示词构建
└── chat-archive-service.ts      # 历史消息归档服务
```

## 核心服务

### ChatService
- **位置**: `src/services/chat/chat-service.ts`
- **职责**: 消息发送流程编排、角色权限验证、积分扣费与会话管理

#### 核心方法

- `sendMessage()` - 发送消息（非流式，同步返回完整响应）
- `checkChatLimits()` - 检查聊天限制
- `validateModelPermission()` - 验证模型使用权限

#### 发送消息流程

1. **验证角色访问权限**
   - 检查角色是否存在
   - 私有角色仅所有者可访问

2. **扣费处理**
   - 预扣除 1 MC
   - 失败时自动退款

3. **会话管理**
   - 获取或创建会话
   - 保存用户消息

4. **上下文处理**
   - 获取上下文历史（滑动窗口）
   - 构建角色系统提示词

5. **LLM 调用**
   - 调用 XiaoJingAI LLM
   - 等待完整响应返回

6. **结果保存**
   - 保存 AI 回复
   - 更新会话元数据
   - 返回完整响应JSON

### ChatContextManager
- **位置**: `src/services/chat/chat-context-manager.ts`
- **职责**: 上下文管理，支持滑动窗口机制
- **特点**: 自动截断超过限制的历史消息，保留最近的上下文

### ChatPromptBuilder
- **位置**: `src/services/chat/chat-prompt-builder.ts`
- **职责**: 构建角色专用提示词
- **功能**:
  - 整合角色背景信息
  - 添加用户交互历史
  - 应用聊天配置

### ChatArchiveService
- **位置**: `src/services/chat/chat-archive-service.ts`
- **职责**: 历史消息归档管理
- **功能**:
  - 将超长对话归档到 R2
  - 恢复归档消息
  - 导出聊天记录

## 积分扣费机制

- **扣费规则**: 每次对话固定消耗 1 MC
- **扣费时机**: 发送消息前预扣
- **退款机制**: LLM调用失败时自动退还
- **扣费类型**: `CreditsTransType.ChatWithOC`
- **退款类型**: `CreditsTransType.ChatRefund`

## API 端点

- `POST /api/chat/send-message` - 发送消息（同步JSON响应）
- `GET /api/chat/history` - 获取聊天历史
- `GET /api/chat/sessions` - 获取会话列表
- `POST /api/chat/sessions/create` - 创建会话
- `GET /api/chat/config` - 获取聊天配置

## 错误处理

- `UNAUTHORIZED` (401): 用户未登录
- `VALIDATION_ERROR` (400): 参数验证失败
- `INSUFFICIENT_CREDITS` (402): 积分不足
- `FORBIDDEN` (403): 权限不足
- `LLM_SERVICE_UNAVAILABLE` (503): LLM服务不可用

## 集成说明

支持多种LLM提供方，集成统一的积分系统、用户权限系统，采用同步JSON响应，简化前端处理逻辑。

## 变更历史
- 2025-10-27 FEAT-CHAT 初始版本
- 2025-11-21 FEAT-CHAT 通信方式变更：从流式SSE改为同步JSON响应
