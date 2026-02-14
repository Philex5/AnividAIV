# Test Cases: FEAT-subscription-world-limit

**关联需求**: FEAT-subscription（会员权益 - worlds 数量限制）

## 用例 1：主路径（免费用户达到上限）
- 前置条件：free 用户已有 3 个自定义 world
- 操作：在 `/worlds/create` 提交创建
- 预期结果：
  - API 返回 402 + `LIMIT_EXCEEDED`
  - 前端提示英文错误文案（示例：`World limit reached for your current plan. Upgrade to create more worlds.`）
  - 表单数据不丢失

## 用例 2：边界路径（basic 用户可创建第 20 个）
- 前置条件：basic 用户已有 19 个自定义 world
- 操作：创建新 world
- 预期结果：
  - 创建成功，返回新 world
  - 用户总数变为 20

## 用例 3：回归路径（pro 不限数量）
- 前置条件：pro 用户已有 50+ 个自定义 world
- 操作：继续创建新 world
- 预期结果：
  - 创建成功
  - 未触发 `LIMIT_EXCEEDED`
