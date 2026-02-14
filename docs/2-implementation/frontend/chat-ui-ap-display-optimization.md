# 聊天页面AP显示优化方案

## 背景与目标

### 优化需求

1. **移除AP进度条**：不在聊天页面显示AP使用进度条，减少UI复杂度
2. **精简AP显示**：仅在模型选择框左侧展示AP图标及剩余数量，保持界面简洁

### 设计理念

- **信息层级**：AP余额属于次要信息，不需要大篇幅展示
- **空间优化**：将AP显示嵌入到现有组件中，不占用额外空间
- **用户感知**：用户仍能清晰看到AP余额，但不会分散注意力

## 方案设计

### 1. UI布局调整

#### 1.1 当前布局

```
┌─────────────────────────────────────────┐
│ 角色头像 + 名称     [模型选择框]          │ ← ModelSelector位置
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ [消息列表区域]                          │
│ ...                                    │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 文本输入框              [发送按钮]       │ ← ChatInput位置
│ 成本提示 MC图标...                       │
│ 进度条：对话轮数 | Tokens  ████ ████ %   │ ← 需要移除
└─────────────────────────────────────────┘
```

#### 1.2 优化后布局

```
┌─────────────────────────────────────────┐
│ 角色头像 + 名称   AP: 128    [模型选择框] │ ← ModelSelector左侧显示AP
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ [消息列表区域]                          │
│ ...                                    │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ 文本输入框              [发送按钮]       │ ← ChatInput
│ 成本提示 MC图标...     ← 保留，不显示进度条 │
└─────────────────────────────────────────┘
```

### 2. 实现细节

#### 2.1 新增AP显示组件

```typescript
// src/components/chat/ChatQuotaIndicator.tsx
"use client";

interface ChatQuotaIndicatorProps {
  monthlyQuota: number;
  monthlyUsed: number;
  className?: string;
}

export function ChatQuotaIndicator({
  monthlyQuota,
  monthlyUsed,
  className = ""
}: ChatQuotaIndicatorProps) {
  const remaining = monthlyQuota - monthlyUsed;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <img
        src="/creamy/ap.webp"
        alt="AP"
        className="w-5 h-5 object-contain"
      />
      <span className="text-sm font-medium text-foreground">
        {remaining.toLocaleString()}
      </span>
    </div>
  );
}
```

#### 2.2 更新ModelSelector组件

在ModelSelector左侧集成AP显示：

```typescript
// src/components/chat/ModelSelector.tsx
// ... 现有代码 ...

interface ModelSelectorProps {
  availableModels: string[];
  currentModel: "base" | "premium";
  onModelChange: (model: "base" | "premium") => void;
  disabled?: boolean;
  userLevel?: string;
  // 新增AP相关属性
  apQuota?: {
    monthlyQuota: number;
    monthlyUsed: number;
  };
  // ... 其他props
}

export function ModelSelector({
  availableModels,
  currentModel,
  onModelChange,
  disabled = false,
  userLevel = "free",
  apQuota, // 新增
  texts = {}
}: ModelSelectorProps) {
  // ... 现有逻辑 ...

  return (
    <div className="flex items-center gap-3">
      {/* AP显示 - 新增 */}
      {apQuota && (
        <ChatQuotaIndicator
          monthlyQuota={apQuota.monthlyQuota}
          monthlyUsed={apQuota.monthlyUsed}
        />
      )}

      <Select
        value={isCurrentModelLocked ? "base" : currentModel}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        {/* ... SelectContent ... */}
      </Select>

      {/* 锁定提示 - 保持不变 */}
      {isCurrentModelLocked && (
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {texts.upgradeRequired || `Upgrade to ${userLevel === "plus" || userLevel === "pro" ? "Pro" : "Plus"} to use`}
          </span>
        </div>
      )}
    </div>
  );
}
```

#### 2.3 更新MessageList组件

传递AP配额数据给ModelSelector：

```typescript
// src/components/chat/MessageList.tsx
// ... 现有代码 ...

interface MessageListProps {
  messages: Message[];
  characterAvatar?: string;
  characterName?: string;
  userAvatar?: string | null;
  isLoading?: boolean;
  isGenerating?: boolean;
  emptyMessage?: string;
  modelSelector?: {
    availableModels: string[];
    currentModel: "base" | "premium";
    onModelChange: (model: "base" | "premium") => void;
    disabled?: boolean;
    userLevel?: string;
    // 新增AP配额数据
    apQuota?: {
      monthlyQuota: number;
      monthlyUsed: number;
    };
    texts?: {
      selectModel?: string;
      base?: string;
      premium?: string;
      baseBadge?: string;
      premiumBadge?: string;
      locked?: string;
      upgradeRequired?: string;
    };
  };
}

export default function MessageList({
  messages,
  characterAvatar,
  characterName,
  userAvatar,
  isLoading = false,
  isGenerating = false,
  emptyMessage = "No messages yet. Start the conversation!",
  modelSelector,
}: MessageListProps) {
  // ... 现有逻辑 ...

  // 在Character Header中传递AP配额
  {modelSelector && (
    <ModelSelector
      availableModels={modelSelector.availableModels}
      currentModel={modelSelector.currentModel}
      onModelChange={modelSelector.onModelChange}
      disabled={modelSelector.disabled}
      userLevel={modelSelector.userLevel}
      apQuota={modelSelector.apQuota} // 新增传递
      texts={modelSelector.texts}
    />
  )}
}
```

#### 2.4 更新ChatInput组件

移除进度条显示，保留成本提示：

```typescript
// src/components/chat/ChatInput.tsx
// ... 现有代码 ...

export default function ChatInput({
  onSend,
  disabled = false,
  isGenerating = false,
  maxLength = 2000,
  placeholder = "Type your message...",
  sendButtonText = "Send",
  costHint = "1 message will cost 1 MC",
  userCredits,
  creditsRequired = 1,
  insufficientCreditsMessage = "Insufficient credits",
  rechargeUrl = "/pricing",
  // 移除progressData相关props
  // progressData,
  // progressTexts = {},
}: ChatInputProps) {
  // ... 现有逻辑 ...

  return (
    <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur-md shadow-lg relative overflow-hidden">
      {/* ... Creamy decorations ... */}

      <div className="relative z-10 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            {/* ... Textarea ... */}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSendDisabled}
            className="group flex items-center justify-center gap-2 px-4 py-3 min-w-[44px] h-[44px] bg-gradient-to-r from-[#FF9800] to-[#FFC107] text-white font-medium rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
            title={sendButtonText}
          >
            {/* ... Shine effect ... */}
          </button>
        </div>

        {/* 成本提示 - 保留，进度条 - 移除 */}
        <div className="mt-0 flex items-center justify-start gap-2 flex-wrap">
          <div
            className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs transition-colors ${
              hasEnoughCredits
                ? "bg-muted/60 text-muted-foreground"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {hasEnoughCredits ? (
              <>
                <span>{costHint}</span>
                <img
                  src="/creamy/meow_coin.webp"
                  alt="MC"
                  className="w-5 h-5 object-contain"
                />
              </>
            ) : (
              <>
                {/* ... Insufficient credits ... */}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2.5 更新Page Client组件

获取并传递AP配额数据：

```typescript
// src/app/[locale]/(default)/chat/page-client.tsx
// ... 现有代码 ...

export default function ChatWithCharacterClient({
  pageData,
  characterUuid,
  sessionId: initialSessionId,
}: {
  pageData: ChatPageData;
  characterUuid?: string;
  sessionId?: string;
}) {
  // ... 现有状态 ...

  // 新增AP配额状态
  const [apQuota, setApQuota] = useState<{
    monthlyQuota: number;
    monthlyUsed: number;
  } | undefined>(undefined);

  // ... 现有逻辑 ...

  // 获取AP配额数据
  async function loadChatQuota() {
    try {
      const res = await fetch("/api/chat/quota");
      const json = await res.json();
      if (json?.success && json.data) {
        setApQuota({
          monthlyQuota: json.data.quota.monthly_quota,
          monthlyUsed: json.data.quota.monthly_used
        });
      }
    } catch (error) {
      console.error("Failed to load chat quota:", error);
    }
  }

  // 在组件挂载时加载AP配额
  useEffect(() => {
    loadSessions();
    loadUserCredits();
    loadUserInfo();
    loadChatConfig();
    loadChatQuota(); // 新增
  }, []);

  // ... 现有逻辑 ...

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* ... Character Selector Dialog ... */}

      {/* ... Sidebar ... */}

      {/* Main chat area */}
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {characterUuid ? (
          <>
            <MessageList
              messages={messages}
              characterAvatar={character?.avatar_url}
              characterName={character?.name}
              userAvatar={userAvatar}
              isLoading={isLoadingHistory}
              isGenerating={isStreaming}
              emptyMessage={pageData.no_sessions}
              modelSelector={{
                availableModels,
                currentModel,
                onModelChange: setCurrentModel,
                disabled: isStreaming,
                userLevel,
                apQuota, // 新增传递AP配额
                texts: {
                  selectModel: pageData.select_model,
                  base: pageData.model_base,
                  premium: pageData.model_premium,
                  baseBadge: pageData.model_base_badge,
                  premiumBadge: pageData.model_premium_badge,
                  locked: pageData.model_locked,
                  upgradeRequired: pageData.model_upgrade_required
                }
              }}
            />

            <ChatInput
              onSend={sendMessage}
              isGenerating={isStreaming}
              placeholder={pageData.input_placeholder}
              sendButtonText={pageData.send_button}
              costHint={pageData.cost_hint}
              userCredits={userCredits}
              insufficientCreditsMessage={
                pageData.insufficient_credits || "Insufficient credits"
              }
              rechargeUrl="/pricing"
              // 移除progressData和progressTexts传递
            />

            {/* ... Upgrade Dialog ... */}
          </>
        ) : (
          // ... Empty State ...
        )}
      </section>
    </div>
  );
}
```

### 3. API层设计

#### 3.1 新增获取聊天配额的API

```typescript
// src/app/api/chat/quota/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ChatQuotaService } from "@/services/chat/chat-quota-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.uuid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const quota = await ChatQuotaService.getCurrentQuota(session.user.uuid);

    return NextResponse.json({
      success: true,
      data: {
        quota: {
          monthly_quota: quota.monthly_quota,
          monthly_used: quota.monthly_used,
          remaining: quota.monthly_quota - quota.monthly_used,
          reset_at: quota.quota_reset_at,
        },
        stats: {
          total_used: quota.total_used,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get chat quota:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get quota" },
      { status: 500 },
    );
  }
}
```

## 响应式设计

### 桌面端（≥1024px）

```
┌─────────────────────────────────────────┐
│ 角色头像 + 名称   AP: 128    [模型选择框] │
│                                     ▼   │
└─────────────────────────────────────────┘
```

### 移动端（<1024px）

移动端保持相同布局，AP显示同样位于模型选择框左侧，节省空间。

## 状态管理

### AP余额更新时机

1. **页面加载时**：自动获取当前AP配额
2. **消息发送后**：刷新AP余额（通过loadChatQuota）
3. **每月重置后**：定时任务重置配额，用户下次操作时自动刷新

### 数据流向

```
API (/api/chat/quota)
    ↓
Page Client (loadChatQuota)
    ↓
MessageList (apQuota prop)
    ↓
ModelSelector (ChatQuotaIndicator)
    ↓
UI Display (AP图标 + 数量)
```

## 测试用例

### 功能测试

- [ ] 页面加载时正确显示AP余额
- [ ] 发送消息后AP余额实时更新
- [ ] AP余额为0时正确显示（仍显示数字，可能需要特殊样式）
- [ ] 移动端布局正常

### 响应式测试

- [ ] 桌面端（≥1024px）：AP显示在模型选择框左侧
- [ ] 平板端（768-1023px）：布局正常
- [ ] 移动端（<768px）：AP显示在模型选择框左侧，不换行

### 数据一致性测试

- [ ] AP余额与后端API返回一致
- [ ] 消息发送后余额正确减少
- [ ] 页面刷新后余额正确恢复

## 性能优化

### 1. 缓存策略

```typescript
// 在Page Client中缓存AP配额，减少API调用
const [apQuotaCache, setApQuotaCache] = useState<{
  data: any;
  timestamp: number;
} | null>(null);

// 检查缓存是否有效（5分钟有效期）
const isCacheValid =
  apQuotaCache && Date.now() - apQuotaCache.timestamp < 5 * 60 * 1000;

if (!isCacheValid) {
  loadChatQuota();
}
```

### 2. 懒加载

AP配额数据仅在聊天页面加载，不影响其他页面性能。

### 3. 错误处理

```typescript
// API调用失败时的降级方案
try {
  const quota = await ChatQuotaService.getCurrentQuota(session.user.uuid);
} catch (error) {
  console.error("Failed to load quota:", error);
  // 不阻断聊天功能，仅不显示AP配额
  setApQuota(undefined);
}
```

## 风险与应对

### 风险1：AP配额API延迟导致显示滞后

**概率**：低
**影响**：中

**应对**：

- 缓存机制减少频繁API调用
- 消息发送后立即更新UI，显示乐观更新
- API失败时降级为不显示AP，不阻断聊天

### 风险2：移动端空间不足导致布局拥挤

**概率**：中
**影响**：低

**应对**：

- AP显示使用紧凑布局（图标+数字）
- 监控移动端实际使用情况
- 如有必要可添加响应式隐藏：移动端不显示AP

## 收益评估

### 用户体验提升

1. **界面简洁**：移除进度条，减少视觉干扰
2. **信息精准**：AP余额在关键位置（模型选择处）显示，用户易于感知
3. **响应式一致**：桌面端和移动端保持一致的交互体验

### 开发效率提升

1. **组件复用**：ChatQuotaIndicator组件可在其他需要显示配额的地方复用
2. **代码清晰**：移除progressData相关逻辑，ChatInput组件更简洁
3. **易于维护**：AP显示逻辑集中管理，便于后续调整

## 实施计划

### 阶段1：创建AP显示组件（0.5天）

- [ ] 创建 `ChatQuotaIndicator` 组件
- [ ] 添加到 `src/components/chat/` 目录
- [ ] 编写单元测试

### 阶段2：更新ModelSelector组件（0.5天）

- [ ] 修改 `ModelSelector.tsx`，集成AP显示
- [ ] 适配现有接口，向后兼容
- [ ] 测试桌面端和移动端显示

### 阶段3：更新MessageList组件（0.5天）

- [ ] 修改 `MessageList.tsx`，传递AP配额数据
- [ ] 更新类型定义
- [ ] 测试组件间数据传递

### 阶段4：更新ChatInput组件（0.5天）

- [ ] 移除 `progressData` 和 `progressTexts` 相关代码
- [ ] 保留成本提示逻辑
- [ ] 测试聊天功能不受影响

### 阶段5：更新Page Client组件（0.5天）

- [ ] 新增 `loadChatQuota` 函数
- [ ] 集成配额API调用
- [ ] 测试完整流程

### 阶段6：创建API端点（1天）

- [ ] 创建 `/api/chat/quota/route.ts`
- [ ] 实现配额查询逻辑
- [ ] 测试API响应格式

### 阶段7：集成测试（1天）

- [ ] 功能测试：AP显示、消息发送、余额更新
- [ ] 响应式测试：桌面端、平板端、移动端
- [ ] 性能测试：API响应时间、页面加载速度
- [ ] 回归测试：确保现有聊天功能不受影响

**总预计时间**：4.5天

## 变更历史

- 2025-11-19 FEAT-CHAT-UI-AP-DISP-OPT 前端优化：移除AP进度条，仅在模型选择框左侧显示AP图标及数量（影响：新增ChatQuotaIndicator组件、更新ModelSelector组件、移除ChatInput进度条、新增/api/chat/quota API）

---

Related:

- feature-chat.md（聊天功能与配额整合文档）
- src/components/chat/ModelSelector.tsx
- src/components/chat/MessageList.tsx
- src/components/chat/ChatInput.tsx
- src/app/[locale]/(default)/chat/page-client.tsx
