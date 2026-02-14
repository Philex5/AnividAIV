# 聊天体验优化调研报告

**文档版本**: 1.0
**创建日期**: 2026-02-03
**相关功能**: FEAT-CHAT
**状态**: 待实施

---

## 一、问题分析

### 当前痛点

1. **角色人设单薄**：仅依赖简单的性格标签和背景故事，缺乏立体感
2. **话题重复单调**：如用户只设定了"喜欢咖啡"，AI总是往咖啡话题引导，非常无趣
3. **信息不足时表现差**：用户提供的OC设定信息少时，回复缺乏多样性

### 根本原因

当前System Prompt过于简单：
```
You are {name}, a {age}-year-old {gender} {species} who works as a {role}.
Personality: {tags}.
Background: {story}.
Stay strictly in character...
```

**问题点**：
- 信息密度低，缺乏行为指导
- 没有利用quotes等已有数据
- 缺少话题多样性引导
- 没有示例对话供AI学习说话风格

---

## 二、业界最佳实践调研

### 2.1 Character.AI

**官方文档**: [Dialog Definitions](https://book.character.ai/character-book/advanced-creation/dialog-definitions)

**核心技术**：
1. **Example Dialogues（示例对话）** - 最有效的角色学习机制
2. **Rich System Prompt** - 多维度人设描述
3. **First Message/Greeting** - 定制化开场白

**示例对话格式**：
```
<START>
{{user}}: Hi! What do you like to do?
{{char}}: *twirls hair nervously* Oh, um, hello! I really love stargazing... there's something magical about being alone under the night sky, you know? *blushes* But I also enjoy reading fantasy novels when I can't go outside.

<START>
{{user}}: Do you like coffee?
{{char}}: *nods excitedly* I do! But nothing beats a warm cup of herbal tea while watching the sunset. It's my little ritual after a long day of training.

END_OF_DIALOG
```

**优势**：
- AI学习角色的说话方式、用词习惯、动作描写
- 通过多个场景示例，AI学会在不同话题间切换
- 包含动作、表情、语气变化，自然度大幅提升

### 2.2 SillyTavern

**官方文档**: [Character Card V3 Spec](https://github.com/kwaroran/character-card-spec-v3)

**核心技术**：
1. **Character Card V3** - 标准化角色卡片格式
2. **Lorebook系统** - 动态上下文注入
3. **World Info** - 世界观信息管理

**Lorebook机制**：
```json
{
  "lorebook": {
    "entries": [
      {
        "keys": ["coffee", "cafe", "drink"],
        "content": "The character visits a magical café called 'Starlight Brews' where they like to order cinnamon lattes. The café has floating fairy lights as decoration.",
        "priority": 5,
        "enabled": true
      },
      {
        "keys": ["magic", "spell"],
        "content": "{{char}} is currently training to master the Prism Flash technique. They sometimes accidentally cause small sparkles when nervous.",
        "priority": 10
      }
    ]
  }
}
```

**激活机制**：
```
用户消息: "Do you want to get some coffee?"
     ↓
检测到关键词 "coffee"
     ↓
激活对应Lorebook条目
     ↓
注入到Prompt
     ↓
AI回复包含丰富细节
```

### 2.3 JanitorAI

**核心技术**：
1. **结构化角色卡片** - 完整的人设定义
2. **动态场景激活** - 根据对话内容切换场景设定
3. **高级Prompt工程** - 精心设计的系统提示词

---

## 三、优化方案设计

### 方案一：增强System Prompt（✅ 已实施）

**实施优先级**: 立即可实施
**工作量**: 小
**预期效果**: 中

#### 1.1 扩展Prompt结构

```markdown
# Character Identity
You are {{char}}, a {{age}}-year-old {{gender}} {{species}} working as {{role}}.

# Personality Profile
Core Traits: {{personality_tags}}
Speaking Style: {{speaking_style_guidance}}
Behavioral Patterns: {{behavioral_patterns}}

# Background & Context
{{background_story}}

# Character Voice Examples
{{example_dialogues}}

# Conversation Guidelines
1. Stay strictly in character
2. Vary topics naturally
3. Ask questions about the user
4. Show emotional range
5. Use character-appropriate language

# Dynamic Topic Activation
{{lorebook_entries}}
```

#### 1.2 从现有数据提取更多信息

| 数据源 | 新用途 | 实现方式 |
|--------|--------|----------|
| `quotes` | 生成说话风格指导 | 分析语气、长度、标点 |
| `extended_attributes.MBTI` | MBTI说话风格映射 | INTJ→精准分析型 |
| `extended_attributes.Likes` | 话题扩展点 | 咖啡→也可能聊茶、甜点 |
| `skills.abilities` | 话题扩展点 | 火球术→魔法训练话题 |
| `appearance` | 感官描述增强 | 发光光环→可提及外貌 |

#### 1.3 说话风格推断逻辑

```typescript
// 根据personality_tags推断风格
if (tags.includes("Tsundere")) {
  style = "初期冷淡但偶尔流露温暖，说话带刺但实际关心";
} else if (tags.includes("Genki")) {
  style = "充满活力，经常使用感叹号，情绪表达丰富";
}

// 分析quotes获取额外提示
if (quotes.some(q => q.includes("!"))) {
  style += "使用感叹号表达情绪";
}
if (avgQuoteLength > 50) {
  style += "倾向于给出详细的长回复";
}
```

#### 1.4 行为指导生成

```typescript
const guidanceMap = {
  "Shy": ["可能犹豫分享个人想法", "随着对话逐渐敞开心扉"],
  "Tsundere": ["初期表现得 dismissive", "被指出善意会害羞"],
  "Genki": ["带来积极能量", "用动作和感叹表达热情"],
  // ...
};
```

---

### 方案二：Example Dialogues（示例对话系统）

**实施优先级**: 短期（3-5天）
**工作量**: 中
**预期效果**: 大

#### 2.1 数据结构扩展

在 `modules.personality` 中新增字段：

```typescript
personality: z.object({
  greeting: z.array(z.string()).optional(),
  personality_tags: z.array(z.string()).optional(),
  quotes: z.array(z.string()).optional(),
  // 新增：示例对话
  example_dialogues: z.array(z.object({
    scenario: z.string(),      // 场景描述
    user_input: z.string(),     // 用户输入（触发条件）
    char_response: z.string(),  // 角色回复
  })).optional(),
}).optional()
```

#### 2.2 示例对话模板

```
<START>
{{user}}: Hi! What do you like to do?
{{char}}: *twirls hair nervously* Oh, um, hello! I really love stargazing... there's something magical about being alone under the night sky, you know? *blushes* But I also enjoy reading fantasy novels when I can't go outside.

<START>
{{user}}: Do you like coffee?
{{char}}: *nods excitedly* I do! But nothing beats a warm cup of herbal tea while watching the sunset. It's my little ritual after a long day of training.

<START>
{{user}}: What's your special ability?
{{char}}: *eyes sparkle* I can manipulate starlight! *demonstrates by creating a small glowing orb* It's called... Prism Flash! Though I'm still learning to control it properly...

END_OF_DIALOG
```

#### 2.3 前端UI设计

在OC编辑器的Personality标签页添加"示例对话"编辑器：

```
┌─────────────────────────────────────────────────┐
│ Example Dialogues (示例对话)                     │
├─────────────────────────────────────────────────┤
│ [+ Add New Dialogue]                            │
├─────────────────────────────────────────────────┤
│ Scenario: 初次见面                              │
│                                                 │
│ User Input: Hi! What do you like to do?        │
│                                                 │
│ Char Response: *twirls hair* Oh, um, hello... │
│                                                 │
│ [Delete] [Edit]                                 │
├─────────────────────────────────────────────────┤
│ Scenario: 被问到爱好                            │
│                                                 │
│ User Input: What are your hobbies?             │
│                                                 │
│ Char Response: ...                              │
└─────────────────────────────────────────────────┘
```

---

### 方案三：Lorebook世界书系统

**实施优先级**: 中期（1-2周）
**工作量**: 大
**预期效果**: 大

#### 3.1 数据结构

```typescript
// 新增 modules.lorebook
lorebook: z.array(z.object({
  id: z.string(),
  keyword: z.array(z.string()),      // 触发关键词
  content: z.string(),                // 注入内容
  priority: z.number(),               // 优先级
  enabled: z.boolean().default(true),
})).optional()
```

#### 3.2 Lorebook条目示例

```json
{
  "lorebook": [
    {
      "id": "coffee_shop",
      "keyword": ["coffee", "cafe", "drink", "beverage"],
      "content": "The character visits a magical café called 'Starlight Brews' where they like to order cinnamon lattes. The café has floating fairy lights as decoration.",
      "priority": 5,
      "enabled": true
    },
    {
      "id": "magic_training",
      "keyword": ["magic", "spell", "ability", "power"],
      "content": "{{char}} is currently training to master the Prism Flash technique. They sometimes accidentally cause small sparkles when nervous.",
      "priority": 10
    },
    {
      "id": "companion",
      "keyword": ["friend", "alone", "together"],
      "content": "{{char}} has a small floating star companion named 'Twinkle' that follows them everywhere and occasionally comments on conversations.",
      "priority": 3
    }
  ]
}
```

#### 3.3 实现逻辑

```typescript
// ChatLorebookManager.ts
export class ChatLorebookManager {
  /**
   * 检测用户消息中触发关键词
   */
  detectTriggeredEntries(
    userMessage: string,
    lorebook: LorebookEntry[]
  ): LorebookEntry[] {
    return lorebook
      .filter(entry => entry.enabled)
      .filter(entry =>
        entry.keyword.some(kw =>
          userMessage.toLowerCase().includes(kw.toLowerCase())
        )
      )
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * 将激活的Lorebook条目注入Prompt
   */
  buildLorebookContext(entries: LorebookEntry[]): string {
    if (entries.length === 0) return "";

    return `\n# Relevant Context\n${entries.map(e => e.content).join("\n")}`;
  }
}
```

---

### 方案四：动态话题引导

**实施优先级**: 短期
**工作量**: 中
**预期效果**: 中

#### 4.1 话题轮换Prompt

```markdown
# Conversation Diversification Guidelines
When the conversation seems to stall on one topic, naturally pivot to:
- Personal backstory and memories
- Hobbies beyond the obvious (e.g., if they like coffee, also ask about food, travel, books)
- Opinions and thoughts on various subjects
- Emotional experiences and feelings
- Future goals and dreams
- The world/setting they live in

Never let the conversation circle endlessly around a single interest.
```

#### 4.2 话题追踪机制

```typescript
class TopicTracker {
  private topicHistory: Map<string, number> = new Map();

  /**
   * 检测话题是否过于重复
   */
  isTopicStale(currentTopic: string): boolean {
    const count = this.topicHistory.get(currentTopic) || 0;
    return count >= 3; // 同一话题3次后提示转换
  }

  /**
   * 生成话题转换提示
   */
  getTopicDiversificationHint(): string {
    return "Consider exploring a different aspect of the conversation. Ask about the user's experiences, thoughts, or feelings on related topics.";
  }
}
```

---

### 方案五：自动补充生成

**实施优先级**: 中期
**工作量**: 中
**预期效果**: 解决信息不足问题

#### 5.1 触发条件

当OC创建时信息不足：
- `personality_tags` < 3个
- 无 `quotes`
- 无 `example_dialogues`

#### 5.2 生成Prompt

```
You are an expert character dialogue writer. Given a character profile,
generate 3 example dialogues that demonstrate their personality.

Character Profile:
- Name: {name}
- Personality: {tags}
- Background: {story}
- Quotes: {quotes}

Generate example dialogues in this format:
<START>
{{user}}: [A natural question a user might ask]
{{char}}: [Character's response with actions, emotions, and unique voice]

Requirements:
1. Each dialogue showcases different aspects of personality
2. Include actions in asterisks *like this*
3. Vary the topics covered
4. Make responses feel natural and engaging
```

---

## 四、实施优先级

| 阶段 | 方案 | 工作量 | 效果 | 时间 |
|------|------|--------|------|------|
| **Phase 1** | 扩展System Prompt | 小 | 中 | ✅ 已完成 |
| **Phase 2** | Example Dialogues | 中 | 大 | 3-5天 |
| **Phase 3** | Lorebook系统 | 大 | 大 | 1-2周 |
| **Phase 4** | 话题追踪轮换 | 中 | 中 | 3-5天 |
| **Phase 5** | 自动补充生成 | 中 | 中 | 3-5天 |

---

## 五、技术实现要点

### 5.1 文件变更清单

```
src/configs/prompts/character-chat.json  ← ✅ 扩展prompt模板
src/services/chat/chat-prompt-builder.ts  ← ✅ 增强构建逻辑
src/types/oc.ts  ← 📋 扩展CharacterModulesSchema（方案二）
src/app/[locale]/(default)/character-detail/  ← 📋 UI：对话示例编辑器（方案二）
src/services/chat/chat-lorebook-manager.ts  ← 📋 新增（方案三）
src/services/chat/chat-topic-tracker.ts  ← 📋 新增（方案四）
```

### 5.2 Prompt Builder增强

```typescript
buildCharacterPrompt(character: Character): string {
  const modules = parseCharacterModules(character.modules);

  // 1. 基础身份
  const identity = this.buildIdentitySection(character, modules);

  // 2. 性格风格（从quotes推断）
  const speakingStyle = this.inferSpeakingStyle(modules);

  // 3. 行为指导
  const behavioralGuidance = this.buildBehavioralGuidance(modules);

  // 4. 示例对话（如果实现方案二）
  const examples = this.buildExampleDialogues(modules);

  // 5. 动态Lorebook（如果实现方案三）
  const lorebook = this.buildLorebookContext(modules);

  return template
    .replace("{{identity}}", identity)
    .replace("{{speaking_style}}", speakingStyle)
    .replace("{{behavioral_guidance}}", behavioralGuidance)
    .replace("{{example_dialogues}}", examples)
    .replace("{{lorebook}}", lorebook);
}
```

---

## 六、预期效果

| 优化项 | 改善描述 |
|--------|----------|
| **人设丰富度** | 从单一标签 → 多维度性格 + 说话风格示例 |
| **话题多样性** | 从重复单一话题 → 自动话题轮换 + Lorebook扩展 |
| **信息不足时** | 从简单重复 → 自动生成对话示例 + 推断补充 |
| **整体体验** | 机械感强 → 自然、生动、有记忆点的对话 |

---

## 七、参考资源

### 官方文档
- [SillyTavern Prompts Documentation](https://docs.sillytavern.app/usage/prompts/)
- [Character Card V3 Specification](https://github.com/kwaroran/character-card-spec-v3)
- [Character.AI Dialog Definitions](https://book.character.ai/character-book/advanced-creation/dialog-definitions)
- [Character.AI Example Conversations](https://book.character.ai/character-book/character-attributes/example-conversations)

### 社区资源
- [Reddit: Prompting for RP best practices](https://www.reddit.com/r/SillyTavernAI/comments/1aoaiga/prompting_for_rp_best_practices/)
- [Reddit: Example Dialogues Guide](https://www.reddit.com/r/CharacterAI/comments/1huz5mo/first_message_and_example_dialogues_how_to_make/)

---

## 八、变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-02-03 | 1.0 | 初始版本，完成调研和方案一实施 |

---

**Related**: FEAT-CHAT, docs/2-implementation/features/feature-chat.md
