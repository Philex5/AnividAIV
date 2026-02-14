# Tasks — FEAT-CHAT-REFINED: Chat with OC 精细化升级

Related:

- Feature: docs/2-implementation/features/feature-chat.md
- 前端设计: docs/2-implementation/frontend/page-chat-with-character.md
- 后端设计: docs/2-implementation/backend/service-chat-with-oc.md
- 定价模型: docs/1-specs/pricing-model.md

## 描述

面向"Chat with OC (角色聊天)"功能的精细化升级，实现模型区分、4级会员限制、实时进度监控和升级引导等功能，打造差异化用户体验和清晰付费路径。

## 验收标准（引用）

- **模型区分**: 免费用户使用 Base Model (gpt-3.5-turbo)，订阅会员可使用 Premium Model (gpt-4.1)
- **4级会员限制**:
  - Free: 10轮, 512 tokens/轮, 2000 tokens总数
  - Basic: 30轮, 1024 tokens/轮, 6000 tokens总数
  - Plus: 60轮, 2048 tokens/轮, 15000 tokens总数
  - Pro: 120轮, 4096 tokens/轮, 32000 tokens总数
- **实时监控**: 进度条展示对话轮数和Tokens使用量，实时更新
- **限制检查**: 达到上限后锁定输入框，弹出升级引导或清空对话选项
- **权限控制**: 后端严格验证模型使用权限，防止越权

## 依赖

- 基础聊天功能已实现：`tasks-feature-chat.md` 完成
- 会员系统：`src/services/membership.ts` 可获取用户等级
- 积分系统：`src/services/credit.ts` 扣费和退款
- 聊天服务：`src/services/chat/chat-service.ts` 已有基础实现
- UI 组件库：已实现 `src/components/ui/` 基础组件

## 任务拆解（单任务 1–2 天粒度）

### 1. 配置与限制定义

- [x] 更新 `src/configs/chat/chat-limits.json`
  - 定义4级会员详细限制配置
  - 定义可用模型列表
  - 添加限制检查规则

- [ ] 更新定价模型文档确认
  - 确认 docs/1-specs/pricing-model.md 中的模型和限制配置
  - 验证与前端/后端实现一致性

### 2. 后端服务增强

#### 2.1 聊天服务升级

- [x] 增强 `src/services/chat/chat-service.ts`:
  - [x] 增加 `checkChatLimits()` 方法：检查轮数、tokens、单轮输入限制
  - [x] 增加 `validateModelPermission()` 方法：验证模型使用权限
  - [x] 增加 `smartTrimContext()` 方法：智能裁剪历史上下文
  - [x] 增加 `calculateTokens()` 方法：实时计算Tokens使用量
  - [x] 更新 `sendMessage()` 方法：支持多模型调用

#### 2.2 API 路由增强

- [x] 增强 `src/app/api/chat/send-message/route.ts`:
  - [x] 增加模型参数验证
  - [x] 增加限制检查逻辑
  - [x] 在SSE响应中增加进度信息

- [x] 增强 `src/app/api/chat/config/route.ts`:
  - [x] 返回用户等级和可用模型
  - [x] 返回详细限制配置

- [x] 新增 `src/app/api/chat/sessions/{id}/clear/route.ts`:
  - [x] 清空对话历史
  - [x] 重置进度统计

### 3. 前端页面升级

#### 3.1 新增UI组件

- [x] 新增 `src/components/chat/ModelSelector.tsx`
  - [x] 模型选择器，支持权限控制
  - [x] 免费用户显示锁定状态和订阅提示
  - [x] 订阅用户可自由切换模型

- [x] 新增 `src/components/chat/ChatProgressBar.tsx`
  - [x] 对话轮数进度条
  - [x] Tokens使用进度条
  - [x] 实时更新，颜色动态变化

- [x] 新增 `src/components/chat/UpgradeDialog.tsx`
  - [x] 达到限制时的升级引导弹窗
  - [x] 展示不同会员等级对比
  - [x] 提供升级和清空对话选项

#### 3.2 页面逻辑增强

- [x] 增强 `src/app/[locale]/(default)/chat/page-client.tsx`:
  - [x] 获取用户等级和可用模型
  - [x] 实时监控进度状态
  - [x] 限制检查和提示逻辑
  - [x] 升级引导流程

- [ ] 增强现有组件:
  - [ ] 更新 `ChatInput.tsx`: 增加限制状态显示
  - [ ] 更新 `MessageList.tsx`: 支持进度条渲染

### 4. 国际化文本

- [x] 更新 `src/i18n/pages/chat/en.json`:
  - [x] 模型相关文案
  - [x] 进度条文案
  - [x] 限制提示文案
  - [x] 升级引导文案

### 5. 错误处理与边界情况

- [ ] 完善错误码定义:
  - [ ] `MODEL_NOT_ALLOWED`: 模型权限不足
  - [ ] `MAX_ROUNDS_EXCEEDED`: 达到对话轮数上限
  - [ ] `MAX_TOKENS_EXCEEDED`: 达到Tokens上限
  - [ ] `MAX_TOKENS_PER_ROUND_EXCEEDED`: 单轮输入过长

- [ ] 实现错误处理逻辑:
  - [ ] 后端返回标准错误码
  - [ ] 前端根据错误码显示相应提示
  - [ ] 自动弹出升级引导（针对限制类错误）

### 6. 测试用例

- [ ] 新增主路径测试: `tests/test-cases/FEAT-CHAT-REFINED-main.md`
  - [ ] 免费用户使用Base Model测试
  - [ ] 订阅会员切换模型测试
  - [ ] 不同会员等级限制测试
  - [ ] 实时进度条更新测试

- [ ] 新增错误/边界测试: `tests/test-cases/FEAT-CHAT-REFINED-errors.md`
  - [ ] 达到轮数上限处理
  - [ ] 达到Tokens上限处理
  - [ ] 免费用户尝试使用Premium Model
  - [ ] 单轮超长输入处理

- [ ] 新增回归测试: `tests/test-cases/FEAT-CHAT-REFINED-regression.md`
  - [ ] 不同会员等级切换测试
  - [ ] 进度条性能和准确性测试
  - [ ] 清空对话功能测试

- [ ] 执行测试并记录: `tests/test-reports/FEAT-CHAT-REFINED-summary.md`

### 7. 性能优化

- [ ] 实现防抖机制:
  - [ ] 输入时防抖检查限制（300ms延迟）
  - [ ] 进度条更新防抖（避免频繁重绘）

- [ ] 优化Token计算:
  - [ ] 使用高效的Token估算算法
  - [ ] 缓存计算结果

- [ ] 虚拟滚动优化:
  - [ ] 消息列表超过100条时启用虚拟滚动

### 8. 文档与变更记录

- [ ] 更新相关文档:
  - [ ] docs/2-implementation/features/feature-chat.md（已更新）
  - [ ] docs/2-implementation/frontend/page-chat-with-character.md（已更新）
  - [ ] docs/2-implementation/backend/service-chat-with-oc.md（已更新）

- [ ] 记录变更:
  - [ ] docs/3-operations/changelog.md 追加 FEAT-CHAT-REFINED
  - [ ] docs/3-operations/decisions.md 记录重要技术决策

## 任务优先级

### 高优先级（P0）

1. 配置与限制定义
2. 后端限制检查逻辑
3. 前端进度条和限制提示
4. 模型权限控制

### 中优先级（P1）

1. 升级引导弹窗
2. 清空对话功能
3. 错误处理完善
4. 性能优化

### 低优先级（P2）

1. 高级测试用例
2. 虚拟滚动优化
3. 文档完善

## 预估工作量

- **总计**: 约 12-15 个工作日
- **P0**: 8 个工作日
- **P1**: 4 个工作日
- **P2**: 3 个工作日

## 风险与应对

### 风险1: Token计算不准确

- **影响**: 进度条显示错误，限制检查失效
- **应对**: 使用服务端精确计算，前端粗略估算做参考

### 风险2: 用户绕过限制

- **影响**: 免费用户使用Premium Model
- **应对**: 后端严格验证，前端辅助检查

### 风险3: 性能问题

- **影响**: 进度条频繁更新导致卡顿
- **应对**: 实现防抖和节流机制

## DoD（完成判定）

- [ ] 4级会员限制配置完整且正确
- [ ] 模型权限控制严格有效
- [ ] 进度条实时准确显示
- [ ] 达到限制时正确锁定和引导
- [ ] 三类测试用例全部通过
- [ ] 性能指标达标（进度条更新<100ms）
- [ ] 文档完整更新
- [ ] 变更记录已追加

## 相关资源

### 配置文件

- `src/configs/chat/chat-limits.json` - 会员限制配置
- `src/configs/prompts/character-chat.json` - 提示词模板

### 服务文件

- `src/services/chat/chat-service.ts` - 聊天服务
- `src/services/membership.ts` - 会员服务
- `src/services/credit.ts` - 积分服务

### API 路由

- `src/app/api/chat/config/route.ts` - 获取聊天配置
- `src/app/api/chat/send-message/route.ts` - 发送消息
- `src/app/api/chat/sessions/{id}/clear/route.ts` - 清空对话

### 前端组件

- `src/components/chat/ModelSelector.tsx` - 模型选择器
- `src/components/chat/ChatProgressBar.tsx` - 进度条
- `src/components/chat/UpgradeDialog.tsx` - 升级引导

### 测试文件

- `tests/test-cases/FEAT-CHAT-REFINED-*.md` - 测试用例
- `tests/test-reports/FEAT-CHAT-REFINED-summary.md` - 测试报告

---

**创建日期**: 2025-11-14
**负责人**: FEAT-CHAT-REFINED Team
**状态**: 规划完成，准备执行

---

## 实现完成报告

### 已完成功能 (2025-11-14)

#### 1. 配置与限制定义 ✅

- ✅ 更新 `src/configs/chat/chat-limits.json` - 定义4级会员详细限制配置
- ✅ 定义可用模型列表（Base: gpt-3.5-turbo, Premium: gpt-4.1）
- ✅ 添加限制检查规则

#### 2. 后端服务增强 ✅

- ✅ 增强 `src/services/chat/chat-service.ts`:
  - ✅ 增加 `checkChatLimits()` 方法：检查轮数、tokens、单轮输入限制
  - ✅ 增加 `validateModelPermission()` 方法：验证模型使用权限
  - ✅ 增加 `smartTrimContext()` 方法：智能裁剪历史上下文
  - ✅ 增加 `calculateTokens()` 方法：实时计算Tokens使用量
  - ✅ 更新 `sendMessage()` 方法：支持多模型调用和流式进度监控

- ✅ 增强 API 路由:
  - ✅ `src/app/api/chat/send-message/route.ts` - 增加模型参数验证和限制检查
  - ✅ `src/app/api/chat/config/route.ts` - 返回用户等级和可用模型
  - ✅ `src/app/api/chat/sessions/{id}/clear/route.ts` - 清空对话历史

#### 3. 前端页面升级 ✅

- ✅ 新增 UI 组件:
  - ✅ `src/components/chat/ModelSelector.tsx` - 模型选择器，支持权限控制
  - ✅ `src/components/chat/ChatProgressBar.tsx` - 对话轮数和Tokens使用进度条
  - ✅ `src/components/chat/UpgradeDialog.tsx` - 升级引导弹窗

- ✅ 增强页面逻辑:
  - ✅ `src/app/[locale]/(default)/chat/page-client.tsx` - 集成所有新功能

#### 4. 国际化文本 ✅

- ✅ 更新 `src/i18n/pages/chat/en.json` - 添加模型、进度条、升级引导相关文案

#### 5. 数据模型增强 ✅

- ✅ `src/models/chat.ts` - 添加 `archiveSessionMessages()` 方法

### 核心功能实现

1. **4级会员限制系统**：
   - Free: 10轮, 512 tokens/轮, 2000 tokens总数
   - Basic: 30轮, 1024 tokens/轮, 6000 tokens总数
   - Plus: 60轮, 2048 tokens/轮, 15000 tokens总数
   - Pro: 120轮, 4096 tokens/轮, 32000 tokens总数

2. **Base/Premium模型区分**：
   - Base Model (gpt-3.5-turbo): 所有用户可用
   - Premium Model (gpt-4.1): Plus和Pro用户可用

3. **实时进度监控**：
   - 对话轮数进度条
   - Tokens使用进度条
   - 流式响应中实时更新进度

4. **升级引导机制**：
   - 达到限制时弹出升级对话框
   - 展示不同会员等级对比
   - 提供升级和清空对话选项

### 待优化项目

1. 增强现有组件:
   - [ ] 更新 `ChatInput.tsx`: 增加限制状态显示
   - [ ] 更新 `MessageList.tsx`: 支持进度条渲染

2. 错误处理与边界情况:
   - [ ] 完善错误码定义
   - [ ] 实现错误处理逻辑

3. 测试用例:
   - [ ] 新增主路径测试
   - [ ] 新增错误/边界测试
   - [ ] 新增回归测试

4. 性能优化:
   - [ ] 实现防抖机制
   - [ ] 优化Token计算
   - [ ] 虚拟滚动优化

### 技术亮点

1. **流式进度监控**: 在SSE响应中实时发送进度更新事件
2. **智能限制检查**: 服务端严格验证模型权限和聊天限制
3. **用户体验优化**: 实时进度条和清晰的升级引导
4. **代码组织**: 模块化设计，易于维护和扩展

### 总体进度

- **已完成**: 约 70% 的核心功能
- **预计剩余工作量**: 2-3 个工作日
- **当前状态**: 核心功能已实现，可以进行内部测试
