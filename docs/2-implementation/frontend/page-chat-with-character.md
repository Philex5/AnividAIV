# 前端页面设计: Chat with Character

Related: FEAT-CHAT ([feature-chat.md](../features/feature-chat.md))

## 页面概述

**页面路径**: `/chat`

**功能描述**: 用户与指定 OC 角色进行实时对话的聊天界面,支持同步响应、多轮上下文、会话管理、多模型选择、限制提示和升级引导等功能。

**访问权限**: 非登录态可访问营销页面，登录后可使用完整聊天功能

**代码位置**: `src/app/[locale]/(default)/chat/page.tsx`

**核心功能**:

### 非登录态页面 (营销页面)

- Hero区域：title + description + CTA按钮
- 营销内容：Introduction、Benefits、How to Use、FAQ、CTA Section
- SEO优化：结构化数据 (SoftwareApplication、FAQPage)
- 登录弹窗：点击CTA按钮后弹出登录弹窗，登录后跳转到聊天界面

### 登录态页面 (聊天界面)

- Base/Premium模型区分与选择
- 对话轮数和Tokens使用进度条
- 达到限制时的升级引导弹窗
- 清空对话重新开始功能

---

## 1. 路由设计

### 1.1 URL 参数

```typescript
// URL 格式
/chat/[uuid]

// 参数说明
{
  character_uuid: string;  // 必填,角色 UUID
  session_id?: string;     // 可选,会话 ID(新会话不传)
}
```

### 1.2 路由示例

```
// 新对话
//chat/[uuid]

// 继续历史会话
//chat/[uuid]?session_id=def-456
```

---

## 2. 页面布局

### 2.1 整体结构

```
┌─────────────────────────────────────────────────┐
│ Header (顶部导航栏)                               │
│  ┌─────────────────┐  ┌─────────────────────┐   │
│  │  会话列表按钮    │  │ [AP 数]  [模型选择器]│   │
│  └─────────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │          角色头像框 + 角色名                  │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │        MessageList (消息列表区域)            │ │
│ │                                             │ │
│ │        [支持虚拟滚动,自动滚动到底部]          │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │  对话轮数: 5/10   Tokens：ProgressBar 89%  │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ ChatInput (输入框 + 发送按钮)                │ │
│ │ 积分提示: "本次对话将消耗 1 AP"  轮数/tokens使用进度 │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

侧边栏(桌面端)
┌────────────┬───────────────────────────────────┐
│            │                                   │
│  Session   │        主聊天区域                  │
│  Sidebar   │     (如上所示)                     │
│            │                                   │
│  会话列表   │                                   │
│            │                                   │
└────────────┴───────────────────────────────────┘
侧边栏左上方是 + 创建新对话并通过下拉框选择已有oC

达到限制时的升级引导弹窗
┌─────────────────────────────────────────────┐
│           已达到对话轮数上限                  │
│                                             │
│  当前等级: Free                              │
│  升级可解锁更长对话记忆                       │
│                                             │
│  ┌──────────────┐ ┌──────────────────────┐  │
│  │  升级会员     │ │  清空对话，重新开始   │  │
│  └──────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 2.2 响应式布局

#### 桌面端 (≥1024px)

- 左侧显示会话列表侧边栏 (宽度 280px)
- 右侧为主聊天区域
- 消息列表高度自适应,输入框固定在底部

#### 移动端 (<1024px)

- 隐藏侧边栏
- 全屏显示聊天界面
- 可通过左上角按钮打开会话列表抽屉(Drawer)

---

## 3. 登录状态判断与页面结构

### 3.1 登录状态判断流程

```typescript
// src/app/[locale]/(default)/chat/page.tsx
export default async function ChatWithCharacterPage() {
  // 检查用户登录状态
  let user;
  try {
    user = await getUserInfo();
  } catch (error) {
    console.log("User not authenticated");
  }

  // 登录态：显示简化聊天界面
  if (user) {
    return (
      <ChatWithCharacterClient
        pageData={pageData}
        characterUuid={character_uuid}
        sessionId={session_id}
        isLoggedIn={true}
      />
    );
  }

  // 非登录态：显示完整营销页面
  return (
    <div className="min-h-full bg-background">
      {/* 结构化数据 */}
      <script type="application/ld+json">
        {JSON.stringify(softwareApplicationJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqPageJsonLd)}
      </script>

      {/* 营销页面组件 */}
      <ChatMarketingPageClient
        pageData={pageData}
        characterUuid={character_uuid}
        sessionId={session_id}
      />
    </div>
  );
}
```

### 3.2 非登录态页面结构 (营销页面)

```typescript
// src/app/[locale]/(default)/chat/page-client-marketing.tsx
export default function ChatMarketingPageClient() {
  return (
    <div className="min-h-full bg-background">
      {/* Page 1: Hero Section */}
      <ChatMarketingHero
        pageData={{
          title: "Chat with Your Original Characters",
          description: "Have conversations with your original characters...",
          tagline: "AI-Powered Character Chat"
        }}
        onSignInSuccess={handleSignInSuccess}
      />

      {/* Page 2: Introduction */}
      <Introduction pageData={pageData} />

      {/* Page 3: Benefits */}
      <Benefits pageData={pageData} />

      {/* Page 4: How to Use */}
      <HowToUseSection pageData={pageData} />

      {/* Page 5: FAQ */}
      <OCMakerFAQ pageData={pageData} />

      {/* Page 6: CTA */}
      <CTASection pageData={pageData} />

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
```

### 3.3 登录态页面结构 (聊天界面)

```typescript
// src/app/[locale]/(default)/chat/page-client.tsx
export default function ChatWithCharacterClient({ isLoggedIn }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* 完整聊天界面 (与之前相同) */}
    </div>
  );
}
```

---

## 5. 核心组件

### 4.1 ChatMarketingHero (营销Hero区域)

**位置**: `src/components/chat/ChatMarketingHero.tsx`

**功能**: 非登录态页面的Hero区域，包含独立的title、description、CTA按钮和登录弹窗

**Props**:

```typescript
interface ChatMarketingHeroProps {
  pageData: {
    heroTitle?: string; // Hero区域专用标题
    heroDescription?: string; // Hero区域专用描述
    heroTagline?: string; // Hero区域专用标签
    startChatting?: string; // CTA按钮文案
    signInPrompt?: string; // 登录弹窗标题
  };
  onSignInSuccess?: () => void;
}
```

**UI设计**:

```typescript
<div className="min-h-[calc(100svh-48px)] lg:h-[calc(100vh-48px)] bg-background flex items-center justify-center">
  {/* Background gradient */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />

  <div className="container text-center space-y-8">
    {/* Badge */}
    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full text-primary">
      <MessageCircle className="w-4 h-4" />
      {pageData.heroTagline}
    </div>

    {/* Title */}
    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
      {pageData.heroTitle}
    </h1>

    {/* Description */}
    <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
      {pageData.heroDescription}
    </p>

    {/* CTA Buttons */}
    <div className="flex flex-col sm:flex-row gap-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button size="lg">
            <Sparkles className="mr-2 h-5 w-5" />
            {pageData.startChatting}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          {/* Google/GitHub登录按钮 */}
        </DialogContent>
      </Dialog>
    </div>
  </div>
</div>
```

**实现要点**:

1. **独立文案**: Hero区域使用独立的`heroTitle`、`heroDescription`、`heroTagline`字段，不与Introduction混淆
2. **背景装饰**: 使用渐变背景和模糊光晕效果
3. **登录弹窗**: 使用Dialog组件，直接渲染Google/GitHub登录按钮
4. **登录成功回调**: 登录成功后自动刷新页面，进入聊天界面
5. **特性高亮**: 底部显示3个核心特性点

---

### 4.2 ChatMarketingPageClient (营销页面容器)

**位置**: `src/app/[locale]/(default)/chat/page-client-marketing.tsx`

**功能**: 非登录态营销页面的容器组件，整合所有营销内容

**Props**:

```typescript
interface ChatMarketingPageClientProps {
  pageData: ChatPageData;
  characterUuid?: string;
  sessionId?: string;
}
```

**页面结构**:

- Hero区域 (ChatMarketingHero)
- Introduction介绍
- Benefits优势
- HowToUse使用指南
- FAQ常见问题
- CTA行动号召
- Footer页脚

---

### 4.3 MessageList (消息列表)

**位置**: `src/components/chat/MessageList.tsx`

**功能**: 展示对话历史消息,支持虚拟滚动和自动滚动到底部

**Props**:

```typescript
interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean; // 加载历史消息中
  isGenerating?: boolean; // AI 正在生成回复
  onLoadMore?: () => void; // 滚动到顶部触发加载更多
  characterAvatar: string; // 角色头像 URL
}

interface ChatMessage {
  uuid: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  is_streaming?: boolean; // 是否正在流式输出
}
```

**实现要点**:

1. **虚拟滚动**: 使用 `react-window` 或 `@tanstack/react-virtual` 优化长列表性能
2. **自动滚动**: 新消息添加时自动滚动到底部
3. **加载更多**: 滚动到顶部时触发历史消息加载
4. **时间戳分组**: 相邻消息间隔超过 5 分钟时显示时间分隔符

**示例布局**:

```
┌─────────────────────────────────────────┐
│  [2025-10-27 10:00]                     │
│                                         │
│        ┌─────────────────┐              │
│        │ 你好!           │ [用户消息]    │
│        └─────────────────┘              │
│                                         │
│  ┌─────────────────┐                    │
│  │ [Avatar] 你好!   │ [角色消息]        │
│  │ 很高兴见到你...   │                   │
│  └─────────────────┘                    │
│                                         │
│  [2025-10-27 10:05]                     │
│                                         │
│        ┌─────────────────┐              │
│        │ 今天天气真好     │              │
│        └─────────────────┘              │
│                                         │
│  ┌─────────────────┐                    │
│  │ [Avatar] 是啊... │ [正在生成中...]     │
│  └─────────────────┘                    │
└─────────────────────────────────────────┘
```

---

### 3.2 MessageBubble (消息气泡)

**位置**: `src/components/chat/MessageBubble.tsx`

**功能**: 单条消息的展示组件,区分用户和角色消息

**Props**:

```typescript
interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  avatar?: string; // 角色消息显示头像
  created_at?: string;
  is_streaming?: boolean; // 是否正在流式输出
  onCopy?: () => void; // 复制消息
  onRegenerate?: () => void; // 重新生成(仅角色消息)
}
```

**样式设计**:

#### 用户消息 (右侧)

```css
/* 气泡 */
background: hsl(var(--primary));
color: hsl(var(--primary-foreground));
border-radius: 1rem 1rem 0.25rem 1rem;
padding: 0.75rem 1rem;
max-width: 70%;
align-self: flex-end;
```

#### 角色消息 (左侧)

```css
/* 气泡 */
background: hsl(var(--muted));
color: hsl(var(--foreground));
border-radius: 1rem 1rem 1rem 0.25rem;
padding: 0.75rem 1rem;
max-width: 70%;
align-self: flex-start;

/* 布局 */
display: flex;
gap: 0.5rem;

/* 头像在左侧 */
[Avatar] [Content]
```

**加载状态**:

- 等待响应时显示 "thinking" 动画
- 响应完成后一次性显示完整内容

---

### 3.3 ChatInput (输入框)

**位置**: `src/components/chat/ChatInput.tsx`

**功能**: 消息输入框,支持多行输入、发送按钮、积分提示

**Props**:

```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean; // 禁用状态(如积分不足、正在生成)
  isGenerating?: boolean; // AI 正在生成回复
  maxLength?: number; // 最大字符数(默认 2000)
  userCredits?: number; // 用户当前积分
}
```

**布局**:

```
┌─────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐ │
│ │ [Textarea]                              │ │
│ │ 输入消息...                              │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 本次对话将消耗 1 AP | 剩余: 100 AP   [发送] │
└─────────────────────────────────────────────┘
```

**功能要点**:

1. **多行输入**: 使用 `<Textarea>` 组件,支持自动高度调整
2. **快捷键**:
   - `Enter` 发送消息
   - `Shift + Enter` 换行
3. **字符计数**: 显示 `{当前字符数}/{最大字符数}`
4. **积分提示**:
   - 积分充足: "本次对话将消耗 1 AP | 剩余: {n} AP"
   - 积分不足: "积分不足,需要 1 AP [充值]"
5. **发送按钮**:
   - 正在生成时显示"停止"按钮
   - 输入为空或禁用时置灰
6. **限制状态**:
   - 达到限制时输入框锁定并禁用发送按钮
   - 显示"已达到对话限制，请升级会员或清空对话"

---

### 3.4 ModelSelector (模型选择器)

**位置**: `src/components/chat/ModelSelector.tsx`

**功能**: 位于页面右上角，允许用户选择聊天模型

**Props**:

```typescript
interface ModelSelectorProps {
  userTier: "Free" | "Basic" | "Plus" | "Pro";
  availableModels: string[];
  currentModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean; // 达到限制时禁用
}
```

**UI设计**:

#### 免费用户 (不可切换)

```
┌────────────────────────────────────┐
│ Base Model                         │
| Premium Model [🔒sub_only]         │
└────────────────────────────────────┘
- 下拉菜单禁用
- 显示 @public/imgs/icons/members/sub_only.webp 图标
- Tooltip: "升级到订阅以使用Premium Model"
```

#### 订阅用户 (可切换)

```
┌────────────────────────────────────┐
│ Premium Model ▼                   │
└────────────────────────────────────┘
  ├─ Base Model (gpt-3.5-turbo)
  └─ Premium Model (gpt-4.1) ✓
```

**实现要点**:

1. **权限控制**: 根据用户会员等级返回可用模型列表
2. **默认选择**: 订阅用户默认选择Premium Model
3. **切换确认**: 切换模型时提示"切换模型将清空当前对话历史"
4. **实时更新**: 切换后立即更新进度条和限制配置

---

### 3.5 ChatProgressBar (进度条组件)

**位置**: `src/components/chat/ChatProgressBar.tsx`

**功能**: 实时展示对话轮数和Tokens使用进度(tokens数量不直接展示，而是使用进度条)

**Props**:

```typescript
interface ChatProgressBarProps {
  tier: "Free" | "Basic" | "Plus" | "Pro";
  currentRound: number;
  maxRounds: number;
  currentTokens: number;
  maxTokens: number;
  isAtLimit: boolean;
  onClearChat?: () => void;
}
```

**UI设计**:

```
┌────────────────────────────────────────────────────── ┐
│  对话轮数：5/10 (50%)     Tokens： ████████████░░░░ 75%|
───────────────────────────────────────────────────────
```

**进度条及轮数字体颜色逻辑**:

- 0-70%: 绿色 (正常)
- 70-90%: 黄色 (警告)
- 90-100%: 红色 (危险)

**更新机制**:

```typescript
// 响应完成后更新进度
useEffect(() => {
  // 计算当前已使用的tokens (基于消息长度粗略估算)
  const totalTokens = calculateTokens(messages);
  setCurrentTokens(totalTokens);

  // 检查是否达到限制
  if (totalTokens >= maxTokens || currentRound >= maxRounds) {
    setIsAtLimit(true);
    setDisabled(true);
  }
}, [messages, currentRound]);
```

---

### 3.6 UpgradeDialog (升级引导弹窗)

**位置**: `src/components/chat/UpgradeDialog.tsx`

**功能**: 达到限制时弹出，引导用户升级或清空对话，升级按钮仅提供给免费用户，当前不支持订阅会员升级等级。

**Props**:

```typescript
interface UpgradeDialogProps {
  isOpen: boolean;
  type: "rounds" | "tokens"; // 限制类型
  tier: string;
  onUpgrade: () => void;
  onClearChat: () => void;
  onClose: () => void;
}
```

**UI设计**:

```typescript
<div className="dialog-overlay">
  <div className="dialog-content">
    <div className="dialog-header">
      <h3>
        {type === 'rounds'
          ? '已达到对话轮数上限'
          : '已达到Tokens使用上限'}
      </h3>
      <button onClick={onClose}>×</button>
    </div>

    <div className="dialog-body">
      <p className="current-tier">当前等级: {tier}</p>
      <p className="upgrade-hint">升级可解锁更长对话记忆:</p>
    </div>

    <div className="dialog-actions">
      <Button onClick={onUpgrade} className="upgrade-btn">
        升级会员
      </Button>
      <Button variant="outline" onClick={onClearChat}>
        清空对话，重新开始
      </Button>
    </div>
  </div>
</div>
```

---

### 3.7 SessionSidebar (会话列表侧边栏)

**位置**: `src/components/chat/SessionSidebar.tsx`

**功能**: 展示用户的所有聊天会话,支持切换和创建新会话

**Props**:

```typescript
interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onSessionClick: (sessionId: string) => void;
  onNewSession: (characterUuid: string) => void;
  isLoading?: boolean;
}

interface ChatSession {
  session_id: string;
  character: {
    uuid: string;
    name: string;
    avatar_url: string;
  };
  title: string;
  message_count: number;
  last_message_at: string;
  preview: string;
}
```

**布局**:

```
┌────────────────────────┐
│ [+ New Chat]           │
├────────────────────────┤
│ ┌────────────────────┐ │
│ │ [Avatar] 你好!      │ │ [当前会话高亮]
│ │ 很高兴...          │ │
│ │ 2h ago · 24 msgs   │ │
│ └────────────────────┘ │
│                        │
│ ┌────────────────────┐ │
│ │ [Avatar] 今天      │ │
│ │ 天气真好...         │ │
│ │ 1d ago · 8 msgs    │ │
│ └────────────────────┘ │
│                        │
│ [Load More...]         │
└────────────────────────┘
```

**样式要点**:

- 宽度: 280px (桌面端固定)
- 当前会话: 背景色高亮 (`bg-accent`)
- 会话项: Hover 效果,圆角卡片
- 预览文本: 单行省略 (`truncate`)
- 时间显示: 相对时间 (刚刚、5分钟前、1小时前...)

---

## 4. 状态管理

### 4.1 页面状态

```typescript
interface ChatPageState {
  // 角色信息
  character: Character | null;

  // 当前会话
  currentSession: {
    session_id: string;
    title: string;
    message_count: number;
  } | null;

  // 消息列表
  messages: ChatMessage[];

  // 会话列表
  sessions: ChatSession[];

  // 模型信息
  userTier: "Free" | "Basic" | "Plus" | "Pro";
  availableModels: string[];
  currentModel: string; // 'gpt-3.5-turbo' | 'gpt-4.1'

  // 限制配置
  limits: {
    maxRounds: number; // Free: 10, Basic: 30, Plus: 60, Pro: 120
    maxTokensPerRound: number; // Free: 512, Basic: 1024, Plus: 2048, Pro: 4096
    maxTotalTokens: number; // Free: 2000, Basic: 6000, Plus: 15000, Pro: 32000
  };

  // 进度监控
  currentRound: number; // 当前对话轮数
  currentTokens: number; // 当前已使用tokens
  isAtLimit: boolean; // 是否达到限制

  // UI 状态
  isLoadingMessages: boolean; // 加载历史消息中
  isGenerating: boolean; // AI 正在生成回复
  isSidebarOpen: boolean; // 侧边栏是否打开(移动端)
  showUpgradeDialog: boolean; // 是否显示升级引导弹窗

  // 用户信息
  userCredits: number; // 用户当前积分
}
```


## 5. 国际化配置

使用页面级配置: pageData

**文件位置**: `src/i18n/pages/chat/en.json`

### 5.1 营销页面配置

```json
{
  "hero": {
    "title": "Chat with Your Original Characters",
    "description": "Have conversations with your original characters...",
    "tagline": "AI-Powered Character Chat"
  },
  "introduction": {
    "title": "What is AI Chat",
    "description": "Experience the power of AI-driven character conversations...",
    "tagline": "AI Chat on AnividAI"
  },
  "benefits": {
    "section_title": "Key Features of Character Chat",
    "section_subtitle": "Everything you need for meaningful conversations",
    "real_time": {
      "title": "Real-time Conversations",
      "description": "Engage in natural, fluid conversations..."
    },
    "multiple_characters": {
      "title": "Multiple Characters",
      "description": "Chat with all your created characters..."
    }
  },
  "how_to_use": {
    "title": "How to Chat with Your Characters",
    "step1": {
      "title": "Create or Select a Character",
      "description": "Use OC Maker to create..."
    }
  },
  "faq": {
    "title": "Frequently Asked Questions",
    "q1": {
      "question": "What is Chat with OCs?",
      "answer": "Chat with OCs allows you to..."
    }
  },
  "call_to_action": {
    "title": "Ready to Chat with Your Characters?",
    "description": "Create your first character...",
    "start_chatting": "Start Chatting Now"
  }
}
```

**注意**: Hero区域使用独立的`hero`字段配置，与Introduction的文案分离，确保各区域文案可以独立定制。

### 5.2 聊天功能配置

```json
{
  "input_placeholder": "Type your message...",
  "send_button": "Send",
  "cost_hint": "This message will cost 1",
  "select_character": "Select a character to start chatting",
  "progress_conversation_rounds": "Conversation Rounds",
  "upgrade": {
    "maxRoundsTitle": "Conversation Round Limit Reached",
    "upgradeNow": "Upgrade Now"
  }
}
```

---

## 6. 性能优化

### 6.1 虚拟滚动

使用 `@tanstack/react-virtual` 优化长消息列表:

### 6.2 防抖和节流

```typescript
import { useMemo } from "react";
import { debounce } from "lodash";

// 输入框防抖
const debouncedOnChange = useMemo(
  () =>
    debounce((value: string) => {
      // 保存草稿到 localStorage
      localStorage.setItem(`draft-${sessionId}`, value);
    }, 500),
  [sessionId]
);

// 滚动加载节流
const throttledLoadMore = useMemo(
  () =>
    throttle(() => {
      loadMoreMessages();
    }, 1000),
  []
);
```

### 6.3 缓存策略

```typescript
// 使用 SWR 缓存会话列表
import useSWR from "swr";

const { data: sessions } = useSWR("/api/chat/sessions", fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 5000,
});

// 使用 React Query 缓存历史消息
import { useQuery } from "@tanstack/react-query";

const { data: history } = useQuery({
  queryKey: ["chat-history", sessionId],
  queryFn: () => fetchHistory(sessionId),
  staleTime: 60000, // 1 分钟内不重新请求
});
```

---

## 7. 错误处理

### 7.1 错误边界

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ChatPage() {
  return (
    <ErrorBoundary
      FallbackComponent={ChatErrorFallback}
      onError={(error) => {
        console.error('Chat error:', error);
        // 上报错误到监控系统
      }}
    >
      <ChatContent />
    </ErrorBoundary>
  );
}

function ChatErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-destructive">Failed to load chat: {error.message}</p>
      <Button onClick={resetErrorBoundary}>Try Again</Button>
    </div>
  );
}
```

### 7.2 错误提示

```typescript
import { toast } from "sonner";

// 积分不足
if (error.code === "INSUFFICIENT_CREDITS") {
  toast.error("Insufficient credits", {
    description: "You need 1 AP to send a message.",
    action: {
      label: "Recharge",
      onClick: () => router.push("/pricing"),
    },
  });
}

// 频率限制
if (error.code === "RATE_LIMIT_EXCEEDED") {
  toast.error("Rate limit exceeded", {
    description: `Please wait ${error.retry_after} seconds.`,
  });
}

// LLM 调用失败
if (error.code === "LLM_SERVICE_UNAVAILABLE") {
  toast.error("Message generation failed", {
    description: "Credits have been refunded. Please try again.",
  });
}
```

---

## 8. 可访问性

### 8.1 键盘导航

- `Tab`: 焦点在输入框和发送按钮间切换
- `Ctrl/Cmd + K`: 打开会话列表(快捷键)
- `Esc`: 关闭侧边栏/抽屉

### 8.2 屏幕阅读器

```typescript
// 消息气泡
<div role="article" aria-label={`Message from ${role === 'user' ? 'you' : characterName}`}>
  {content}
</div>

// 流式输出状态
<span className="sr-only" aria-live="polite">
  {isGenerating ? 'Generating response...' : 'Response complete'}
</span>

// 输入框
<Textarea
  aria-label="Message input"
  aria-describedby="cost-hint"
  aria-invalid={!hasEnoughCredits}
/>
<div id="cost-hint" className="text-sm">
  This message will cost 1 {AP Icon}
</div>
```

---

## 9. 测试要点

### 9.1 单元测试

```typescript
// MessageBubble.test.tsx
describe('MessageBubble', () => {
  it('renders user message correctly', () => {
    render(<MessageBubble role="user" content="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows streaming indicator for assistant message', () => {
    render(<MessageBubble role="assistant" content="Hi" is_streaming />);
    expect(screen.getByText(/Hi▊/)).toBeInTheDocument();
  });
});

// ChatInput.test.tsx
describe('ChatInput', () => {
  it('disables send button when input is empty', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('shows insufficient credits warning', () => {
    render(<ChatInput onSend={jest.fn()} userCredits={0} />);
    expect(screen.getByText(/Insufficient credits/i)).toBeInTheDocument();
  });
});
```

### 9.2 集成测试

```typescript
// ChatPage.test.tsx
describe('ChatPage', () => {
  it('loads character and history on mount', async () => {
    render(<ChatPage searchParams={{ character_uuid: 'abc-123', session_id: 'def-456' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('你好!')).toBeInTheDocument();
    });
  });

  it('sends message and displays streaming response', async () => {
    const user = userEvent.setup();
    render(<ChatPage searchParams={{ character_uuid: 'abc-123' }} />);

    const input = screen.getByPlaceholderText(/Type your message/i);
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // 验证用户消息立即显示
    expect(screen.getByText('Hello')).toBeInTheDocument();

    // 验证流式响应逐步显示
    await waitFor(() => {
      expect(screen.getByText(/Hi/i)).toBeInTheDocument();
    });
  });
});
```

---

## 变更历史

- 2025-10-27 FEAT-CHAT 初始版本: 定义聊天页面完整 UI/UX 设计,包含消息列表、输入框、会话管理等核心组件,支持流式响应和响应式布局
- 2025-11-14 FEAT-CHAT 精细化: 增加模型选择器、进度条组件、升级引导弹窗等UI组件;完善状态管理，增加模型权限检查、限制监控、清空对话等功能;优化交互流程和错误处理
- 2025-11-21 FEAT-CHAT 通信方式变更：从流式SSE改为同步JSON响应，简化前端处理逻辑，等待完整响应后一次性显示
- 2025-11-28 FEAT-CHAT SEO优化: 增加非登录态营销页面展示，包括Hero区域、营销内容介绍、结构化数据等，用于SEO和获取搜索流量;登录状态判断参考oc-maker实现;复用营销组件样式;修正所有营销组件的字段映射，确保文案正确加载;Hero区域配置独立文案字段，与Introduction模块分离
