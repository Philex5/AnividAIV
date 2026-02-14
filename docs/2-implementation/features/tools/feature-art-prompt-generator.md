# Feature: Art Prompt Generator

Related: FEAT-art-prompt-generator

## 1. 功能背景与目标

### 1.1 背景
在 AI 绘画创作场景中,用户常遇到两类核心痛点:
1. **创作僵局 (Creative Block)**: 脑海一片空白,不知道画什么内容
2. **提示词工程门槛 (Prompt Engineering Barrier)**: 知道想画的内容,但不知如何用 AI 能理解的专业术语描述

### 1.2 目标
创建一个 `/art-prompt-generator` 页面,作为 Tools 类型内页,通过随机组合不同维度的艺术元素,为用户提供创意灵感:
- 帮助用户克服创作僵局,提供意外的创意组合
- 构建符合 AI 绘画标准的提示词,降低使用门槛
- 提供趣味性和惊喜感的交互体验
- 与 AI Anime Generator 无缝联动

### 1.3 设计理念
核心目标是**"惊喜感"、"趣味性"和"极简操作"**,而非复杂的参数配置。用户心态:"我不知道画什么,给我一个疯狂的点子吧!"

## 2. 验收标准

- [ ] 页面提供主体、动作、场景、风格等多维度词汇的随机组合
- [ ] 支持"老虎机"式的动画效果,增强趣味性
- [ ] 支持锁定功能:可锁定某些维度,仅重新生成未锁定的部分
- [ ] 生成的 prompt 可一键复制
- [ ] 支持跳转到 `/ai-anime-generator`,并自动填充生成的 prompt (使用 no preset 模式)
- [ ] 登录用户显示简化的工具界面
- [ ] 未登录用户显示完整营销页面(工具 + 营销组件)
- [ ] 响应式设计,桌面端和移动端体验完美
- [ ] 正确使用页面级国际化配置
- [ ] 使用主题配色系统

## 3. 系统级流程

### 3.1 用户流程
```
用户访问 /art-prompt-generator
  ↓
[未登录] → 展示营销页面 + 工具预览
[已登录] → 直接展示工具界面
  ↓
点击 "Generate" 按钮
  ↓
老虎机式动画展示随机过程
  ↓
展示生成的 prompt 组合
  ↓
[操作选项]
  - 锁定某些维度,重新生成
  - 复制 prompt
  - 跳转到 AI Anime Generator 使用
```

## 4. 数据模型与词库方案

### 4.1 数据存储方式
采用**前端静态配置**方式,不涉及数据库表创建:
- 词库存储在: `src/configs/prompts/art-prompt-generator.json`
- 优势: 无需 API 请求,响应速度快,适合 MVP 快速迭代
- 后续可扩展: 如需用户自定义词库,再引入数据库存储

### 4.2 词库结构设计

```json
{
  "subjects": [
    { "id": "sub_001", "text": "cyberpunk cat", "weight": 1 },
    { "id": "sub_002", "text": "sleepless astronaut", "weight": 1 },
    { "id": "sub_003", "text": "anthropomorphic teapot", "weight": 1 }
  ],
  "actions": [
    { "id": "act_001", "text": "dancing ballet", "weight": 1 },
    { "id": "act_002", "text": "melting", "weight": 1 },
    { "id": "act_003", "text": "weaving starlight", "weight": 1 }
  ],
  "settings": [
    { "id": "set_001", "text": "in underwater ruins", "weight": 1 },
    { "id": "set_002", "text": "on cotton candy clouds", "weight": 1 },
    { "id": "set_003", "text": "in a Victorian train station", "weight": 1 }
  ],
  "styles": [
    { "id": "sty_001", "text": "pixel art", "weight": 1 },
    { "id": "sty_002", "text": "minimalist line art", "weight": 1 },
    { "id": "sty_003", "text": "oil painting", "weight": 1 },
    { "id": "sty_004", "text": "ukiyo-e", "weight": 1 }
  ],
  "modifiers": [
    { "id": "mod_001", "text": "dramatic lighting", "weight": 1 },
    { "id": "mod_002", "text": "Rembrandt lighting", "weight": 1 },
    { "id": "mod_003", "text": "cinematic composition", "weight": 1 }
  ]
}
```

### 4.3 词库维度说明

| 维度 | 英文 | 说明 | 示例 |
|------|------|------|------|
| 主体 | Subject | 画面主角 | 赛博朋克猫、失眠的宇航员 |
| 动作 | Action | 主体正在做什么 | 跳芭蕾、融化、编织星光 |
| 场景 | Setting | 所在位置/环境 | 深海废墟、棉花糖云端 |
| 风格 | Style | 艺术风格 | 像素艺术、油画、浮世绘 |
| 修饰词 | Modifier | 光照、构图等细节 (可选) | 戏剧性光照、电影构图 |

### 4.4 组合公式

```
Final Prompt = Subject + Action + Setting + Style [+ Modifier]
```

示例输出:
```
"A cyberpunk cat dancing ballet in underwater ruins, pixel art style, dramatic lighting"
```

## 5. 页面结构设计

### 5.1 页面文件结构

```
src/app/[locale]/(default)/art-prompt-generator/
  ├── page.tsx                    # 服务端页面入口(处理 metadata、登录态判断)
  └── page-client.tsx             # 客户端组件(主要交互逻辑)

src/components/art-prompt-generator/
  ├── PromptGeneratorTool.tsx     # 核心工具组件
  ├── SlotMachineDisplay.tsx      # 老虎机动画展示组件
  ├── PromptDimensionCard.tsx     # 单个维度卡片(支持锁定/解锁)
  ├── GeneratedPromptDisplay.tsx  # 生成结果展示组件
  ├── Introduction.tsx            # 介绍组件(复用 oc-maker 模式)
  ├── Benefits.tsx                # 优势组件
  ├── HowToUse.tsx                # 使用指南组件
  ├── FAQ.tsx                     # 常见问题组件
  └── CTASection.tsx              # 行动号召组件

src/configs/prompts/
  └── art-prompt-generator.json   # 词库配置文件

src/i18n/pages/art-prompt-generator/
  ├── en.json                     # 英文翻译
  └── ja.json                     # 日文翻译(后续)
```

### 5.2 页面布局

**未登录用户**: 完整营销页面
```
[Hero Section - 标题 + 描述 + 工具预览]
[Tool Section - 可交互的生成器]
[Introduction - 功能介绍]
[How to Use - 使用步骤]
[Benefits - 核心优势]
[FAQ - 常见问题]
[CTA Section - 行动号召]
```

**已登录用户**: 简化工具页面
```
[Tool Section - 全屏生成器界面]
```

## 6. 核心组件交互设计

### 6.1 PromptGeneratorTool 组件

**状态管理**:
```typescript
interface PromptState {
  subject: PromptItem | null
  action: PromptItem | null
  setting: PromptItem | null
  style: PromptItem | null
  modifier: PromptItem | null
}

interface LockState {
  subject: boolean
  action: boolean
  setting: boolean
  style: boolean
  modifier: boolean
}

interface AnimationState {
  isGenerating: boolean
  currentAnimatingDimension: string | null
}
```

**核心功能**:
- `handleGenerate()`: 触发生成逻辑
- `handleLockToggle(dimension)`: 切换锁定状态
- `handleCopyPrompt()`: 复制最终 prompt
- `handleUseInGenerator()`: 跳转到 ai-anime-generator

### 6.2 SlotMachineDisplay 组件

**动画效果设计**:
```typescript
// 老虎机滚动动画
function slotMachineAnimation(dimension: string, finalValue: PromptItem) {
  // 1. 快速滚动阶段 (500ms)
  //    - 每 50ms 切换一次随机值
  //    - 视觉上形成"滚动"效果

  // 2. 减速阶段 (300ms)
  //    - 逐渐降低切换速度

  // 3. 停止 (最终值)
  //    - 展示 finalValue
  //    - 触发高亮效果
}
```

**分阶段动画**:
- Subject → Action → Setting → Style → Modifier
- 每个维度动画间隔 200ms,营造连贯感

### 6.3 PromptDimensionCard 组件

**UI 设计**:
```
┌─────────────────────────────┐
│ 🎭 Subject        [🔒 Lock] │  ← 标题 + 锁定按钮
├─────────────────────────────┤
│                             │
│   Cyberpunk Cat             │  ← 当前值(大字体)
│                             │
└─────────────────────────────┘
```

**交互状态**:
- 未锁定: 边框浅色,锁图标为打开状态
- 已锁定: 边框高亮,锁图标为关闭状态
- 生成中: 内容区域显示滚动动画

### 6.4 GeneratedPromptDisplay 组件

**功能**:
```
┌──────────────────────────────────────┐
│ Generated Prompt                     │
│ ──────────────────────────────────── │
│ A cyberpunk cat dancing ballet in    │
│ underwater ruins, pixel art style,   │
│ dramatic lighting                     │
│                                      │
│ [📋 Copy]  [🎨 Use in Generator]    │
└──────────────────────────────────────┘
```

## 7. 核心算法实现

### 7.1 随机选择算法

```typescript
// 工具函数: 从词库中随机选择
function getRandomItem(items: PromptItem[]): PromptItem {
  // 支持 weight 权重(后续可扩展)
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  const random = Math.random() * totalWeight

  let accumulated = 0
  for (const item of items) {
    accumulated += item.weight
    if (random <= accumulated) {
      return item
    }
  }

  return items[items.length - 1]
}
```

### 7.2 生成逻辑

```typescript
function generatePrompt(
  currentState: PromptState,
  lockState: LockState,
  wordBank: WordBank
): PromptState {
  return {
    subject: lockState.subject
      ? currentState.subject
      : getRandomItem(wordBank.subjects),
    action: lockState.action
      ? currentState.action
      : getRandomItem(wordBank.actions),
    setting: lockState.setting
      ? currentState.setting
      : getRandomItem(wordBank.settings),
    style: lockState.style
      ? currentState.style
      : getRandomItem(wordBank.styles),
    modifier: lockState.modifier
      ? currentState.modifier
      : getRandomItem(wordBank.modifiers)
  }
}
```

### 7.3 Prompt 拼接

```typescript
function assemblePrompt(state: PromptState): string {
  const parts = [
    state.subject?.text,
    state.action?.text,
    state.setting?.text,
    state.style?.text && `${state.style.text} style`,
    state.modifier?.text
  ].filter(Boolean)

  return `A ${parts.join(', ')}`
}
```

## 8. 与 AI Anime Generator 联动

### 8.1 跳转逻辑

```typescript
function handleUseInGenerator(prompt: string) {
  const url = `/ai-anime-generator?prompt=${encodeURIComponent(prompt)}&preset=none`
  router.push(url)
}
```

### 8.2 AI Anime Generator 侧接收

在 `ai-anime-generator` 页面需要:
1. 从 URL 参数读取 `prompt`
2. 从 URL 参数读取 `preset=none`(使用无预设模式)
3. 自动填充到提示词输入框

## 9. 国际化配置

### 9.1 翻译文件结构

文件路径: `src/i18n/pages/art-prompt-generator/en.json`

```json
{
  "metadata": {
    "title": "Art Prompt Generator | Free AI Art Inspiration Tool | AnividAI",
    "description": "Generate creative AI art prompts instantly. Break through creative blocks with our free random prompt generator for AI image generation.",
    "keywords": "art prompt generator, AI prompt, creative inspiration, prompt engineering"
  },
  "hero": {
    "title": "AI Art Prompt Generator",
    "subtitle": "Break through creative blocks with AI-powered random prompt combinations",
    "cta_button": "Start Generating"
  },
  "tool": {
    "generate_button": "Generate Inspiration",
    "generating": "Generating...",
    "dimensions": {
      "subject": "Subject",
      "action": "Action",
      "setting": "Setting",
      "style": "Style",
      "modifier": "Modifier"
    },
    "lock_tooltip": "Lock this dimension",
    "unlock_tooltip": "Unlock to regenerate",
    "copy_prompt": "Copy Prompt",
    "copy_success": "Copied to clipboard!",
    "use_in_generator": "Use in AI Generator"
  },
  "introduction": {
    "title": "What is Art Prompt Generator?",
    "description": "A creative tool that helps you overcome creative blocks by generating random AI art prompt combinations. Perfect for sparking inspiration and learning prompt engineering."
  },
  "how_to_use": {
    "title": "How to Use",
    "step_1": "Click the Generate button to create a random prompt combination",
    "step_2": "Lock dimensions you like and regenerate others",
    "step_3": "Copy the final prompt or use it directly in our AI generator"
  },
  "benefits": {
    "title": "Why Use Art Prompt Generator?",
    "items": [
      {
        "title": "Break Creative Blocks",
        "description": "Get instant inspiration when you're stuck"
      },
      {
        "title": "Learn Prompt Engineering",
        "description": "Discover effective prompt structures and keywords"
      },
      {
        "title": "Endless Combinations",
        "description": "Explore millions of unique prompt possibilities"
      }
    ]
  },
  "faq": {
    "title": "Frequently Asked Questions",
    "items": [
      {
        "question": "What is an art prompt generator?",
        "answer": "An art prompt generator creates random combinations of subjects, actions, settings, and styles to inspire AI art creation."
      },
      {
        "question": "How do I use the generated prompts?",
        "answer": "You can copy the prompt and use it in any AI image generator, or click 'Use in Generator' to try it directly on our platform."
      }
    ]
  }
}
```

## 10. 技术规范

### 10.1 样式规范
- 使用主题配色系统: `bg-background`, `text-foreground`, `border-border`
- 避免颜色硬编码
- 参考: `src/components/ui/button.tsx`

### 10.2 响应式设计
```typescript
// 桌面端: 横向布局,卡片并排
// 移动端: 纵向堆叠,单列展示

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
  {/* Dimension cards */}
</div>
```

### 10.3 错误处理
- 词库加载失败: 展示友好错误提示
- 所有错误信息使用英文,不使用中文硬编码

## 11. 影响清单

### 11.1 新增文件
- [x] `src/app/[locale]/(default)/art-prompt-generator/page.tsx`
- [x] `src/app/[locale]/(default)/art-prompt-generator/page-client.tsx`
- [x] `src/components/art-prompt-generator/PromptGeneratorTool.tsx`
- [x] `src/components/art-prompt-generator/SlotMachineDisplay.tsx`
- [x] `src/components/art-prompt-generator/PromptDimensionCard.tsx`
- [x] `src/components/art-prompt-generator/GeneratedPromptDisplay.tsx`
- [x] `src/components/art-prompt-generator/Introduction.tsx`
- [x] `src/components/art-prompt-generator/Benefits.tsx`
- [x] `src/components/art-prompt-generator/HowToUse.tsx`
- [x] `src/components/art-prompt-generator/FAQ.tsx`
- [x] `src/components/art-prompt-generator/CTASection.tsx`
- [x] `src/components/art-prompt-generator/types.ts`
- [x] `src/configs/prompts/art-prompt-generator.json`
- [x] `src/i18n/pages/art-prompt-generator/en.json`
- [x] `src/types/pages/art-prompt-generator.ts`
- [x] `docs/2-implementation/frontend/page-art-prompt-generator.md`

### 11.2 修改文件
- [x] `src/app/[locale]/(default)/ai-anime-generator/page.tsx` - 添加 URL 参数接收逻辑
- [x] `src/components/anime-generator/AnimeGenerator.tsx` - 处理 prompt/preset 和 URL 清理
- [x] `src/services/page.ts` - 暴露 `getArtPromptGeneratorPage`

### 11.3 依赖项
- 无新增外部依赖
- 复用现有 UI 组件库 (shadcn/ui)
- 使用 React Hooks: useState, useEffect, useCallback
- 使用 next-intl 进行国际化

### 11.4 相关文档
- **API**: 无(纯前端实现)
- **数据模型**: 无(静态配置)
- **前端**: 已创建 `docs/2-implementation/frontend/page-art-prompt-generator.md`
- **后端**: 无

## 12. 开发任务拆解

详细任务清单参考: `docs/3-operations/tasks/tasks-feature-art-prompt-generator.md`

预估任务:
1. 创建词库配置文件 (1h)
2. 实现核心工具组件 (4h)
3. 实现动画效果 (2h)
4. 创建营销组件 (2h)
5. 配置国际化 (1h)
6. 实现联动功能 (1h)
7. 响应式优化 (1h)
8. 测试与调试 (2h)

总计: 约 14 小时

## 13. 测试要点

### 13.1 功能测试
- [ ] 点击生成按钮,能正确随机组合各维度
- [ ] 锁定功能正常工作,锁定的维度不会改变
- [ ] 复制功能正常,能复制完整 prompt
- [ ] 跳转到 AI Anime Generator,参数正确传递

### 13.2 UI/UX 测试
- [ ] 老虎机动画流畅自然
- [ ] 响应式布局在各尺寸设备正常显示
- [ ] 主题配色正确应用

### 13.3 国际化测试
- [ ] 切换语言后,所有文本正确显示
- [ ] 无硬编码中文或英文

## 14. 变更历史

| 日期 | 变更内容 | 影响范围 |
|------|---------|---------|
| 2026-01-02 | FEAT-art-prompt-generator 初始设计 | 新页面、新组件、新配置 |
