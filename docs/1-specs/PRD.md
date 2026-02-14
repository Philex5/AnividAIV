# AnividAI - Your AI Studio for Anime Worlds

## 1. 产品定位与愿景

### Slogan
**"AnividAI – Your AI Studio for Anime Worlds"**

### 核心定义
AnividAI 是一个**All-in-One AI Anime Studio (一站式 AI 动漫工作室)**。
我们整合了绘画、视频、对话与叙事工具，为创作者提供从“角色设定”到“内容生产”的完整工作流。
无论你是要制作一张精美的插画、一段流畅的动漫视频，一篇故事或者一部连载漫画，AnividAI 都能提供专业且一致的 AI 辅助。

### 交互哲学 (Interaction Philosophy)
- **Unified Workflow (统一工作流)**: 打通生图、生视频、对话等独立模组，让资产（如角色形象， 创作结果）在不同工具间无缝流转。
- **Prompt-First (指令优先)**: 保持高效的指令输入体验，同时提供可视化控件辅助复杂操作。
- **Consistency by Design (原生一致性)**: 通过内置的 **Character Studio** (原 OC Maker) 解决 AI 创作最大的痛点——“角色一致性”，但**不强制**用户必须从捏人开始，用户也可以直接进行自由创作。

### 风格边界 (Scope)
**我们专注深耕：**
- ✅ **ACGN (Anime, Comic, Game, Novel)**：日系动漫、美漫/韩漫、游戏CG风。
- ✅ **Stylized Fantasy**：风格化 3D、粘土/手办风、水彩/厚涂艺术/semi-realistic

**我们不涉及：**
- ❌ **Photorealism (纯写实摄影)**：我们不与通用写实模型竞争，旨在维护社区独特的“幻想”与“二次元”文化氛围。

### 价值主张 (Value Proposition)
- **All-in-One Creativity**: 告别割裂的工具链。在这里，你可以完成从角色设计、场景构建、插画绘制到视频生成的全过程。
- **Effortless Consistency**: 依托强大的 Character 锚点技术，让你的角色在不同画面、不同媒介（图/视频）中保持形象统一。
- **From Idea to Content**: 不仅仅是生成素材，更提供漫画排版、视频运镜、剧本管理等工具，帮助用户产出最终成品（Final Product）。

### 目标用户
- **动漫创作者 / 自媒体**: 需要高效产出动漫风格视频、插画、漫画的博主。
- **独立叙事者 / 小说家**: 有精彩故事但无绘画技能，需要将作品视觉化（漫画/PV）的创作者。
- **OC 玩家 / 企划主**: 需要为自己的角色生成大量物料、完善设定的用户。
- **普通二次元爱好者**: 想要简单快速地创作属于自己的动漫作品的用户。

---

## 2. 产品演进路线图 (Roadmap)

我们将按照以下四个阶段打造最强动漫创作工作室：

### Phase 1: The Studio Foundation (基础创作套件) - *2025 Q4* (Done)
核心功能落地，确保单点工具的极致体验与基础互通, 支持用户获取灵感，创作和分享
- **关键交付**: 
    -[x] **Anime Generator**: 强大的文生图/图生图工具，提供多种风格，用户也可不使用预置风格，自行在prompt中定义。
    -[x] **Anime Video Generator**: 图生视频工具，提供预置的风格和视角控制。
    -[x] **Character Studio (Beta)**: (原 OC Maker) 强大的角色创建工具，支持一句话生成详细设定，作为全平台的**逻辑锚点**。
    -[x] **Worlds（Beta）**: 世界观设定，可以为生成提供氛围、设定的参考。
    -[x] **Chat with Character (Beta)**: 赋予角色性格，进行基础互动。
    -[x] **Tools Pack 1**: Action Figure Generator(手办风生成), Sticker Generator(表情包生成)。
    
### Phase 2: Storytelling & Production (叙事与生产力) - *Current (2026 Q1 - Q2)*
重点从“生成片段”转向“生成作品”。引入剧本管理与连贯性工具，服务于长内容的生产。同时完善基础社交闭环。
- **核心交付**:
    - **Community Foundation (基础社交)**:
        - 作品的点赞 (Like)、收藏 (Favorite)、评论 (Comment) 功能。
    - **Story Lab (剧本实验室)**: 
        - **Script Management**: 支持上传/编辑小说或剧本章节，提供章节版本与草稿保存。
        - **Scene Breakdown**: AI 自动将文本拆解为 Scene/Shot 结构，并自动绑定登场角色、场景、道具。
        - **Shot Planning Workspace**: 提供镜头语义编辑（景别/机位/运动/时长）与重排能力，支持人工校正。
        - **Storyboard Package**: 产出可直接进入 Manga Studio / Cinematic Video Engine 的结构化 storyboard 包（含镜头、提示词、资产引用）。
        - **Continuity Assist**: 提供角色一致性约束与镜头衔接建议（可选插帧与转场标签）。
        - **Run Logs & Recovery**: 提供阶段状态追踪（draft/parsing/planning/generating/packaging）与失败后局部重试能力。
    - **Manga Studio (漫画工作室)**: 
        - 基于 Story Lab 的分镜，自动生成多格漫画/条漫。
        - 智能排版与气泡填词 (Auto-Typesetting)。
    - **Cinematic Video Engine**: 
        - **Story-to-Video**: 基于剧本分镜批量生成视频片段。
        - **Montage Maker (拼接器)**: 将多个视频片段智能拼接，支持转场与卡点，生成完整的 Episode。
    - **Consistency Suite (一致性套件)**:
        - **Character Reference Sheets**: 一键生成角色的三视图（正/侧/背）及表情表，固化视觉特征。
        - **Scene Manager**: 固定“场景资产”（如主角卧室、教室），确保背景在不同镜头中的结构统一。
    - **Nana Banana Gallery**: 
        - 升级灵感库，支持 **"Use this Style with My Character"**，一键套用风格。

### Phase 3: Community & Gamification (社区与游戏化) - *2026 Q3*
从“工具”转变为“社区”。重点在于人与人的连接，以及通过游戏化机制提高用户留存率。
- **核心交付**:
    - **Follow & Feed System**: 
        - 关注 (Follow) 喜爱的创作者。
        - 动态流 (Dynamic Feed) 展示关注者的更新及推荐内容。
    - **Gamification & Badges (徽章系统)**: 
        - **成就体系**: “高产画师”、“故事大王”、“社区红人”等成就徽章，展示在个人主页。
        - **激励**: 获得徽章可奖励 MC 积分或解锁特殊头像框。
    - **Weekly Challenges (官方活动)**:
        - 定期发布创作主题（如“赛博朋克周”），社区投票评选，优胜者获奖励。
    - **Unified World Settings (Lite)**: 
        - 将 World 定义为轻量级的“风格与氛围预设包”，支持全站创作风格统一。

### Phase 4: Creator Marketplace (创作者市场) - *2026 Q4+*
建立创作者经济，让用户既能创作也能获益 (Create to Earn)。
- **关键交付**:
    - **Asset Store (素材商店)**: 
        - 允许用户上架自己调教好的 **Prompt 模板**、**World 风格预设**、甚至是 **OC 设子**。
        - 其他用户消耗 MC 积分购买/解锁。
    - **Co-creation**: 
        - **Remix Mechanism**: 允许用户付费/免费“混创”他人的公开作品。
        - **Collaborative Stories**: 多人共同维护一个连载故事。

### 候选功能 (Backlog)
- **Visual Novel Maker**: 简单的 AVG 游戏生成器。
- **Voice & Audio**: 引入角色语音生成 (TTS) 与口型同步。

---

## 4. 系统联动机制 (System Synergy)

平台的核心在于**“资产复用 (Asset Reusability)”**与**“连接 (Connection)”**：

1.  **Character Anchor (角色锚点)**:
    *   用户创建的 Character 不仅仅是一个设定，而是一个**可调用的资产**。
    *   在 Story Lab 中，剧本提及角色名时，系统自动调用对应的视觉特征。
    *   在 Manga/Video 中，无需重复描述外貌，只需 Tag 角色即可。

2.  **Cross-Media Pipeline (跨媒介流水线)**:
    *   **Text -> Visuals**: Story Lab 剧本 -> 漫画 / 视频。
    *   **Chat -> Story**: 聊天记录可转化为故事脚本，进而二创。
    *   **Story -> Gallery**: 完整的作品（漫画/视频）发布到社区，支持连载订阅。

3.  **Economy Loop (经济循环)**:
    *   **Create**: 高级用户创造优质资产（Prompt/World/OC）。
    *   **Share/Sell**: 上架市场或公开 Remix。
    *   **Earn**: 获得积分奖励，抵扣订阅费用，形成良性激励。

---

## 5. UI/UX 设计规范 (Visual Identity)

### 核心风格：Glassmorphism 2.0 (极致通透)
- **视觉语言**： “奶油新拟态 + 轻微玻璃感”，强调 ACGN 的未来感与梦幻感。

---

## 6. 会员订阅系统 (Membership)
采用积分会员制，专用积分单位MC消费内容 + 订阅会员专属权益（如加速生成、高清下载、版权商用等）。

---

## 7. 数据与隐私
- **版权归属**：用户拥有创作内容的版权（依据会员等级区分商用权）。
- **隐私保护**：支持私有作品库。
- **内容合规**：全年龄向内容，严格过滤 NSFW。

---

*更新时间：2026年02月11日*

## 变更历史
- 2026-02-11 FEAT-story-lab 对标 StoryGen-Atelier 本地实现补充：新增 Story Lab 阶段状态追踪与失败恢复能力定义。
- 2026-02-11 FEAT-story-lab Story Lab 设计方案升级：新增 Scene/Shot 结构化拆解、镜头语义编辑、storyboard package 与连贯性辅助定义。
- 2026-02-06 UPDATE 路线图重构：确立 Phase 2/3/4 分别为“叙事生产”、“社区游戏化”与“创作者市场”；引入 Story Lab 与 Manga Studio。
- 2026-02-03 REFACTOR 产品定位重构：确立 "Your All-in-One AI Anime Studio" 愿景，从“世界构建”转向“全能创作平台”，强化工具属性与工作流。
- 2026-01-26 UPDATE 调整 Free Plan 赠送 MC 额度：50 -> 100。
- 2026-01-22 REFACTOR 产品定位重构：确立 "Create anime worlds" 新愿景 (Legacy)。
- 2026-01-20 FEAT-ui-ux-refactor 视觉重构方案落地：引入玻璃态 2.0。
- 2026-01-05 FEAT-OC-REBUILD OC系统重构。
