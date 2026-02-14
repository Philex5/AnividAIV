**Related**: 用户反馈

# API 契约：Feedback

## 当前版本
- Version: v1.0
- Auth: 需要登录
- Errors: 统一英文

## 接口

- POST /api/add-feedback
  - 用途：添加用户反馈（文本 + 评分）
  - Auth: Required
  - 位置：`src/app/api/add-feedback/route.ts`
  - Body: `{ content: string, rating?: number }`
  - Response: 入库后的反馈对象
  - 错误：`invalid params | add feedback failed | User not authenticated`
  - 伪代码：
    ```
    assert(auth)
    assert(content)
    insertFeedback({ user_uuid, content, rating })
    return feedback
    ```

## 变更历史
- 2025-10-20 v1.0 首次补齐（新增反馈）

