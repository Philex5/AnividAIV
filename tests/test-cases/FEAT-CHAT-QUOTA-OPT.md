# 聊天配额优化功能测试用例 (FEAT-CHAT-QUOTA-OPT)

## 测试概述

本文档包含聊天配额优化功能的完整测试用例，涵盖配额管理、性能测试、数据一致性测试和回归测试。

## 测试环境

- 数据库：PostgreSQL
- Node.js：v18+
- 测试框架：Vitest + HTTP Testing

## 1. 配额管理测试

### 1.1 创建新用户配额记录

**测试场景**：新用户注册后自动创建配额记录

**测试步骤**：
1. 创建新用户
2. 首次获取聊天配额
3. 验证配额记录正确创建

**预期结果**：
- ✅ 自动创建配额记录
- ✅ 配额值等于会员等级对应值
- ✅ 重置时间设为下月1号

**代码位置**：`src/services/chat/chat-quota-service.ts` - `createInitialQuota`

### 1.2 会员升级更新配额

**测试场景**：用户升级会员时配额实时更新

**测试步骤**：
1. 用户从 Free 升级到 Basic
2. 检查配额更新

**预期结果**：
- ✅ 配额值更新为 Basic 对应值（500 AP）
- ✅ 重置时间保持不变

**代码位置**：`src/services/chat/chat-quota-service.ts` - `updateQuotaForMembership`

### 1.3 月度配额重置

**测试场景**：每月1号自动重置配额

**测试步骤**：
1. 模拟时间到下月1号
2. 调用重置接口
3. 验证配额重置

**预期结果**：
- ✅ `monthly_used` 重置为 0
- ✅ `monthly_quota` 更新为当前会员等级值
- ✅ `quota_reset_at` 更新为下月1号

**代码位置**：`src/services/chat/chat-quota-service.ts` - `resetMonthlyQuota`

### 1.4 配额用完时发送消息

**测试场景**：月度配额已用完仍尝试发送消息

**测试步骤**：
1. 将用户配额设为已用完
2. 尝试发送聊天消息

**预期结果**：
- ✅ 返回 QUOTA_EXCEEDED 错误
- ✅ 显示升级提示对话框

**代码位置**：`src/services/chat/chat-service.ts` - `sendMessageStream`

## 2. 性能测试

### 2.1 并发用户测试

**测试场景**：1000 并发用户发送消息

**测试步骤**：
```bash
# 使用 artillery 或 JMeter 进行压力测试
artillery run tests/load/chat-quota-load-test.yml
```

**预期结果**：
- ✅ 无性能下降
- ✅ 所有请求在 200ms 内响应
- ✅ 配额扣减准确无误

**监控指标**：
- API 响应时间：< 200ms
- 数据库查询时间：< 20ms
- 错误率：< 0.1%

### 2.2 频繁刷新配额

**测试场景**：用户频繁查询配额信息

**测试步骤**：
1. 连续 100 次请求配额查询 API
2. 测量响应时间

**预期结果**：
- ✅ 平均响应时间 < 50ms
- ✅ 95% 请求 < 100ms

**代码位置**：`src/app/api/chat/quota/route.ts`

## 3. 数据一致性测试

### 3.1 部分失败场景

**测试场景**：AI 生成失败时配额回滚

**测试步骤**：
1. 发送聊天消息
2. 模拟 AI 调用失败

**预期结果**：
- ✅ 配额不扣减（因为在成功后才扣减）
- ✅ 无需退款操作

**代码位置**：`src/services/chat/chat-service.ts` - `sendMessageStream`

### 3.2 月度最后一天发送消息

**测试场景**：配额重置边界条件

**测试步骤**：
1. 模拟时间在月末最后一天
2. 发送消息
3. 验证使用记录正确

**预期结果**：
- ✅ 消息正确记录到当前月配额
- ✅ 不影响下月配额

### 3.3 会员降级

**测试场景**：用户从 Pro 降级到 Plus

**测试步骤**：
1. 用户当前为 Pro（5000 AP 配额，已用 1000）
2. 降级到 Plus（1500 AP 配额）
3. 验证配额逻辑

**预期结果**：
- ✅ 当前月已使用量保持不变（1000 AP）
- ✅ 下月配额为 1500 AP
- ✅ 用户仍可用剩余的 500 AP

## 4. 回归测试

### 4.1 现有聊天功能不受影响

**测试步骤**：
1. 发送普通聊天消息
2. 查看聊天历史
3. 创建新会话

**预期结果**：
- ✅ 聊天功能正常工作
- ✅ 消息正确保存
- ✅ 会话管理正常

### 4.2 积分系统不受影响

**测试步骤**：
1. 使用积分系统生成图片
2. 检查积分余额

**预期结果**：
- ✅ 图片生成功能正常
- ✅ 积分扣减正确
- ✅ 积分和聊天配额完全分离

### 4.3 会员升级/降级流程正常

**测试步骤**：
1. 升级会员等级
2. 验证权限更新
3. 降级会员等级

**预期结果**：
- ✅ 会员权限正确更新
- ✅ 配额随之调整
- ✅ 支付流程正常

### 4.4 管理员后台数据统计准确

**测试步骤**：
1. 查看管理员后台
2. 检查用户配额使用统计

**预期结果**：
- ✅ 数据统计准确
- ✅ 报表生成正常
- ✅ 导出功能正常

## 5. 定时任务测试

### 5.1 配额重置任务

**测试步骤**：
1. 手动触发重置任务
2. 检查重置结果

**预期结果**：
- ✅ 正确重置过期配额
- ✅ 返回重置数量统计
- ✅ 错误处理正确

**API 路径**：`POST /api/chat/quota/reset`

### 5.2 健康检查

**测试步骤**：
1. 调用健康检查接口

**预期结果**：
- ✅ 返回健康状态
- ✅ 包含最近重置统计

**API 路径**：`GET /api/chat/quota/reset`

## 6. 前端组件测试

### 6.1 配额显示组件

**测试步骤**：
1. 打开聊天页面
2. 查看配额显示

**预期结果**：
- ✅ 正确显示当前配额使用情况
- ✅ 进度条准确反映使用比例
- ✅ 重置时间正确显示

**代码位置**：`src/components/chat/ChatQuotaDisplay.tsx`

### 6.2 配额不足提示

**测试步骤**：
1. 配额用完后尝试发送消息

**预期结果**：
- ✅ 显示升级对话框
- ✅ 推荐合适的订阅计划
- ✅ 点击升级按钮跳转到定价页

**代码位置**：`src/components/chat/QuotaExceededDialog.tsx`

### 6.3 配额刷新

**测试步骤**：
1. 点击配额显示的刷新按钮

**预期结果**：
- ✅ 数据重新加载
- ✅ 显示加载状态
- ✅ 错误时显示重试按钮

## 7. 边界条件测试

### 7.1 数据库连接失败

**测试步骤**：
1. 断开数据库连接
2. 尝试获取配额

**预期结果**：
- ✅ 返回 500 错误
- ✅ 错误信息清晰
- ✅ 无内存泄漏

### 7.2 用户 UUID 无效

**测试步骤**：
1. 使用无效 UUID 请求配额

**预期结果**：
- ✅ 返回 401 未授权错误
- ✅ 不暴露敏感信息

### 7.3 配额数值异常

**测试场景**：数据库中配额数据被意外修改

**测试步骤**：
1. 手动修改数据库中配额值
2. 请求配额信息

**预期结果**：
- ✅ 正确处理负值情况
- ✅ 正确处理超大值
- ✅ 不影响系统稳定性

## 8. 安全测试

### 8.1 权限控制

**测试步骤**：
1. 未登录用户请求配额 API
2. A 用户请求 B 用户的配额

**预期结果**：
- ✅ 未登录返回 401
- ✅ 跨用户访问返回 403

### 8.2 定时任务安全

**测试步骤**：
1. 无 Token 调用重置 API
2. 使用错误 Token 调用

**预期结果**：
- ✅ 返回 401 未授权
- ✅ 不执行重置操作

## 执行测试

### 单元测试
```bash
cd /home/cstor/wufei/AIProjs/AnividAI-main
pnpm test chat-quota-service
```

### API 测试
```bash
# 使用 REST Client 或 Newman
newman run tests/api-tests/chat-quota.postman_collection.json
```

### 集成测试
```bash
pnpm test:integration
```

## 测试数据准备

```sql
-- 创建测试用户
INSERT INTO users (uuid, email, membership_level, is_sub, created_at)
VALUES ('test-user-1', 'test1@example.com', 'free', false, NOW());

-- 创建配额记录
INSERT INTO chat_quotas (user_uuid, membership_level, monthly_quota, monthly_used, quota_reset_at)
VALUES ('test-user-1', 'free', 100, 50, DATE_TRUNC('month', NOW()) + INTERVAL '1 month');

-- 模拟已用完配额的用户
INSERT INTO chat_quotas (user_uuid, membership_level, monthly_quota, monthly_used, quota_reset_at)
VALUES ('test-user-2', 'free', 100, 100, DATE_TRUNC('month', NOW()) + INTERVAL '1 month');
```

## 测试报告模板

```markdown
## 测试执行报告

**测试时间**：2025-11-19
**测试人员**：[Name]
**测试环境**：[Environment]

### 测试结果统计
- 总用例数：XX
- 通过：XX
- 失败：XX
- 通过率：XX%

### 性能指标
- API 平均响应时间：XX ms
- 数据库查询时间：XX ms
- 并发处理能力：XX QPS

### 发现的缺陷
[List any bugs found]

### 建议
[List any recommendations]
```

## 验收标准

- [ ] 所有配额管理测试用例通过
- [ ] 性能测试满足要求（< 200ms 响应时间）
- [ ] 数据一致性测试通过
- [ ] 回归测试无问题
- [ ] 定时任务正常运行
- [ ] 前端组件功能正常
- [ ] 边界条件测试通过
- [ ] 安全测试通过

## 相关文档

- 设计文档：`docs/2-implementation/features/feature-chat-quota-optimization.md`
- API 文档：`docs/2-implementation/api/chat.md`
- 数据库文档：`docs/1-specs/data-models.md`

---

**关联需求**：FEAT-CHAT-QUOTA-OPT（聊天配额优化）
**优先级**：高
**测试类型**：功能测试、性能测试、安全测试、回归测试
