# FEAT-ui-ux-refactor: UI/UX 视觉重构方案

Related: [PRD.md](../../1-specs/PRD.md), [ui-ux-design.md](../../1-specs/ui-ux-design.md)

## 1. 背景与目标
为了提升 AnividAI 的品牌感和用户体验，我们将基于现代动漫审美进行视觉重构。参考 `debug/ui_reference.png` 的风格，引入高度玻璃态（Glassmorphism）、大圆角、悬浮感布局以及更具冲击力的排版。

**核心约束：**
- 保持主题第一主色（暖橙 `#FF9500`）和第二主色（吉祥物粉 `#C07895`）不变。
- 采用响应式设计，确保桌面端和移动端的完美体验。
- 拒绝硬编码颜色，全部使用 CSS 变量。

## 2. 视觉设计系统更新

### 2.1 玻璃态系统 (Glassmorphism 2.0)
在现有基础上增强透明度和模糊感，创造更深邃的层次感。

| 变量名 | 建议值 | 说明 |
| :--- | :--- | :--- |
| `--glass-bg` | `rgba(255, 255, 255, 0.45)` | 更通透的白色玻璃背景 |
| `--glass-bg-dark` | `rgba(15, 23, 42, 0.65)` | 深色模式下的玻璃背景 |
| `--glass-blur` | `24px` | 增加模糊度，提升高级感 |
| `--glass-border` | `1px solid rgba(255, 255, 255, 0.3)` | 亮色模式高光边缘 |
| `--glass-border-dark` | `1px solid rgba(255, 255, 255, 0.1)` | 深色模式细微边缘 |

### 2.2 圆角与间距 (Soft Radius)
从 `8px-12px` 转向更大、更圆润的风格。

| 变量名 | 建议值 | 说明 |
| :--- | :--- | :--- |
| `--radius-lg` | `1.5rem` (24px) | 基础卡片圆角 |
| `--radius-xl` | `2rem` (32px) | 大容器/Hero 区域圆角 |
| `--radius-full` | `9999px` | 按钮和导航项的药丸形圆角 |

### 2.3 排版系统 (Typography)
- **标题 (Display)**: 引入更具动漫张力的字体，如 `Kalam` 或自定义展示型无衬线体，字重设为 `800`。
- **正文 (Body)**: 保持 `Inter` 的高可读性，但增加行高至 `1.7`。

## 3. 核心组件重构策略

### 3.1 导航侧边栏 (Floating Sidebar)
- **形态**: 悬浮式药丸形状导航项，而非占据整侧的深色条。
- **交互**: 激活项使用 `gradient-sunset` 背景，非激活项仅在 Hover 时显示极淡的 `glass-bg`。
- **位置**: 桌面端建议采用悬浮式左侧栏，带 `backdrop-filter`。

### 3.2 卡片容器 (Interactive Cards)
- **视觉**: 全面应用 `glass-card`。
- **动作**: 右下角统一放置圆形 Action 按钮（参考 UI 示例中的黄色箭头按钮），提供明确的操作指引。
- **深度**: 使用 `shadow-xl` 配合微妙的浮动动画 (`hover-float`)。

### 3.3 搜索与顶部栏 (Integrated Header)
- **形态**: 搜索框改为全圆角药丸状，背景为半透明玻璃。
- **集成**: 将通知、用户头像和欢迎语 (`Hi, {name}`) 整合在右侧，形成简洁的功能组。

## 4. 影响清单

### 4.1 全局样式
- `src/app/theme.css`: 更新 Glassmorphism、圆角和阴影变量。
- `src/app/globals.css`: 注入全局的背景渐变和装饰性背景图案。

### 4.2 核心组件
- `src/components/ui/button.tsx`: 增加 `pill` 变体，支持全圆角。
- `src/components/ui/card.tsx`: 增加 `glass` 变体，应用新的玻璃态样式。
- `src/components/ui/sidebar.tsx`: 重构为悬浮药丸样式。

### 4.3 页面布局
- `src/app/[locale]/(default)/layout.tsx`: 调整主布局容器，增加侧边距和背景装饰。

## 5. 变更历史
- 2026-01-20 FEAT-ui-ux-refactor 初始化重构方案，确定玻璃态和大圆角设计方向。
