# LLM Service 后端服务

Related: FEAT-LLM-SERVICE

## 概述

统一所有 LLM 调用入口，集中管理 Provider、模型路由、重试与兜底策略，降低重复实现与配置分散带来的维护成本，并提供 OpenRouter 作为默认兜底通道。

## 目标

- 统一 LLM 调用到单一服务层，避免各模块自行创建 Provider 实例
- 通过配置驱动选择模型与路由策略
- 失败时自动切换到 OpenRouter
- 提供一致的错误码与日志结构，便于监控与告警

## 设计原则

- 复用现有框架与组件，不重复造轮子
- 明确分层：配置 -> Provider -> 路由策略 -> 调用接口
- 所有错误信息为英文，避免前端硬编码
- 能力可扩展：新增 Provider/模型只需改配置与注册表
- 重试在单个 Provider 内完成，失败后再进入兜底

## 目录结构（拟定）

```
src/services/llm/
├── llm-service.ts                 # 对外统一入口
├── llm-router.ts                  # 路由与兜底策略
├── llm-provider-registry.ts       # Provider 注册与实例化
├── llm-types.ts                   # 公共类型
└── providers/
    ├── openai-compatible.ts       # OpenAI Compatible 适配器
    └── openrouter.ts              # OpenRouter 适配器
src/configs/
├── llm-providers.ts               # Provider 与模型配置
└── llm-routing.ts                 # 路由与优先级配置
```

## 核心服务

### LLMService
- **位置**: `src/services/llm/llm-service.ts`
- **职责**: 对外暴露统一的 LLM 调用接口，内部走路由策略与兜底逻辑

#### 关键接口

- `generate()` - 非流式调用，返回完整响应
- `stream()` - 流式调用，返回可迭代流
- `healthcheck()` - 可选的 Provider 健康检测

### LLMRouter
- **位置**: `src/services/llm/llm-router.ts`
- **职责**: 根据请求上下文选择主 Provider 与模型，并在失败时执行兜底

#### 路由策略（建议）

1. 依据业务场景选择模型策略（chat/image/video）
2. 根据配置选择主 Provider
3. 失败时切换 OpenRouter（若可用）
4. 全部失败返回统一错误

### ProviderRegistry
- **位置**: `src/services/llm/llm-provider-registry.ts`
- **职责**: 统一创建与缓存 Provider 客户端，避免重复初始化

## OpenRouter 兜底设计

- **触发条件**:
  - 主 Provider 超时
  - 5xx 响应
  - 配额不足/鉴权失败
- **兜底策略**:
  - 使用 OpenRouter 对应模型映射
  - 若无映射，则回退到默认模型
- **错误透传**: 在最终失败时返回 `LLM_SERVICE_UNAVAILABLE`

## 配置设计

- Provider 配置集中到 `src/configs/llm-providers.ts`
  - name、apiKey、baseURL、timeout、models
- 路由策略集中到 `src/configs/llm-routing.ts`
  - 场景到模型映射、优先级与兜底顺序
- OpenRouter 需要配置 `OPENROUTER_API_KEY`

## 调用流程（文字版）

1. 业务模块调用 `LLMService.generate/stream`
2. LLMService 调用 LLMRouter 选择主 Provider
3. ProviderRegistry 返回 Provider 实例
4. 主调用触发基础重试（指数退避）
5. 重试仍失败则触发 OpenRouter 兜底
5. 成功返回统一响应结构；失败抛出统一错误

## 统一错误码

- `LLM_SERVICE_UNAVAILABLE` (503): 所有 Provider 调用失败
- `LLM_REQUEST_TIMEOUT` (504): 调用超时
- `LLM_AUTH_FAILED` (401): 认证失败
- `LLM_BAD_REQUEST` (400): 请求参数错误

## 影响范围（预期）

- 现有各模块的 LLM 调用统一迁移至 `LLMService`
- 典型模块：
  - `src/services/chat/`
  - `src/services/chat-with-oc/`
  - `src/services/anime-generation/`
  - `src/services/anime-video-generation/`

## 迁移要点

- 删除各模块内重复的 Provider 初始化逻辑
- 模型选择与兜底规则通过配置驱动
- 日志统一打点（provider/model/latency/traceId）

## 重试机制

- **位置**：`src/services/llm/llm-service.ts`
- **范围**：`generateTextWithFallback` 与 `streamTextWithFallback` 的单 Provider 调用
- **策略**：指数退避重试；达到次数后再执行 Provider fallback
- **默认参数**：
  - `maxRetries`: 3
  - `retryDelayMs`: 800
  - `backoffMultiplier`: 2
- **异常传播**：同一 Provider 的重试耗尽后，进入下一个 Provider；全部失败抛出 `LLM_SERVICE_UNAVAILABLE`

## 变更历史

- 2025-02-11 FEAT-LLM-SERVICE 初始设计（影响：后端服务/配置）
