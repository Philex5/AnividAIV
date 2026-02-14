# AnividAI 测试方案

## 测试理念

作为独立开发者项目，测试方案需要简单实用、易于执行。本测试方案包含两类测试：

1. **API 测试** - 验证所有 API 端点的功能正确性
2. **场景测试** - 验证核心业务流程的端到端功能

## 目录结构

```
tests/
├── README.md                           # 本文件 - 测试方案总览
├── api-tests/                          # API 测试
│   ├── README.md                      # API 测试说明
│   ├── export.http                    # 导出 API
│   ├── user-membership.http           # 用户与会员 API
│   ├── anime-generation.http          # 动漫图片生成 API
│   ├── video-generation.http          # 视频生成 API
│   ├── oc-maker.http                  # OC Maker API
│   ├── oc-apps.http                   # Studo Tools API
│   ├── chat-quota.http                # 聊天配额 API
│   ├── social-community.http          # 社交与社区 API
│   ├── payments-subscriptions.http    # 支付与订阅 API
│   ├── admin.http                     # 管理后台 API
│   ├── basic-services.http            # 基础服务 API
│   ├── incentives.http                # 用户激励 API
│   ├── worlds.http                    # 世界设定 API
│   └── test-results/                  # 测试结果记录
│       └── template.md                # 结果记录模板
└── scenario-tests/                     # 场景测试
    ├── README.md                      # 场景测试说明
    ├── ai-anime-generator.md          # AI 动漫生成器测试（12 场景）
    ├── ai-video-generator.md          # AI 视频生成器测试（10 场景）
    ├── oc-maker.md                    # OC 创建器测试（7 场景）
    ├── oc-apps.md                     # OC 应用测试（3 场景：手办、贴纸、Prompt）
    ├── worlds.md                      # 世界设定测试（3 场景）
    ├── roadmap-and-incentives.md       # 路线图与激励测试（3 场景）
    ├── chat.md                        # 聊天测试（10 场景）
    ├── community.md                   # 社区测试（10 场景）
    ├── payments.md                    # 支付流程测试（12 场景）
    └── test-results/                  # 测试结果记录
        └── template.md                # 结果记录模板
```

## 测试类型说明

### 1. API 测试

**目标**: 验证所有 API 端点的基本功能、错误处理、权限控制

**工具**: VSCode REST Client 扩展（使用 .http 文件）

**覆盖范围**:

- 84+ API 端点
- 14 个业务域（用户、生成、社区、支付、管理等）
- 认证、权限、参数验证、错误处理

**执行方式**:

```bash
# 安装 VSCode REST Client 扩展
# 打开 tests/api-tests/test-collection.http
# 点击请求上方的 "Send Request" 按钮执行
```

**详细说明**: 查看 [api-tests/README.md](./api-tests/README.md)

### 2. 场景测试

**目标**: 验证核心业务流程的完整性和用户体验

**工具**: 手动测试 + 测试检查清单

**覆盖范围**:

- AI 动漫生成器（12 个场景）
- AI 视频生成器（10 个场景）
- OC Maker（15 个场景）
- 聊天系统（10 个场景）
- 社区互动（10 个场景）
- 支付流程（12 个场景）

**执行方式**:

```bash
# 启动开发服务器
pnpm dev

# 按照场景文档中的测试步骤操作
# 勾选完成的测试项
# 记录发现的问题
```

**详细说明**: 查看 [scenario-tests/README.md](./scenario-tests/README.md)

## 快速开始

### 环境准备

1. **启动服务**:

   ```bash
   pnpm dev
   ```

2. **准备测试账号**:
   - 普通用户账号
   - VIP 用户账号
   - 管理员账号

3. **安装工具**:
   - VSCode REST Client 扩展（API 测试）

### 执行 API 测试

1. 打开 `tests/api-tests/test-collection.http`
2. 根据需要修改测试数据（如 user_uuid, generation_uuid 等）
3. 点击请求上方的 "Send Request" 按钮执行
4. 验证响应结果
5. 记录测试结果到 `api-tests/test-results/YYYYMMDD-api-test.md`

### 执行场景测试

1. 选择要测试的场景（如 `scenario-tests/ai-anime-generator.md`）
2. 按照文档中的测试步骤操作
3. 勾选完成的测试项 `[ ]` → `[x]`
4. 记录发现的问题到 `scenario-tests/test-results/YYYYMMDD-scenario-test.md`

## 测试策略

### 何时执行测试

| 时机               | 测试类型       | 范围                |
| ------------------ | -------------- | ------------------- |
| **每日开发后**     | API 测试       | 相关修改的 API      |
| **功能完成后**     | 场景测试       | 相关功能场景        |
| **发版前**         | API + 场景测试 | 完整的 P0 + P1 测试 |
| **生产问题修复后** | 回归测试       | 相关功能的完整测试  |

### 优先级

#### P0 - 必测（阻塞发布）

- ✅ 支付流程（购买积分、订阅）
- ✅ 生成任务创建和状态查询
- ✅ 用户认证和授权
- ✅ 积分扣减和退款

#### P1 - 重点测试（影响核心功能）

- ✅ 社区互动（点赞、收藏、分享）
- ✅ OC Maker 完整流程
- ✅ 聊天系统
- ✅ 生成历史和结果操作

#### P2 - 常规测试（优化项）

- ✅ 管理后台
- ✅ 文件上传下载
- ✅ 邮件发送
- ✅ 各种参数组合

## 测试覆盖统计

### API 测试覆盖

| 业务域     | API 数量 | 说明                         |
| ---------- | -------- | ---------------------------- |
| 用户与会员 | 10       | 用户信息、积分、会员、邀请   |
| 生成服务   | 20       | 图片、视频、OC、状态查询     |
| 社交与社区 | 15       | 作品、点赞、收藏、聊天       |
| 支付与订阅 | 10       | 支付、订阅、退款             |
| 管理后台   | 20       | 用户分析、生成管理、收入统计 |
| 基础服务   | 10       | 上传、下载、邮件、反馈       |
| **总计**   | **85+**  |                              |

### 场景测试覆盖

| 功能模块      | 场景数 | 测试项                             |
| ------------- | ------ | ---------------------------------- |
| AI 动漫生成器 | 12     | 基础生成、引用图、OC、风格、比例等 |
| AI 视频生成器 | 10     | 文生视频、图生视频、模型、参数等   |
| OC Maker      | 15     | 创建、编辑、生成、分享、删除等     |
| 聊天系统      | 10     | 会话、消息、历史、角色切换等       |
| 社区互动      | 10     | 浏览、筛选、点赞、收藏、分享等     |
| 支付流程      | 12     | 购买、订阅、取消、退款等           |
| **总计**      | **69** |                                    |

## 测试结果记录

### 文件命名规范

- API 测试: `api-tests/test-results/YYYYMMDD-api-test.md`
- 场景测试: `scenario-tests/test-results/YYYYMMDD-scenario-test.md`

### 使用模板

- API 测试模板: `api-tests/test-results/template.md`
- 场景测试模板: `scenario-tests/test-results/template.md`

复制模板，重命名为当天日期，填写测试结果。

## 相关文档

- **API 文档**: [`docs/2-implementation/api/`](../docs/2-implementation/api/)
- **API 索引**: [`docs/2-implementation/api/API-INDEX.md`](../docs/2-implementation/api/API-INDEX.md)
- **功能文档**: [`docs/2-implementation/features/`](../docs/2-implementation/features/)
- **数据模型**: [`docs/1-specs/data-models.md`](../docs/1-specs/data-models.md)
- **定价模型**: [`docs/1-specs/pricing-model.md`](../docs/1-specs/pricing-model.md)

## 测试最佳实践

### 1. API 测试建议

- ✅ 使用专门的测试账号，避免污染生产数据
- ✅ 从数据库获取真实的 UUID，避免使用假数据
- ✅ 测试前记录积分余额，测试后验证扣减正确
- ✅ 对于 Webhook，使用模拟数据测试
- ✅ 测试完成后清理测试数据（可选）

### 2. 场景测试建议

- ✅ 按照真实用户流程操作，发现体验问题
- ✅ 测试各种参数组合，不只是默认值
- ✅ 注意边界情况：空值、超长、特殊字符等
- ✅ 测试错误处理：网络错误、积分不足、权限不足等
- ✅ 在不同设备/浏览器测试响应式设计

### 3. 问题记录建议

- ✅ 清晰描述问题和复现步骤
- ✅ 附上截图或错误日志
- ✅ 标注优先级（P0/P1/P2）
- ✅ 记录测试环境信息
- ✅ 验证修复后重新测试

## 常见问题

### Q: 如何获取测试所需的 UUID？

A: 从数据库查询：

```sql
-- 用户 UUID
SELECT uuid, email FROM users WHERE email = 'your-test-email';

-- 角色 UUID
SELECT uuid, name FROM characters WHERE user_uuid = 'your-user-uuid';

-- 生成任务 UUID
SELECT uuid, status FROM generations WHERE user_uuid = 'your-user-uuid' LIMIT 5;
```

### Q: 如何测试需要登录的 API？

A:

1. 在浏览器登录测试账号
2. 复制浏览器的 session cookie
3. 在 .http 文件中添加 Cookie 头：

```http
GET {{apiUrl}}/get-user-info
Cookie: next-auth.session-token=your-session-token
```

### Q: 如何测试支付流程？

A: 使用支付平台的测试模式：

- **Stripe 测试卡**: `4242 4242 4242 4242`
- **Creem**: 使用测试模式的支付接口
- 避免使用真实支付信息

### Q: 发现 bug 后如何处理？

A:

1. 记录到测试结果文件
2. 在项目管理工具创建 Issue（如 GitHub Issues）
3. 标注优先级和影响范围
4. 通知开发团队
5. 修复后重新测试验证

## 改进计划

### 短期（1-2 周）

- [ ] 添加常用 API 的自动化测试脚本
- [ ] 补充测试数据生成脚本
- [ ] 创建测试环境配置文档

### 中期（1-2 月）

- [ ] 引入自动化测试框架（如 Playwright）
- [ ] 添加 CI/CD 集成，自动执行测试
- [ ] 建立测试覆盖率统计

### 长期（3+ 月）

- [ ] 性能测试（响应时间、并发）
- [ ] 安全测试（SQL 注入、XSS 等）
- [ ] 可访问性测试（A11y）

## 变更历史

- **2026-01-27** - 补齐 OC Maker、Studo Tools、Worlds、Incentives 等新功能的测试文档和 API 测试
- **2025-11-12** - 重构测试方案，简化为 API 测试和场景测试两类，删除过于复杂的测试框架

---

**维护者**: AnividAI 开发团队
**最后更新**: 2026-01-27
