# COMPONENT-hero-guide: Hero区手绘螺旋引导组件

Related: docs/2-implementation/features/feature-homepage-optimization.md

## 组件概述

HeroGuide是为AnividAI首页Hero区设计的用户引导系统,通过**静态手绘风格的粗螺旋线条**和文字提示,引导首次访问用户了解拖拽和点击交互。

**设计理念**: 温暖动漫风格,柔和配色,静态展示,无复杂动画。

## 组件架构

### 组件层级结构

```
HeroGuide (容器组件)
├── GuideLines (SVG螺旋线条组件)
│   ├── Drag引导螺旋 (粉橙渐变)
│   ├── Click引导螺旋 (橙黄绿渐变)
│   ├── 装饰圆点 (起点)
│   └── 装饰星星 (终点)
└── GuideText (文字提示组件)
    ├── Drag/Swipe文字提示
    └── Click/Tap文字提示
```

## 核心文件

### 1. GuideLines.tsx

**文件路径**: `src/components/blocks/draggable-hero/GuideLines.tsx`

**功能**: 渲染静态SVG手绘风格螺旋线条

**核心实现**:
- `generateHandDrawnSpiral()` - 贝塞尔曲线螺旋路径生成算法
- 使用项目主题色: `--color-mascot-pink`, `--color-warm-orange`, `--color-golden-yellow`, `--color-nature-green`
- 柔和渐变和发光效果
- 响应式路径参数(桌面端/移动端)

**螺旋参数**:
- 桌面端拖拽螺旋: 1.8圈,半径100px
- 桌面端点击螺旋: 1.6圈,半径90px
- 移动端拖拽螺旋: 1.5圈,半径80px
- 移动端点击螺旋: 1.3圈,半径60px

**技术要点**:
- ✅ **零动画**: 完全静态SVG,无GSAP或JavaScript动画
- ✅ **主题色复用**: 使用CSS变量,完美融合品牌色
- ✅ **手绘感**: 贝塞尔曲线波动模拟手绘不规则感
- ✅ **柔和发光**: feGaussianBlur滤镜营造温馨氛围
- ✅ **粗线条**: strokeWidth 6px,视觉存在感强
- ✅ **响应式**: useMemo缓存不同设备的路径

### 2. GuideText.tsx

**文件路径**: `src/components/blocks/draggable-hero/GuideText.tsx`

**功能**: 渲染手写风格的引导文字提示

**核心实现**:
- 简单淡入动画(Framer Motion)
- 使用Kalam字体(font-anime)
- 响应式文字内容切换(Drag ↔ Swipe)
- 主题色文字颜色

**技术要点**:
- ✅ **简化动画**: 仅保留淡入效果(0.8s easeOut),移除复杂弹跳
- ✅ **主题色文字**:
  - Drag文字: `var(--color-warm-orange)`
  - Click文字: `var(--color-golden-yellow)`
- ✅ **柔和阴影**: 轻微textShadow增强可读性
- ✅ **位置优化**: 靠近螺旋线条,引导更直观

### 3. HeroGuide.tsx

**文件路径**: `src/components/blocks/draggable-hero/HeroGuide.tsx`

**功能**: 组合GuideLines和GuideText,管理引导的显示状态

**核心实现**:
- AnimatePresence管理进入/退出动画
- 简单的淡入淡出效果(0.5s)
- 无障碍性属性设置(aria-hidden)

**Props接口** (已简化):
```typescript
interface HeroGuideProps {
  show: boolean;           // 是否显示引导
  onComplete: () => void;  // 完成回调
  dragText: string;        // 拖拽提示文字
  clickText: string;       // 点击提示文字
  isMobile?: boolean;      // 是否移动端
  // ❌ 已移除: autoHideDuration
}
```

### 4. DraggableHero主组件集成

**文件路径**: `src/components/blocks/draggable-hero/index.tsx`

**功能保持不变**:
- 首次访问检测(localStorage)
- 用户交互监听(拖拽/点击隐藏)
- 移动端检测
- 国际化支持

## 国际化配置

### 配置文件

**文件路径**: `src/i18n/pages/landing/en.json` ✅ 页面级配置

**配置内容**:
```json
{
  "draggable_hero": {
    "guide": {
      "drag_text_desktop": "Drag to explore",
      "drag_text_mobile": "Swipe to explore",
      "click_text": "Click to see detail"
    }
  }
}
```

**使用方式**:
```typescript
import { useTranslations } from "next-intl";

const t = useTranslations("draggable_hero");
// t("guide.drag_text_desktop") => "Drag to explore"
```

## 配色方案 (动漫主题色)

### 线条渐变色

| 引导类型 | 起始颜色 | 中间颜色 | 结束颜色 |
|---------|---------|---------|---------|
| Drag螺旋 | `var(--color-mascot-pink)` #C07895 (60%) | `var(--color-warm-orange)` #FF9800 (75%) | `var(--color-golden-yellow)` #FFC107 (50%) |
| Click螺旋 | `var(--color-warm-orange)` #FF9800 (70%) | `var(--color-golden-yellow)` #FFC107 (80%) | `var(--color-nature-green)` #4CAF50 (40%) |

### 文字颜色

- Drag文字: `var(--color-warm-orange)` #FF9800 (温暖橙)
- Click文字: `var(--color-golden-yellow)` #FFC107 (金黄)
- 文字阴影: 对应颜色的30%透明度光晕 + 黑色20%透明度阴影

### 配色特点

✅ **温暖柔和**: 粉橙系,符合动漫kawaii风格
✅ **品牌一致**: 复用项目主题色,无需新增颜色变量
✅ **非科技感**: 去除荧光色(#FF69B4, #4FC3F7等)
✅ **视觉和谐**: 渐变过渡自然,不刺眼

## 视觉规格

### 线条规格

| 属性 | 桌面端 | 移动端 |
|------|--------|--------|
| 粗细 | 6px | 6px |
| 端点 | round | round |
| 发光强度 | stdDeviation: 2.5 | stdDeviation: 2.5 |
| 阴影层 | 10px, opacity: 0.15 | 10px, opacity: 0.15 |
| 主线层 | 6px, 渐变色 | 6px, 渐变色 |

### 螺旋参数

| 螺旋类型 | 圈数 | 半径 | 衰减率 |
|---------|------|------|--------|
| 桌面Drag | 1.8圈 | 100px | 75% |
| 桌面Click | 1.6圈 | 90px | 75% |
| 移动Drag | 1.5圈 | 80px | 75% |
| 移动Click | 1.3圈 | 60px | 75% |

### 文字规格

- **字体**: Kalam (font-anime)
- **大小**:
  - 桌面: text-xl (20px)
  - 移动: text-lg (18px)
- **颜色**: 主题色变量
- **阴影**: 柔和发光效果

## 动画规格 (已简化)

### 组件淡入/淡出

| 动画类型 | 时长 | 缓动函数 |
|---------|------|---------|
| 容器淡入 | 0.5s | linear |
| 容器淡出 | 0.5s | linear |

### 文字淡入

| 元素 | 时长 | 延迟 | 缓动函数 |
|------|------|------|---------|
| Drag文字 | 0.8s | 0.3s | easeOut |
| Click文字 | 0.8s | 0.5s | easeOut |

### ❌ 已移除的动画

- ❌ GSAP stroke-dasharray描边动画
- ❌ 线条闪烁效果
- ❌ 箭头弹跳动画
- ❌ 文字弹跳动画
- ❌ 自动隐藏倒计时动画

## 响应式设计

### 桌面端 (≥768px)

- **螺旋位置**:
  - Drag: 中心(180, 280)
  - Click: 中心(650, 280)
- **文字位置**:
  - Drag: `top-[220px] left-[40px]`
  - Click: `top-[220px] right-[180px]`

### 移动端 (<768px)

- **螺旋位置**:
  - Drag: 中心(180, 420)
  - Click: 中心(350, 240)
- **文字位置**:
  - Drag: `top-[360px] left-[60px]`
  - Click: `top-[180px] right-[40px]`

## 性能优化

### 1. 静态SVG

```typescript
// ✅ 使用useMemo缓存路径计算
const spiralPath = useMemo(() => {
  return generateHandDrawnSpiral(...);
}, [isMobile]);
```

### 2. 零JavaScript动画

- ✅ 无GSAP动画循环
- ✅ 无requestAnimationFrame
- ✅ 静态渲染,浏览器优化最佳

### 3. 条件渲染

- ✅ 仅在`showGuide === true`时渲染
- ✅ 用户交互后立即卸载

### 4. CSS变量

- ✅ 使用主题色CSS变量,浏览器缓存友好
- ✅ 无硬编码颜色值

## 无障碍性

### ARIA属性

- `aria-hidden="true"` - 引导组件对屏幕阅读器隐藏
- `pointer-events: none` - 不干扰用户交互

### 无动画干扰

- ✅ 静态线条,无动画闪烁干扰
- ✅ 简单淡入,符合WCAG 2.1标准

## 用户交互流程

```
首次访问用户
    ↓
检查localStorage['hero-guide-seen']
    ↓
未找到 → 显示引导(静态螺旋线+文字)
    ↓
用户拖拽/点击卡片
    ↓
触发handleUserInteraction()
    ↓
淡出隐藏引导 + 保存标记到localStorage
    ↓
后续访问不再显示
```

## 使用示例

```typescript
import { HeroGuide } from "@/components/blocks/draggable-hero/HeroGuide";
import { useTranslations } from "next-intl";
import { useIsMobile } from "@/hooks/use-mobile";

function MyHeroSection() {
  const [showGuide, setShowGuide] = useState(false);
  const isMobile = useIsMobile();
  const t = useTranslations("draggable_hero");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeenGuide = localStorage.getItem("hero-guide-seen");
      if (!hasSeenGuide) {
        setShowGuide(true);
      }
    }
  }, []);

  const handleGuideComplete = () => {
    setShowGuide(false);
    localStorage.setItem("hero-guide-seen", "true");
  };

  return (
    <section>
      {/* Hero内容 */}

      {showGuide && (
        <HeroGuide
          show={showGuide}
          onComplete={handleGuideComplete}
          dragText={isMobile ? t("guide.drag_text_mobile") : t("guide.drag_text_desktop")}
          clickText={t("guide.click_text")}
          isMobile={isMobile}
        />
      )}
    </section>
  );
}
```

## 技术依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| ~~GSAP~~ | ❌ 已移除 | ~~SVG线条动画~~ |
| Framer Motion | 12.0.0-alpha.1 | 简单淡入动画 |
| next-intl | - | 国际化支持 |
| React | 19 | 组件基础 |

## 优化成果

### 移除内容

- ❌ GSAP库调用
- ❌ stroke-dasharray描边动画
- ❌ 闪烁效果(opacity循环)
- ❌ 箭头弹跳动画
- ❌ 文字弹跳动画
- ❌ 自动隐藏倒计时
- ❌ 荧光科技色配色
- ❌ 复杂时间轴编排

### 新增/优化内容

- ✅ 静态手绘螺旋线条
- ✅ 柔和主题色渐变
- ✅ 简化的淡入动画
- ✅ 温暖动漫风格配色
- ✅ 粗线条视觉存在感
- ✅ 性能优化(静态渲染)

### 性能提升

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| JavaScript执行 | GSAP动画循环 | 仅初始渲染 |
| 代码体积 | ~500行 | ~200行 |
| 动画帧率 | 60fps (动画) | N/A (静态) |
| 内存占用 | 动画对象缓存 | 极小 |

## 变更历史

| 日期 | 变更内容 | 影响 |
|------|---------|------|
| 2025-11-08 | 初始实现:动画线条引导系统 | 新增功能 |
| 2025-11-08 | 优化:改为静态螺旋线条,主题色配色 | 性能优化,风格统一 |

---

**创建日期**: 2025-11-08
**最后更新**: 2025-11-08 (优化版本)
**状态**: ✅ 优化完成,风格统一
