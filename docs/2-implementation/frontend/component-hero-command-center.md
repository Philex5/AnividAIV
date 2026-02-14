# Component: HeroCommandCenter

Related: [FEAT-homepage-optimization](../features/feature-homepage-optimization.md)

## 1. 职责描述
`HeroCommandCenter` 是首页的核心交互组件，承载了品牌展示（扇形卡片）和核心功能入口（Command Bar）。它负责协调背景角色的展示逻辑与用户的创作意图输入。

## 2. 结构分解 (Component Structure)

```tsx
<HeroCommandCenter>
  {/* 背景层：保留原有的扇形角色卡片，作为氛围装饰 */}
  <DynamicFanBackground characters={...} />
  
  {/* 内容层：核心交互区域 */}
  <div className="center-content">
    <TitleSection title="..." subtitle="..." />
    
    <CommandBarContainer>
      <ModeTabs activeMode={mode} onChange={setMode} />
      <div className="input-wrapper">
        <AutoResizeInput 
          placeholder={dynamicPlaceholder}
          value={input}
          onChange={setInput}
          onEnter={handleAction}
        />
        <ActionIcon onClick={handleAction} />
      </div>
      <TagSuggestions tags={presetSuggestions} />
    </CommandBarContainer>
  </div>
</HeroCommandCenter>
```

## 3. 交互细节

### 3.1 Command Bar 视觉规范
- **容器**：`bg-white/5` 或 `bg-black/5`，配合 `backdrop-blur-xl`。
- **描边**：`border-white/10`，当 Focus 时通过 `animate-pulse` 展现微妙的流光效果。
- **模式切换**：
    - `OC`: 专注于角色设定。
    - `Art`: 专注于单张画作生成。
    - `World`: 专注于环境与世界观构建。

### 3.2 联动反馈
- **Hover/Focus 背景感应**：当用户在 Command Bar 键入时，背景的 `FanCards` 整体缩放 1.05 倍，并根据输入的字符长度动态调整模糊度，创造“穿越感”。

## 4. 关键文件路径
- `src/components/blocks/hero-command-center/index.tsx`: 主组件。
- `src/components/blocks/hero-command-center/command-bar.tsx`: 输入框逻辑。
- `src/components/blocks/hero-command-center/fan-background.tsx`: 从原 `DraggableHero` 抽离的背景组件。

## 5. 变更历史
- 2026-01-22 初始化组件设计。
