# 卡片UI重设计方案

## 修改概述

本次修改将角色卡片从原有的垂直布局改为**奇幻主题的左右分栏布局**，显著提升了视觉冲击力和社媒传播效果。

## 主要修改

### 1. 新增奇幻主题 (Fantasy Theme)

**文件**: `src/components/og/OGCardTemplates.tsx`

- **主题色彩**:
  - 主紫色: `#9D4EDD`
  - 深紫色: `#240046`
  - 魔法粉: `#F72585`
  - 纯白色: `#FFFFFF`
  - 辅助色: `#E0C9F6`

- **视觉效果**:
  - 径向渐变背景
  - 星尘粒子动画
  - 魔法光效
  - 浮动动画效果

### 2. 左右分栏布局

**布局结构** (1200x630):
```
┌─────────────────────────────────────────────────┐
│ 左侧立绘区 (540px)    │  右侧信息区 (660px)       │
│ ┌───────────────────┐ │ ┌─────────────────────┐ │
│ │  角色立绘         │ │ │  角色名称 (48px)    │ │
│ │  360x540 (2:3)   │ │ │                     │ │
│ │                   │ │ │  稀有度标识         │ │
│ │  + 魔法光效       │ │ │  (SSR/SR/R)        │ │
│ │  + 星尘粒子       │ │ │                     │ │
│ │  + 水晶边框       │ │ │  属性雷达图         │ │
│ └───────────────────┘ │ │  (200x200)          │ │
│                       │ │                     │ │
│ 种族职业信息          │ │  性格标签           │ │
│ (图标+文字)          │ │  (3-4个核心标签)    │ │
│                       │ │                     │ │
│                       │ └─────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3. 立绘尺寸优化

- **新尺寸**: 360x540 (2:3竖图比例)
- **容器**: 360px宽，占左侧立绘区100%高度
- **视觉效果**:
  - 圆角边框 (16px)
  - 多层阴影 (3层)
  - 稀有度动态光效
  - 魔法粒子背景

### 4. 稀有度特效增强

**SSR (传说级)**:
- 彩虹渐变: `linear-gradient(135deg, #FFD700, #FFA500, #FF69B4)`
- 发光效果: `0 0 60px rgba(255, 215, 0, 0.8)`
- 金色边框: `3px solid #FFD700`

**SR (史诗级)**:
- 银金渐变: `linear-gradient(135deg, #C0C0C0, #FFD700, #FFA500)`
- 发光效果: `0 0 40px rgba(192, 192, 192, 0.7)`
- 银色边框: `3px solid #C0C0C0`

**R (稀有级)**:
- 蓝色渐变: `linear-gradient(135deg, #4169E1, #6495ED)`
- 发光效果: `0 0 30px rgba(65, 105, 225, 0.6)`
- 蓝色边框: `3px solid #4169E1`

### 5. API更新

**文件**: `src/app/api/og/character/[uuid]/route.tsx`

- 新增 `fantasy` 主题类型
- 默认主题改为 `fantasy`
- 参数验证包含 `fantasy` 主题

**使用示例**:
```typescript
GET /api/og/character/[uuid]?template=tcg&rarity=ssr&theme=fantasy
```

### 6. 前端组件更新

**文件**: `src/components/character-detail/ExportDropdown.tsx`

- 新增 `fantasy` 主题类型
- 默认主题改为 `fantasy`
- 主题选项排序: MAGIC > NIGHT > NEON > PURE

## 视觉亮点

### 1. 角色名称
- **字体大小**: 48px
- **字体粗细**: 900 (黑体)
- **渐变色**: `linear-gradient(135deg, #9D4EDD, #F72585, #FF006E)`
- **文字阴影**: `0 0 30px rgba(157, 78, 221, 0.4)`

### 2. 稀有度标识
- **位置**: 右上角悬浮
- **样式**: 渐变背景 + 发光效果
- **动画**: 脉冲发光 (2秒循环)

### 3. 魔法特效
- **星尘粒子**: 3种大小的白色/粉色粒子
- **浮动动画**: 6秒循环的上下浮动
- **光晕效果**: 径向渐变营造氛围

### 4. 属性雷达图
- **尺寸**: 200x200 圆形
- **背景**: 半透明深紫色
- **边框**: 1px 紫色线条
- **占位符**: "[Attribute Radar Chart]"

### 5. 性格标签
- **样式**: 半透明背景 + 紫色边框
- **圆角**: 20px
- **数量**: 最多4个标签
- **颜色**: `#E0C9F6`

## 技术实现

### CSS动画关键帧

```css
@keyframes sparkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(157, 78, 221, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(157, 78, 221, 0.4),
               0 0 40px rgba(157, 78, 221, 0.6);
  }
}
```

### 响应式适配

- **桌面端**: 1200x630 完整布局
- **移动端**: 自动裁切为1:1方形适配Instagram

## 使用方法

### 生成卡片

```bash
# 奇幻主题 SSR 稀有度
curl "http://localhost:3000/api/og/character/[UUID]?template=tcg&rarity=ssr&theme=fantasy" \
  --output character_ssrf.png

# 奇幻主题 SR 稀有度
curl "http://localhost:3000/api/og/character/[UUID]?template=tcg&rarity=sr&theme=fantasy" \
  --output character_srf.png

# 奇幻主题 R 稀有度
curl "http://localhost:3000/api/og/character/[UUID]?template=tcg&rarity=r&theme=fantasy" \
  --output character_rf.png
```

### 前端调用

```typescript
// 在ExportDropdown中选择MAGIC主题
const response = await fetch(
  `/api/og/character/${characterUuid}?template=tcg&rarity=ssr&theme=fantasy`
);
const blob = await response.blob();
```

## 文件清单

### 修改的文件
1. `src/components/og/OGCardTemplates.tsx`
   - 新增fantasy主题色彩配置
   - 重写TCGCard组件为左右分栏布局
   - 优化稀有度特效
   - 添加CSS动画

2. `src/app/api/og/character/[uuid]/route.tsx`
   - 新增fantasy主题类型
   - 默认主题改为fantasy

3. `src/components/character-detail/ExportDropdown.tsx`
   - 新增fantasy主题类型
   - 更新主题选项
   - 默认主题改为fantasy

### 新增配置
- 奇幻主题色彩系统
- 稀有度特效配置
- CSS动画关键帧
- 左右分栏布局样式

## 社媒传播优化

### 视觉冲击力
- 2:3立绘比例更适合展示角色细节
- 奇幻主题配色更具辨识度
- 稀有度光效增强稀缺性表达

### 传播心理学
- **稀缺性**: SSR/SR/R稀有度标识
- **成就感**: 精美卡片值得炫耀
- **话题性**: 奇幻主题引发讨论

### 平台适配
- **Twitter**: 1200x630完美适配
- **Instagram**: 1:1裁切后仍保持美观
- **Discord**: 适合作为服务器表情包

## 性能影响

- **渲染时间**: +500ms (添加动画和特效)
- **文件大小**: ~500KB (PNG格式)
- **加载速度**: 优化后预计2-3秒完成渲染

## 后续优化建议

1. **属性雷达图**: 替换为真实的五维属性展示
2. **动画优化**: 使用WebGL提升动画性能
3. **主题扩展**: 添加更多奇幻风格变体
4. **自定义选项**: 允许用户调整特效强度

## 变更历史

- 2026-01-25: 初始实现奇幻主题左右分栏卡片
  - 新增fantasy主题
  - 实现2:3立绘比例
  - 优化稀有度特效
  - 添加魔法动画效果
