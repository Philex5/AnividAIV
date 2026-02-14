# Cookie Consent Implementation Guide

## 概述

本指南说明如何在AnividAI项目中集成符合GDPR/CCPA要求的Cookie同意弹窗系统。

## 实施内容

### 1. 核心组件

#### CookieConsentBanner (`src/components/ui/cookie-consent-banner.tsx`)

- **新样式**：左下角紧凑卡片设计，减少干扰和占用面积
- 固定位置：屏幕左下角 (fixed bottom-4 left-4)
- 最大宽度：320px (max-w-sm)，占用空间小
- 包含必要的Cookie和可选的分析Cookie选项
- 响应式设计，支持移动端和桌面端
- **"Show Details"按钮**：点击后打开模态弹窗显示详细设置
- **仅首次访问显示，已同意后不显示任何按钮**
- **优化文案**：更具体地说明必要Cookie（会话管理、登录认证、安全防护）
- **优化文案**：更明确地说明分析Cookie用途（页面访问统计和用户体验优化）

#### useCookieConsent Hook (`src/hooks/useCookieConsent.ts`)

- 管理Cookie同意状态
- 提供`hasConsentFor()`方法供其他组件检查同意状态
- 本地存储持久化
- 支持同意版本管理（更新政策时重新显示弹窗）
- **注意**：不再直接控制Analytics脚本加载

#### CookieConsentWrapper (`src/components/layout/cookie-consent-wrapper.tsx`)

- 布局包装器组件
- 自动集成到主布局bao

### 2. 用户界面

#### Cookie设置页面 (`src/app/[locale]/(default)/cookie-settings/page.tsx`)

- 完整的Cookie偏好管理界面
- 分类展示不同类型Cookie（详细说明必要和分析Cookie的具体用途）
- 实时预览设置更改
- 提供隐私政策链接
- **新增**：专门的"撤回同意"提示框，强调立即生效特性
- **新增**：隐私保护说明，告知用户偏好仅存储在本地

#### Footer集成

- 在Footer添加"Cookie Settings"链接
- 用户可随时访问设置页面

### 3. UI设计更新

#### 左下角紧凑卡片样式

新的Cookie同意弹窗采用左下角小卡片设计，主要优势：

**设计特点**
- **位置固定**：屏幕左下角，不遮挡主要内容
- **尺寸紧凑**：最大宽度320px，高度自适应
- **视觉干扰小**：仅在首次访问时显示
- **渐进式披露**：点击"Show Details"后展示详细设置

**交互流程**
1. **首次访问**：显示左下角小卡片，包含：
   - Cookie图标
   - "Cookie Preferences"标题
   - "Manage your cookie preferences"简短说明
   - "Show Details"按钮（带设置图标）

2. **点击"Show Details"**：打开模态弹窗，包含：
   - 完整的Cookie分类说明
   - 必要Cookie（Always On）
   - 分析Cookie（Optional，可切换开关）
   - "Reject All"和"Accept All"按钮

**动画效果**
- 小卡片：滑入动画 (slide-in-from-bottom-4)
- 模态弹窗：标准淡入效果
- 阴影：增强阴影效果 (shadow-2xl)

### 4. 国际化支持

#### Cookie国际化配置 (`src/i18n/pages/legal/cookie.json`)

- 完整的英文Cookie相关文案
- 可扩展其他语言支持

### 5. 隐私政策更新

#### 隐私政策增强 (`src/app/(legal)/privacy-policy/page.mdx`)

- 添加第2.10节：Cookie Consent and Your Choices
- 详细说明Cookie分类和使用目的
- 提供撤回同意的指引

### 6. Cookie分类

### 必要Cookie（Necessary）

- **状态**：始终启用
- **用途**：
  - 用户认证和会话管理
  - 安全和欺诈防护
  - 记住用户偏好设置
- **详细说明**：包括会话管理、登录认证和安全防护等基础功能
- **特点**：无法禁用

### 分析Cookie（Analytics）

- **状态**：需要用户同意
- **包含**：
  - Google Analytics
  - Microsoft Clarity
  - Plausible
- **用途**：
  - 页面访问统计
  - 用户行为分析
  - 网站使用情况优化
- **详细说明**：用于统计页面访问量和用户行为，帮助我们优化网站体验。数据匿名收集
- **隐私保护**：启用IP匿名化

### 营销Cookie（Marketing）

- **状态**：预留，暂未启用
- **用途**：定向广告（未来功能）

### 7. 技术特性

### 同意管理

- 使用localStorage存储用户偏好
- 版本控制（CONSENT_VERSION）确保政策更新时重新获取同意
- 自定义事件系统通知其他组件

### Analytics集成

#### 现有Analytics组件集成

现有项目已包含多个Analytics服务，现在都已集成Cookie同意机制：

- **Google Analytics** (`src/components/analytics/google-analytics.tsx`)：
  - 使用`@next/third-parties/google`包
  - 仅在用户同意分析Cookie后才加载
  - 通过`hasConsentFor("analytics")`检查同意状态

- **Microsoft Clarity** (`src/components/analytics/clarity.tsx`)：
  - 动态注入script标签
  - 仅在用户同意分析Cookie后才加载
  - 通过`hasConsentFor("analytics")`检查同意状态
  - 提供热力图和会话录制功能

- **Plausible** (`src/components/analytics/plausible.tsx`)：
  - 直接动态注入script标签
  - 同意时会自动加载，拒绝时会移除脚本和清除cookies
  - 通过`hasConsentFor("analytics")`检查同意状态

**架构说明**：

- Analytics组件本身检查Cookie同意状态，实现条件渲染
- 撤销同意时会自动清理相关cookies和脚本
- 所有Analytics服务归类为"分析Cookie"，统一管理

### 用户体验

- **首次访问**：显示Cookie弹窗
- **已同意**：通过Footer的"Cookie Settings"链接管理偏好
- **重新访问**：记住用户选择，不重复弹窗
- **隐私保护**：Cookie偏好仅存储在用户本地浏览器，不发送到服务器或第三方

### 同意撤回

- **立即生效**：撤回同意后，相关Cookie将被立即删除，Analytics脚本停止加载
- **操作方式**：用户可随时通过Cookie设置页面或浏览器设置撤回同意

### 8. 部署说明

### 1. 环境变量配置

在生产环境中，您需要设置以下Analytics服务ID：

#### Google Analytics

```bash
# 在 .env.production 中设置
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

#### Microsoft Clarity

```bash
# 在 .env.production 中设置
NEXT_PUBLIC_CLARITY_ID=your_clarity_project_id
```

#### Plausible (可选)

```bash
# 在 .env.production 中设置
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL=https://plausible.io/js/script.js
```

### 3. 构建和部署

```bash
# 安装依赖
pnpm install

# 构建项目
pnpm build

# 启动开发服务器
pnpm dev
```

### 9. 合规性说明

### GDPR合规

- ✅ 明确同意机制（Opt-in）
- ✅ 分类Cookie说明
- ✅ 随时撤回同意
- ✅ 详细隐私政策

### CCPA合规

- ✅ Cookie选择权
- ✅ 第三方服务披露
- ✅ 数据使用透明化

### 10. 文件清单

### 新增文件

- `src/components/ui/cookie-consent-banner.tsx`
- `src/components/layout/cookie-consent-wrapper.tsx`
- `src/hooks/useCookieConsent.ts`
- `src/app/[locale]/(default)/cookie-settings/page.tsx`
- `src/i18n/pages/legal/cookie.json`

### 修改文件

- `src/app/[locale]/layout.tsx`
- `src/i18n/messages/en.json`
- `src/app/(legal)/privacy-policy/page.mdx`
- `src/types/global.d.ts`
- `src/components/analytics/google-analytics.tsx`
- `src/components/analytics/clarity.tsx` (原open-panel.tsx)
- `src/components/analytics/plausible.tsx`
- `src/components/analytics/index.tsx`

### 11. 测试建议

### 测试用例

1. **首次访问**：
   - [ ] Cookie弹窗正确显示
   - [ ] 所有选项可正常操作

2. **同意流程**：
   - [ ] 点击"Accept All"保存设置
   - [ ] 点击"Reject All"保存设置
   - [ ] 自定义选择后保存设置

3. **重新访问**：
   - [ ] 弹窗不重复显示
   - [ ] Footer显示"Cookie Settings"链接

4. **设置页面**：
   - [ ] 能够查看当前设置
   - [ ] 能够修改设置
   - [ ] 能够重置设置

5. **Analytics验证**：
   - [ ] 同意后所有Analytics服务（GA、Clarity、Plausible）正确加载
   - [ ] 拒绝后Analytics服务不加载
   - [ ] 拒绝后相关cookies被清除
   - [ ] 撤销同意后Analytics脚本被移除
   - [ ] **立即生效验证**：撤销同意后立即检查cookies和脚本已被清理

6. **多服务验证**：
   - [ ] 同时测试GA、Clarity、Plausible
   - [ ] 验证它们都受同一个"分析Cookie"开关控制

7. **隐私保护验证**：
   - [ ] 验证Cookie偏好仅存储在localStorage，不发送到服务器
   - [ ] 确认用户可以随时修改偏好且立即生效

### 12. 注意事项

1. **生产环境配置**：
   - 必须设置正确的GA和Clarity项目ID
   - 启用IP匿名化以保护用户隐私

2. **Cookie策略更新**：
   - 修改政策时更新 `CONSENT_VERSION`
   - 添加版本说明到弹窗

3. **多语言支持**：
   - 当前仅提供英文版本
   - 可扩展到其他语言（添加对应语言的cookie.json文件）

4. **第三方依赖**：
   - Google Analytics需额外注册
   - Microsoft Clarity需额外注册
   - Plausible需额外注册

5. **现有Analytics架构**：
   - 项目已包含Google Analytics、Microsoft Clarity、Plausible三个Analytics服务
   - 所有Analytics服务现在统一归类为"分析Cookie"
   - 通过在每个组件中添加`useCookieConsent()`检查同意状态
   - 这种设计避免了在Hook中重复实现多种Analytics的加载逻辑

### 13. 支持和联系

如有疑问或需要技术支持，请联系：support@anividai.com

## 修改记录

### 2025-11-25 - UI样式优化

将Cookie同意弹窗从全屏横幅样式改为左下角紧凑卡片样式：
- **新设计**：屏幕左下角固定位置，最大宽度320px
- **交互优化**：点击"Show Details"按钮打开模态弹窗
- **用户体验**：减少视觉干扰，保持内容区域完整
- **合规性**：保持所有GDPR/CCPA合规要求

### 2025-11-25 - 修正国际化配置

修正Cookie同意组件的国际化键值：
- **问题**：使用了不存在的翻译键（如 managePreferences、settingsTitle 等）
- **解决**：统一使用 `src/i18n/messages/en.json` 中的 legal 部分
- **变更**：
  - `managePreferences` → `description`
  - `settingsTitle` → `title`
  - `settingsDescription` → `description`
  - `necessary.details` → `necessary.description`
  - `analytics.details` → `analytics.description`
- **按钮显示**：在小卡片中添加 "Accept All" 和 "Reject All" 按钮

### 2025-11-25 - 修正z-index层级问题

修正详情弹窗被小卡片遮挡的问题：
- **问题**：点击 "Show Details" 后，模态弹窗被Cookie小卡片遮挡
- **原因**：Dialog的z-index (z-50) 低于小卡片的z-index (z-[9999])
- **解决**：为Dialog的Content和Overlay设置更高的z-index (z-[99999])
- **代码变更**：
  - DialogContent: 添加 `z-[99999]`
  - Dialog Overlay: 添加 `overlayClassName="z-[99999] bg-black/80"`
