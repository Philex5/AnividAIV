**Related**: 邀请/返利系统

# API 契约：Affiliate / Invite

## 当前版本
- Version: v1.0
- Auth: 视接口而定
- Errors: 统一英文

## 接口列表

- POST /api/update-invite
  - 用途：为指定用户设置邀请人（被邀请关系建立）
  - Auth: 无（参数带 user_uuid）；服务端进行参数与用户校验
  - 位置：`src/app/api/update-invite/route.ts`
  - Request: `{ invite_code, user_uuid }`
  - Response: 更新后的用户信息
  - 错误：`invalid params | invite user not found | user not found | can't invite yourself | user already has invite user | update invited by failed`

- POST /api/update-invite-code
  - 用途：当前登录用户设置/更新自己的邀请码
  - Auth: Required
  - 位置：`src/app/api/update-invite-code/route.ts`
  - Request: `{ invite_code }`
  - 限制：长度 2~16；唯一性校验
  - 错误：`no auth | invalid invite code | invite code already exists | invalid user`

## 伪代码（示例）
```
POST /update-invite:
  assert(invite_code, user_uuid)
  inviter = findUserByInviteCode(invite_code)
  user = findUserByUuid(user_uuid)
  guard: not self, only once
  update user.invited_by = inviter.uuid
  insert affiliate pending record
```

## 变更历史
- 2025-10-20 v1.0 首次补齐（邀请绑定与邀请码）

