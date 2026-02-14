# Feature: Chat with OC (角色聊天功能) - 精细化版本

## 背景与目标

### 功能定位

为用户与其创建的原创角色(OC)提供基于 AI 的互动对话能力,增强用户与角色之间的情感连接,提升用户粘性,完善 OC 生态体系。

### 业务价值

- **情绪价值**: 用户可以与角色进行角色扮演式对话,增强情感投入
- **生态完善**: 补充 OC Maker 核心功能,形成"创建-交互-创作"完整闭环
- **用户留存**: 聊天功能天然具备高频使用特性,提升 DAU
- **变现能力**: 基于对话次数的积分消耗模型,创造持续收入

### 目标用户

- 动漫爱好者: 与喜爱的角色进行日常互动
- 创作者: 通过对话探索角色性格,获取创作灵感
- 自媒体运营者: 利用角色对话生成有趣内容

## 验收标准 (摘录自 PRD)

MVP 版本验收标准:

1. ✅ **基础对话能力**
   - 用户可以选择任意自己创建的 OC 角色发起对话
   - 角色回复符合其预设的性格、背景故事等设定
   - 支持多轮对话上下文(配置化轮数,支持 4 级会员差异化)

2. ✅ **流式响应体验**
   - 角色回复以打字机效果实时显示
   - 首字节响应时间 < 2 秒

3. ✅ **会话管理**
   - 支持创建新会话
   - 支持查看历史会话列表
   - 支持继续历史会话

4. ✅ **积分系统集成**
   - 每次对话固定扣除 1 MC
   - 积分不足时给出明确提示并禁止发送
   - 扣费记录可在积分历史中追溯

5. ✅ **权限控制**
   - 仅角色所有者可以与 private 角色对话
   - public 角色允许所有用户对话

6. ✅ **模型选择与限制**
   - 免费用户使用 Base Model (gpt-3.5-turbo)，不可切换
   - 订阅会员使用 Premium Model (gpt-4.1)，可自由切换
   - 支持 4 级会员限制：Free/Basic/Plus/Pro
   - 实时监控对话轮数和 Tokens 使用量
   - 达到上限后锁定输入并提供升级引导

7. ✅ **限制检查机制**
   - Free: 10轮, 512 tokens/轮, 2000 tokens总数
   - Basic: 30轮, 1024 tokens/轮, 6000 tokens总数
   - Plus: 60轮, 2048 tokens/轮, 15000 tokens总数
   - Pro: 120轮, 4096 tokens/轮, 32000 tokens总数

## 核心功能设计

### 1. 对话能力

#### 1.1 角色人设注入

- 基于 `characters` 表中的角色数据动态构建 system prompt
- 包含角色的姓名、年龄、性格标签、背景故事、外观特征等
- 使用提示词模板确保角色回复一致性

#### 1.2 多轮上下文管理

- 采用滑动窗口机制,保留最近 N 轮对话
- 窗口大小可配置(默认 10 轮,即 20 条消息)
- 超出窗口的历史消息不参与 LLM 调用,但仍保存在数据库

#### 1.3 流式响应

- 使用 Server-Sent Events (SSE) 实现打字机效果
- 实时将 LLM 生成的 token 流式传输到前端
- 支持中断机制(用户可停止生成)

### 2. 会话管理

#### 2.1 会话创建

- 用户首次与角色对话时自动创建会话
- 生成唯一 `session_id` 标识会话
- 自动生成会话标题(基于首条消息或默认"与 {角色名} 的对话")

#### 2.2 会话列表

- 展示用户与所有角色的历史会话
- 支持按角色筛选
- 显示最后消息时间和消息预览

#### 2.3 会话恢复

- 用户可点击历史会话继续对话
- 自动加载历史上下文(窗口范围内)

### 3. 积分计费

#### 3.1 计费策略

- **固定费用**: 每次对话 1 MC,不论对话长度
- **预扣模式**: 发送消息前先扣除积分
- **失败退款**: LLM 调用失败时自动退还积分

#### 3.2 费用提示

- 输入框下方显示"本次对话将消耗 1 MC"
- 积分不足时输入框禁用,显示充值引导
- 发送成功后显示剩余积分

### 4. 模型选择与限制

#### 4.1 模型区分

- **Base Model**: gpt-3.5-turbo
  - 免费用户默认使用
  - 不可切换到 Premium Model
  - 成本较低，基础对话能力
- **Premium Model**: gpt-4.1
  - 订阅会员可用
  - 支持切换到 Base Model
  - 更高质量对话，支持更长上下文

#### 4.2 会员限制配置

```typescript
interface ChatLimits {
  Free: {
    maxRounds: number; // 10
    maxTokensPerRound: number; // 512
    maxTotalTokens: number; // 2000
    availableModels: string[]; // ['gpt-3.5-turbo']
  };
  Basic: {
    maxRounds: number; // 30
    maxTokensPerRound: number; // 1024
    maxTotalTokens: number; // 6000
    availableModels: string[]; // ['gpt-3.5-turbo', 'gpt-4.1']
  };
  Plus: {
    maxRounds: number; // 60
    maxTokensPerRound: number; // 2048
    maxTotalTokens: number; // 15000
    availableModels: string[]; // ['gpt-3.5-turbo', 'gpt-4.1']
  };
  Pro: {
    maxRounds: number; // 120
    maxTokensPerRound: number; // 4096
    maxTotalTokens: number; // 32000
    availableModels: string[]; // ['gpt-3.5-turbo', 'gpt-4.1']
  };
}
```

配置存储在 `src/configs/chat/chat-limits.json` 中。

#### 4.3 限制检查流程

```typescript
function checkChatLimits(
  userTier: string,
  currentRound: number,
  currentTokens: number,
  newMessageTokens: number
): { allowed: boolean; reason?: string } {
  const limits = CHAT_LIMITS[userTier];

  // 检查对话轮数
  if (currentRound >= limits.maxRounds) {
    return { allowed: false, reason: "MAX_ROUNDS_EXCEEDED" };
  }

  // 检查单轮token限制
  if (newMessageTokens > limits.maxTokensPerRound) {
    return { allowed: false, reason: "MAX_TOKENS_PER_ROUND_EXCEEDED" };
  }

  // 检查总token限制
  if (currentTokens + newMessageTokens > limits.maxTotalTokens) {
    return { allowed: false, reason: "MAX_TOTAL_TOKENS_EXCEEDED" };
  }

  return { allowed: true };
}
```

## 用户流程

### 主流程: 发起对话

```
用户进入角色详情页 → 点击"Chat with {角色名}"
    ↓
跳转到 /chat/uuid
    ↓
加载角色信息、历史会话和用户限制配置
    ↓
【前端】显示模型选择器 (根据会员等级)
    ↓
用户输入消息 → 点击发送
    ↓
【前端】校验: 消息长度、积分余额、限制检查
    ↓
【后端】验证模型权限 → 检查限制 → 扣除 1 MC
    ↓
【后端】构建上下文(基于限制裁剪) → 调用对应模型
    ↓
【前端】流式显示角色回复，实时更新进度条
    ↓
【后端】保存对话记录，更新会话统计
    ↓
检查是否达到限制 → 达到则弹出升级引导
```

### 异常流程

#### 积分不足

```
用户点击发送 → 前端提示"积分不足,需要 1 MC"
    ↓
显示充值按钮 → 跳转到定价页面
```

#### LLM 调用失败

```
后端调用 LLM 失败 → 自动退还 1 MC
    ↓
返回错误信息给前端 → 提示"对话生成失败,已退还积分,请重试"
```

#### 达到限制

```
用户发送消息 → 后端检查限制发现已达到上限
    ↓
返回限制错误码 → 前端弹出升级引导弹窗
    ↓
用户选择:
  ├─ "升级会员" → 跳转到定价页面
  └─ "清空对话，重新开始" → 调用清空API，重置进度
```

#### 尝试使用受限模型

```
免费用户尝试选择Premium Model → 前端阻止并显示提示
    ↓
点击提示 → 弹出升级引导弹窗
    ↓
引导到定价页面
```

## 系统级流程设计

### 对话生成流程(时序图)

```
用户 → 前端 → API → ChatService → XiaoJingAI → 数据库

1. 用户输入消息，选择模型
2. 前端 POST /api/chat/send-message (包含模型参数)
3. API 验证用户身份、积分和模型权限
4. API 检查限制(轮数/tokens)
5. API 扣除 1 MC (预扣)
6. ChatService.getConversationContext() 获取历史上下文(基于限制裁剪)
7. ChatService.buildCharacterPrompt() 构建角色提示词
8. ChatService.sendMessage() 调用对应模型(gpt-3.5-turbo/gpt-4.1)
9. XiaoJingAI 流式返回 token
10. API 通过 SSE 流式传输给前端(包含进度信息)
11. 前端实时渲染打字机效果，更新进度条
12. 生成完成后保存到 character_chats 表
13. 更新 chat_sessions 元数据(总token数、消息数)
14. 检查是否达到限制，决定是否弹出升级引导
```

### 上下文窗口管理流程

```
根据用户会员等级获取限制配置
    ↓
获取历史消息(最近 maxRounds*2 条)
    ↓
计算当前已使用tokens
    ↓
按 message_index 排序
    ↓
智能裁剪(保证不超过限制):
  1. 检查对话轮数是否超限
  2. 检查总tokens是否超限
  3. 优先保留最近的对话
    ↓
构造消息数组: [system_prompt, ...裁剪后历史消息, 当前用户消息]
    ↓
传递给对应模型API(gpt-3.5-turbo/gpt-4.1)
```

**智能裁剪策略**:

```typescript
function smartTrimContext(
  messages: ChatMessage[],
  userTier: string
): ChatMessage[] {
  const limits = CHAT_LIMITS[userTier];
  const maxRounds = limits.maxRounds;
  const maxTokens = limits.maxTotalTokens;

  // 1. 先按轮数裁剪(保留最近N轮)
  let trimmed = messages.slice(-maxRounds * 2);

  // 2. 再按tokens裁剪
  let totalTokens = calculateTokens(trimmed);
  while (totalTokens > maxTokens && trimmed.length > 2) {
    // 删除最老的一条消息(保留system prompt和最新消息)
    trimmed = trimmed.slice(1);
    totalTokens = calculateTokens(trimmed);
  }

  return trimmed;
}
```

## 数据库设计与迁移

### 数据表新增/调整

- `character_chats` (扩展现有表): 新增 `uuid`、`session_id`、`message_index`、`role`、`content`、`metadata`、`is_archived`、`archived_at`、`archived_to_r2`、`archive_metadata` 等列,保留 `message_type`/`message_content` 兼容旧数据,支持会话维度检索与归档标记; 新增组合索引 `idx_character_chats_session(session_id, message_index)` 保障上下文顺序读取,详见 `src/db/schema.ts:435`.
- `chat_sessions` (新增表): 记录用户与角色的会话元数据,包含 `session_id`、`user_uuid`、`character_uuid`、`message_count`、`last_message_at`、`context_window_size`、`total_tokens_used`、`total_credits_used`、`archived_message_count`、`last_archived_at` 等字段,并通过索引 `idx_chat_sessions_user_character` 与 `idx_chat_sessions_updated` 提升列表查询性能,定义于 `src/db/schema.ts:470`.

### 迁移执行

- 使用 Drizzle CLI 重新生成迁移: `pnpm db:generate`
- 基于 `.env.development` 中配置的 `DATABASE_URL` 应用到本地数据库: `pnpm db:migrate`
- 迁移后执行 `pnpm db:verify` (可选) 确认 schema 与最新定义一致

## 影响清单

### API 设计

- [Chat API 规范](../api/chat.md) - 完整的 REST API 接口设计

### 数据模型

- [数据模型设计](../../1-specs/data-models.md#chat-with-oc-聊天相关) - 聊天相关数据表结构

### 前端实现

- [聊天页面设计](../frontend/page-chat-with-character.md) - 聊天界面详细设计

### 后端实现

- [聊天服务设计](../backend/service-chat.md) - 聊天服务架构

### 配置文件

- [聊天配置与限制](../../1-specs/configs/chat-config.md) - 会员等级限制与实现说明
- 提示词模板配置路径：`src/configs/prompts/character-chat.json`

### 集成点

- **LLM 平台**: 复用 XiaoJingAI 客户端创建逻辑 (`src/app/api/anime-generation/optimize-prompt/route.ts`)
- **积分系统**: 复用 `src/services/credit.ts` 进行积分扣除和记录
- **用户认证**: 复用 `src/services/user.ts` 获取用户信息
- **角色数据**: 依赖 `src/models/character.ts` 获取角色设定

## 技术实现要点

### 1. LLM 调用 (多模型支持)

复用 optimize-prompt 中的 XiaoJingAI 客户端创建逻辑:

```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

const xiaojingAI = createOpenAICompatible({
  name: "xiaojing",
  apiKey: process.env.XIAOJING_API_KEY || "",
  baseURL: "https://api.open.xiaojingai.com/v1",
});

// 根据用户会员等级和选择的模型决定调用哪个模型
function getModelForUser(userTier: string, requestedModel: string): string {
  const limits = CHAT_LIMITS[userTier];
  const allowedModels = limits.availableModels;

  // 验证模型权限
  if (!allowedModels.includes(requestedModel)) {
    throw new Error(`Model ${requestedModel} not allowed for ${userTier} tier`);
  }

  // 免费用户只能使用gpt-3.5-turbo
  if (userTier === "Free" && requestedModel !== "gpt-3.5-turbo") {
    throw new Error("Free tier users can only use Base Model");
  }

  return requestedModel;
}

// 调用模型
async function callLLM(
  userTier: string,
  model: string,
  systemPrompt: string,
  messages: any[],
  maxTokens: number
) {
  const actualModel = getModelForUser(userTier, model);

  const result = streamText({
    model: xiaojingAI(actualModel),
    system: systemPrompt,
    messages: messages,
    temperature: 0.8,
    maxTokens: maxTokens,
  });

  return result;
}
```

**模型权限控制**:

- 免费用户: 只能使用 gpt-3.5-turbo，强制锁定
- 订阅会员: 可选择 gpt-3.5-turbo 或 gpt-4.1

**智能maxTokens限制**:

```typescript
function getMaxTokens(userTier: string, model: string): number {
  const limits = CHAT_LIMITS[userTier];

  // Premium Model 支持更大的maxTokens
  if (model === "gpt-4.1") {
    return Math.min(limits.maxTokensPerRound, 4096);
  }

  // Base Model 限制更严格
  return Math.min(limits.maxTokensPerRound, 2048);
}
```

### 2. 流式响应实现

使用 Server-Sent Events:

```typescript
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.textStream) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`
          )
        );
      }
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### 3. 角色提示词构建

动态生成 system prompt:

```typescript
function buildCharacterSystemPrompt(
  character: Character,
  config: ChatPromptConfig
): string {
  const template = config.system_prompt_template;

  return template
    .replace("{character_name}", character.name)
    .replace("{character_age}", character.age?.toString() || "unknown")
    .replace("{character_gender}", character.gender)
    .replace("{character_species}", character.species || "human")
    .replace("{personality_tags}", character.personality_tags?.join(", ") || "")
    .replace(
      "{background_story}",
      character.background_story || "No background provided."
    );
}
```

### 4. 成本控制

根据定价模型文档,单次对话目标成本 < $0.005:

#### Base Model (gpt-3.5-turbo) 成本分析

- **输入成本**: ~1000 tokens (系统提示词 + 上下文) × $1/M = $0.001
- **输出成本**: ~1000 tokens (角色回复) × $4/M = $0.004
- **总成本**: ~$0.005 (符合 1 MC = $0.005 的定价目标)

#### Premium Model (gpt-4.1) 成本分析

- **输入成本**: ~2000 tokens (更长上下文) × $1/M = $0.002
- **输出成本**: ~2000 tokens (更高质量回复) × $4/M = $0.008
- **总成本**: ~$0.01 (成本更高，但订阅用户可享受)

**成本控制措施**:

- 根据会员等级限制上下文窗口轮数(Free: 10轮 → Pro: 120轮)
- 限制单次输出最大 token (基于会员等级和模型)
- 优化系统提示词长度(控制在 500 tokens 内)
- 智能裁剪历史上下文，避免token浪费

**成本优化策略**:

```typescript
function optimizeCost(
  userTier: string,
  model: string,
  messages: ChatMessage[]
): { messages: ChatMessage[]; estimatedCost: number } {
  const limits = CHAT_LIMITS[userTier];
  let optimizedMessages = smartTrimContext(messages, userTier);

  // 估算成本
  const totalTokens = calculateTokens(optimizedMessages);
  const isPremiumModel = model === "gpt-4.1";

  const inputCost = totalTokens * 0.001; // $1/M
  const outputCost = totalTokens * 0.004; // $4/M
  const estimatedCost = inputCost + outputCost;

  return {
    messages: optimizedMessages,
    estimatedCost: isPremiumModel ? estimatedCost * 1.5 : estimatedCost,
  };
}
```

## 国际化

1. **页面文本**: 使用页面级国际化配置 `@i18n/pages/chat/en.json`
2. **错误提示**: 统一使用英文错误信息
3. **提示词模板**: 存储在配置文件中,支持多语言版本

示例国际化配置:

```json
{
  "title": "Chat with {characterName}",
  "subtitle": "Have a conversation with your character",
  "input_placeholder": "Type your message...",
  "send_button": "Send",
  "cost_hint": "This message will cost 1",
  "insufficient_credits": "Insufficient credits. You need 1 MC to send a message.",
  "recharge_button": "Recharge",
  "new_session": "New Chat",
  "session_list": "Chat History",
  "no_sessions": "No chat history yet",
  "streaming_indicator": "Typing...",
  "error_generation_failed": "Message generation failed. Credits have been refunded. Please try again.",
  "error_rate_limit": "You are sending messages too quickly. Please wait a moment."
}
```

## 测试要点

### 功能测试

1. 基础对话功能正常
2. 角色人设一致性(回复符合性格设定)
3. 多轮上下文连贯性
4. 流式响应无卡顿
5. 会话创建和恢复正常

### 边界测试

1. 积分为 0 时无法发送消息
2. 消息长度超限时提示错误
3. 上下文窗口正确截断
4. 频率限制生效

### 异常测试

1. LLM 调用失败时积分正确退还
2. 网络中断时重试机制
3. 并发对话时数据一致性

### 性能测试

1. 首字节响应时间 < 2s
2. 流式输出延迟 < 100ms
3. 历史消息加载速度 < 500ms
4. 并发 100 用户对话压力测试

---

## 存储策略与成本优化

### 分层存储架构

为优化性能和成本,聊天消息采用**热数据/冷数据分层存储**策略:

#### 热数据层 (PostgreSQL)

- **定义**: 最近 30 天内的消息 + 每个会话最近 100 条消息
- **存储位置**: `character_chats` 表主存储
- **访问速度**: < 50ms 查询延迟
- **用途**: 实时对话上下文、会话列表展示

#### 冷数据层 (Cloudflare R2)

- **定义**: 30 天前的旧消息(排除最近 100 条热数据)
- **存储位置**: R2 存储桶 `chat-archives/sessions/{session_id}/`
- **压缩方式**: gzip level 6 (约 70% 压缩率)
- **访问方式**: 按需恢复(用户导出时)
- **清理策略**: 主表记录标记 `archived_to_r2 = true` 后可删除 `content`

### R2 存储结构

```
Bucket: anividai-chat/
└── chat-archives/
    └── sessions/
        ├── {session_id_1}/
        │   ├── 2025-01-15-1642387200.json.gz
        │   └── 2025-02-20-1645113600.json.gz
        └── {session_id_2}/
            └── 2025-01-20-1642646400.json.gz
```

#### 归档文件格式

```json
{
  "archive_version": "1.0",
  "session_id": "sess-abc123",
  "archived_at": "2025-10-27T02:00:00Z",
  "message_count": 150,
  "compression_ratio": 0.28,
  "messages": [
    {
      "uuid": "msg-001",
      "role": "user",
      "content": "...",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

### 归档流程

```
每天凌晨 2 点 (Cron)
    ↓
查找超过 30 天的会话
    ↓
逐个会话处理:
  1. 查询旧消息(排除最近 100 条)
  2. JSON 序列化 + gzip 压缩
  3. 上传到 R2
  4. 更新数据库:
     - character_chats: 标记 archived_to_r2 = true
     - chat_sessions: 更新 archived_message_count
  5. 删除主表 content 字段(保留元数据)
```

### 成本对比分析

假设:

- 平均消息大小: 500 字节(包含元数据)
- 活跃用户: 100,000 人
- 人均年消息量: 10,000 条

#### 无归档方案

```typescript
const yearlyStorage = {
  totalMessages: 100000 * 10000, // 10 亿条
  avgSizePerMessage: 500, // 字节
  totalGB: (100000 * 10000 * 500) / 1024 / 1024 / 1024, // ~465 GB
  postgresqlCost: 465 * 0.115, // $0.115/GB/月 (AWS RDS)
  yearlyTotalCost: 465 * 0.115 * 12, // $642/年
};
```

#### 分层存储方案

```typescript
const optimizedStorage = {
  // 热数据 (20%)
  hotData: {
    sizeGB: 465 * 0.2, // 93 GB
    postgresqlCost: 93 * 0.115 * 12, // $128/年
  },

  // 冷数据 (80%, 压缩后 28%)
  coldData: {
    sizeGB: 465 * 0.8 * 0.28, // 104 GB (压缩后)
    r2Cost: 104 * 0.015 * 12, // $19/年 (R2 存储)
    operationsCost: 10, // 归档操作费用估算
  },

  yearlyTotalCost: 128 + 19 + 10, // $157/年
  savings: 642 - 157, // 节省 $485/年 (75%)
};
```

### 关键配置

归档策略在 `src/configs/chat/archive-config.json` 中定义:

- `archive_threshold_days`: 30 (归档阈值)
- `hot_messages_per_session`: 100 (热数据保留量)
- `enable_compression`: true (启用压缩)
- `compression_level`: 6 (gzip 压缩等级)

详见: [聊天配置文档](../../1-specs/configs/chat-config.md#5-归档策略配置-r2-物理归档)

---

## 后续优化方向

### 短期优化 (MVP 后 1-2 个月)

- 添加消息缓存机制(Redis)减少数据库查询
- 实现会话标题自动生成(基于首条消息摘要)
- 添加敏感词过滤
- 支持消息编辑和删除

### 中期扩展 (3-6 个月)

- 支持多模态输入(图片上传)
- 角色情绪检测与表情包自动生成
- 聊天数据分析仪表板(用户看板)
- 导出聊天记录为文本文件

### 长期规划 (6-12 个月)

- 语音输入输出(TTS/STT)
- 角色长期记忆系统(向量数据库)
- 群聊模式(多角色互动)
- 角色聊天 API 开放给第三方

## 变更历史

- 2025-10-27 FEAT-CHAT 初始设计: 基于 XiaoJingAI 平台,采用固定 1 MC/次计费策略,支持流式响应和可配置上下文窗口
- 2025-10-28 FEAT-CHAT 数据库迁移修复完成:
  - 修复 0017_add_chat_tables.sql 迁移文件,补齐 chat_sessions 表缺失的5个核心字段 (context_window_size, total_tokens_used, total_credits_used, archived_message_count, last_archived_at)
  - 修正 character_chats 表字段类型 (metadata/archive_metadata: text→json, archived_to_r2: varchar→boolean)
  - 调整索引定义与 schema.ts 完全一致
  - 使用 scripts/apply-chat-schema.js 成功应用到数据库
  - 验证通过: 数据库 schema 与代码定义完全一致
- 2025-11-14 FEAT-CHAT 精细化升级:
  - 增加 Base/Premium 模型区分，支持 gpt-3.5-turbo 和 gpt-4.1
  - 实现 4 级会员限制体系 (Free/Basic/Plus/Pro)
  - 完善限制检查机制：对话轮数、单轮 tokens、总 tokens 三重限制
  - 增加模型权限控制，免费用户强制锁定 Base Model
  - 优化上下文裁剪策略，智能保留重要对话历史
  - 优化成本控制，不同模型差异化成本管理
  - 完善升级引导流程，提升付费转化
