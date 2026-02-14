# API 测试说明

## 概述

API 测试用于验证所有后端 API 端点的功能正确性、错误处理和权限控制。

## 测试工具

使用 **VSCode REST Client 扩展** 执行 HTTP 请求测试。

### 安装 REST Client

1. 打开 VSCode
2. 进入扩展市场 (Ctrl+Shift+X / Cmd+Shift+X)
3. 搜索 "REST Client"
4. 安装 "REST Client" by Huachao Mao

## 测试文件结构

测试文件按业务域拆分为多个 `.http` 文件，便于管理和维护：

```
api-tests/
├── common.http                      # 公共配置（环境变量、测试数据）
├── export.http                      # 导出 API（2 个）
├── user-membership.http             # 用户与会员 API（8 个）
├── anime-generation.http            # 动漫图片生成 API（9 个）
├── video-generation.http            # 视频生成 API（4 个）
├── oc-maker.http                    # OC Maker API（11 个）
├── oc-apps.http                     # Studo Tools API（1 个）
├── chat-quota.http                  # 聊天配额 API（3 个）
├── social-community.http            # 社交与社区 API（15 个）
├── payments-subscriptions.http      # 支付与订阅 API（6 个）
├── admin.http                       # 管理后台 API（24 个）
├── basic-services.http              # 基础服务 API（7 个）
├── incentives.http                  # 用户激励 API（3 个）
├── worlds.http                      # 世界设定 API（9 个）
└── test-results/                    # 测试结果记录
    └── template.md                  # 结果记录模板
```

**总计**: 130+ API 端点

## 测试文件说明

### 公共配置 (common.http)

定义所有测试共用的环境变量和测试数据：
- 环境变量：`baseUrl`, `apiUrl`
- 测试数据：`userUuid`, `generationUuid`, `characterUuid` 等

其他测试文件通过 `@import common.http` 引入这些配置。

### 业务域测试文件

每个测试文件对应一个或多个相关的业务域：

| 文件 | 业务域 | API 数量 | 相关文档 |
|------|--------|----------|----------|
| `export.http` | 导出 | 2 | export.md |
| `user-membership.http` | 用户、会员、邀请 | 14 | user.md, membership.md, affiliate.md |
| `anime-generation.http` | 动漫图片生成 | 9 | anime-generation.md, generation.md |
| `video-generation.http` | 视频生成 | 4 | anime-video.md |
| `oc-maker.http` | OC 创建器 | 14 | oc-maker.md |
| `oc-apps.http` | OC 应用工具 | 2 | oc-apps.md |
| `chat-quota.http` | 聊天配额 | 3 | - |
| `social-community.http` | 社区、作品、角色、聊天 | 30 | community.md, artworks.md, characters.md, chat.md |
| `payments-subscriptions.http` | 支付、订阅 | 10 | payments.md, subscriptions.md |
| `admin.http` | 管理后台 | 25 | admin.md, admin-file-transfer.md |
| `basic-services.http` | 上传、下载、邮件、反馈 | 7 | upload.md, download.md, emails.md, feedback.md |
| `incentives.http` | 用户激励 | 3 | - |
| `worlds.http` | 世界设定 | 10 | world.md |

## 使用方法

### 1. 配置环境变量

编辑 `common.http` 文件，设置测试数据：

```http
@baseUrl = http://localhost:3000
@apiUrl = {{baseUrl}}/api

# 从数据库获取真实 UUID
@userUuid = your-test-user-uuid
@generationUuid = your-test-generation-uuid
@characterUuid = your-test-character-uuid
```

**获取测试 UUID**：

```sql
-- 用户 UUID
SELECT uuid, email FROM users WHERE email = 'your-test-email';

-- 角色 UUID
SELECT uuid, name FROM characters WHERE user_uuid = 'your-user-uuid';

-- 生成任务 UUID
SELECT uuid, status FROM generations WHERE user_uuid = 'your-user-uuid' LIMIT 5;
```

### 2. 执行测试

**方式 1: 测试单个 API**

1. 打开对应的 `.http` 文件（如 `anime-generation.http`）
2. 找到要测试的 API 端点
3. 点击请求上方的 **"Send Request"** 按钮
4. 查看右侧响应面板的结果

**方式 2: 测试整个业务域**

1. 打开对应的 `.http` 文件
2. 依次点击每个请求的 **"Send Request"** 按钮
3. 验证所有响应结果

### 3. 验证结果

检查响应：
- ✅ **状态码**: 是否符合预期 (200, 400, 401, 403, 404, 500 等)
- ✅ **响应格式**: 是否符合 API 文档定义
- ✅ **数据正确性**: 返回数据是否正确
- ✅ **错误处理**: 错误响应是否合理

### 4. 记录结果

将测试结果记录到 `test-results/YYYYMMDD-api-test.md`

使用模板: `test-results/template.md`

## 测试覆盖清单

### 用户与会员 (user-membership.http)
- [ ] 获取会话信息
- [ ] 获取用户信息
- [ ] 获取用户积分详情
- [ ] 获取用户余额
- [ ] 获取即将过期积分
- [ ] 批量获取用户角色头像
- [ ] 获取用户公开资料
- [ ] 更新用户资料
- [ ] 获取用户公开角色
- [ ] 获取用户公开世界观
- [ ] 获取用户公开作品
- [ ] 获取会员状态
- [ ] 设置邀请码
- [ ] 使用邀请码

### 动漫图片生成 (anime-generation.http)
- [ ] 创建动漫图片生成任务
- [ ] 获取生成历史
- [ ] 优化 Prompt
- [ ] LLM 提取层构建提示词
- [ ] 查询生成任务状态
- [ ] 获取生成图片
- [ ] 解析生成图片资源
- [ ] Webhook 回调处理
- [ ] 处理生成失败

### 视频生成 (video-generation.http)
- [ ] 获取视频生成报价
- [ ] 创建视频生成任务
- [ ] 优化视频 Prompt
- [ ] 获取生成视频

### OC Maker (oc-maker.http)
- [ ] 获取 OC Maker 配置
- [ ] 验证 OC 配置
- [ ] 检查 OC 创建限额
- [ ] 获取用户 OC 列表
- [ ] 创建新 OC
- [ ] 获取 OC 详情
- [ ] 更新 OC
- [ ] 删除 OC
- [ ] 生成 OC 头像
- [ ] 更新 OC 头像
- [ ] 生成 OC 图片
- [ ] 获取公开 OC 列表
- [ ] 获取预置标签

### Studo Tools (oc-apps.http)
- [ ] 获取手办模板列表
- [ ] 获取贴纸模板列表

### 聊天配额 (chat-quota.http)
- [ ] 获取聊天配额
- [ ] 重置聊天配额
- [ ] 配额重置健康检查

### 社交与社区 (social-community.http)
- [ ] 获取社区作品列表
- [ ] 获取作品详情
- [ ] 点赞/取消点赞作品
- [ ] 收藏/取消收藏作品
- [ ] 修改作品可见性
- [ ] 获取用户作品列表
- [ ] 获取角色头像/立绘
- [ ] 获取角色创作历史
- [ ] 获取相似角色推荐
- [ ] 批量获取角色资源
- [ ] 聊天配置和会话管理
- [ ] 发送聊天消息
- [ ] 清空会话消息
- [ ] 获取聊天配额
- [ ] 重置聊天配额
- [ ] 评论列表与互动

### 支付与订阅 (payments-subscriptions.http)
- [ ] 创建支付订单
- [ ] 获取用户订阅信息
- [ ] 创建计费门户会话
- [ ] 取消订阅
- [ ] 获取订阅日志
- [ ] 获取订单列表
- [ ] 支付回调与 Webhook

### 管理后台 (admin.http)
- [ ] 用户分析
- [ ] 生成任务列表和分析
- [ ] 收入统计（总收入、当月、趋势）
- [ ] 订单统计和分布
- [ ] 成本管理（查询、添加、更新、删除）
- [ ] 订阅列表
- [ ] 失败日志列表
- [ ] 文件转存管理

### 基础服务 (basic-services.http)
- [ ] 上传参考图片
- [ ] 下载生成图片/视频
- [ ] 提交用户反馈
- [ ] 发送邮件
- [ ] 搜索文档
- [ ] 图片代理

### 导出 (export.http)
- [ ] 导出角色 JSON
- [ ] 导出角色 Markdown

### 用户激励 (incentives.http)
- [ ] 获取激励状态
- [ ] 每日签到
- [ ] 领取分享奖励

### 世界设定 (worlds.http)
- [ ] 获取世界列表
- [ ] 创建世界
- [ ] 获取世界详情
- [ ] 更新世界
- [ ] 删除世界
- [ ] 收藏/取消收藏世界
- [ ] 点赞/取消点赞世界
- [ ] 分享世界

## 测试场景

### 基本功能测试

验证 API 基本功能是否正常工作。

**示例**: 测试用户信息查询
```http
POST {{apiUrl}}/get-user-info
Content-Type: application/json

# 预期: 200 OK, 返回用户信息
```

### 参数验证测试

验证 API 对无效参数的处理。

**示例**: 测试缺少必填参数
```http
POST {{apiUrl}}/anime-generation/create-task
Content-Type: application/json

{
  "prompt": "a cute anime girl"
  # 缺少 style, aspect_ratio 等参数
}

# 预期: 400 Bad Request
```

### 权限测试

验证 API 的权限控制。

**示例**: 测试未登录访问
```http
GET {{apiUrl}}/artworks

# 预期: 401 Unauthorized
```

**示例**: 测试非管理员访问管理 API
```http
GET {{apiUrl}}/admin/users

# 预期: 403 Forbidden (如果不是管理员)
```

### 错误处理测试

验证 API 对异常情况的处理。

**示例**: 测试资源不存在
```http
GET {{apiUrl}}/generation/status/non-existent-uuid

# 预期: 404 Not Found
```

## 测试数据准备

### 创建测试账号

需要准备以下测试账号：

1. **普通用户** - 测试基本功能
2. **VIP 用户** - 测试会员功能
3. **管理员** - 测试管理后台

### 准备测试数据

从数据库获取测试所需的 UUID，更新到 `common.http`。

## 常见问题

### Q: 如何处理需要登录的 API？

A: REST Client 会自动保持 cookie。先在浏览器登录，然后可以：

**方式 1**: 复制 session cookie
```http
GET {{apiUrl}}/get-user-info
Cookie: next-auth.session-token=your-session-token
```

**方式 2**: REST Client 会自动使用浏览器的 cookie（同域）

### Q: 如何测试文件上传？

A: 使用 `multipart/form-data`：

```http
POST {{apiUrl}}/upload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="test.png"

< ./test-data/test-image.png
------WebKitFormBoundary--
```

### Q: 如何在不同文件间共享变量？

A: 所有测试文件都通过 `@import common.http` 引入公共配置，共享环境变量和测试数据。

### Q: 如何测试 Webhook 回调？

A: 使用 POST 请求模拟 webhook 调用（在 `anime-generation.http` 中）。

### Q: 为什么要拆分成多个文件？

A:
- ✅ **易于管理**: 每个文件专注一个业务域
- ✅ **快速定位**: 根据功能快速找到对应测试
- ✅ **团队协作**: 不同人可以同时编辑不同文件
- ✅ **按需测试**: 只测试相关业务域，无需加载所有 API

## 推荐测试流程

### 日常开发测试

1. 修改了某个 API
2. 打开对应的 `.http` 文件
3. 测试相关的 API 端点
4. 验证功能正常

### 发版前完整测试

1. 按优先级测试（P0 → P1 → P2）
2. 依次打开各个 `.http` 文件
3. 执行所有测试请求
4. 记录测试结果

## 参考文档

- **API 索引**: [`../../docs/2-implementation/api/API-INDEX.md`](../../docs/2-implementation/api/API-INDEX.md)
- **API 文档**: [`../../docs/2-implementation/api/`](../../docs/2-implementation/api/)
- **数据模型**: [`../../docs/1-specs/data-models.md`](../../docs/1-specs/data-models.md)

## 变更历史

- 2025-11-12 按业务域拆分为多个 .http 文件，便于管理
- 2025-11-12 初始版本，重构为简化的 API 测试方案
