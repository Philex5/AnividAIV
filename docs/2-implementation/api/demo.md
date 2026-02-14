**Related**: Demo 演示接口（文本/流式/图片/邮件）

# API 契约：Demo

## 当前版本
- Version: v1.0
- Auth: 无特别要求（建议仅在开发/内网使用）
- Errors: 统一英文

## 文本生成

- POST /api/demo/gen-text
  - 用途：调用多提供商文本模型生成（可附加推理内容）
  - 位置：`src/app/api/demo/gen-text/route.ts`
  - Body: `{ prompt, provider, model }`
  - Response: `{ text, reasoning }`

- POST /api/demo/gen-stream-text
  - 用途：流式文本生成，支持推理内容 `sendReasoning: true`
  - 位置：`src/app/api/demo/gen-stream-text/route.ts`

## 图片生成

- POST /api/demo/gen-image
  - 用途：多提供商图片生成（OpenAI/Replicate/Kling），并上传到 R2
  - 位置：`src/app/api/demo/gen-image/route.ts`
  - Response: 上传结果列表（包含 provider、文件名、URL）

## 邮件发送

- POST /api/demo/send-email
  - 用途：Resend 邮件发送
  - 位置：`src/app/api/demo/send-email/route.ts`
  - Body: `{ emails: string[], subject, content }`

## 变更历史
- 2025-10-20 v1.0 首次补齐（文本/流式/图片/邮件）

