# 任务列表: 模型内页 (Model Landing Pages)

**Related**: [feature-model-pages.md](../../2-implementation/features/feature-model-pages.md)
**Feature**: FEAT-MODEL-PAGES
**Status**: Pending

---

## 验收标准

- [ ] Footer新增"Models"列，显示nano-banana、wan-2-5、z-image链接
- [ ] 访问 `/models/nano-banana` 显示nano banana模型页面，可直接生成图片
- [ ] 访问 `/models/wan-2-5` 显示wan 2.5模型页面，可直接生成视频
- [ ] 访问 `/models/z-image` 显示z image模型页面，可直接生成图片
- [ ] 访问 `/models/kling-3-0` 显示 kling 3.0 模型页面，可直接进入视频生成流程
- [ ] 每个模型页面包含完整营销内容（Introduction、Benefits、HowToUse、FAQ、CTA）
- [ ] 所有文案支持页面级国际化配置
- [ ] SEO metadata正确配置（title、description、keywords、OG、Twitter Card）
- [ ] JSON-LD结构化数据正确渲染
- [ ] 模型页面被sitemap收录

---

## 任务分解

### 阶段1：基础配置 (1-2小时)

#### 1.1 创建路由映射配置
- [ ] 创建 `src/configs/models/route-mapping.ts`
- [ ] 定义 MODEL_ROUTE_MAP (route -> model_id)
- [ ] 定义 MODEL_ID_TO_ROUTE (model_id -> route)
- [ ] 定义 getModelType 函数判断image/video

#### 1.2 更新Footer配置
- [ ] 编辑 `src/i18n/messages/en.json`
- [ ] 在 footer.nav.items 中新增 "Models" 列
- [ ] 添加三个模型链接（nano-banana、wan-2-5、z-image）

---

### 阶段2：国际化配置 (2-3小时)

#### 2.1 创建模型页面文案配置
- [ ] 创建 `src/i18n/pages/models/en.json`
- [ ] 定义文案结构（metadata、introduce、benefits、how_to_use、faq、call_to_action）

#### 2.2 编写三个模型文案
- [ ] nano-banana 模型文案
  - [ ] metadata (title/description/keywords)
  - [ ] introduce (tagline/title/description)
  - [ ] benefits (6项优势)
  - [ ] how_to_use (4步)
  - [ ] faq (6-8个问题)
  - [ ] call_to_action

- [ ] wan-2-5 模型文案
  - [ ] 同上结构

- [ ] z-image 模型文案
  - [ ] 同上结构

---

### 阶段3：页面开发 (3-4小时)

#### 3.1 创建模型页面组件
- [ ] 创建 `src/app/[locale]/(default)/models/[model_name]/page.tsx`

#### 3.2 实现页面逻辑
- [ ] 实现 generateMetadata 函数（动态SEO metadata）
- [ ] 实现 getModelPageData 函数（获取模型页面数据）
- [ ] 实现 JSON-LD 结构化数据渲染
- [ ] 实现路由验证（404处理无效模型名）

#### 3.3 集成生成器组件
- [ ] 图片模型: 传递 initialModelId 给 AnimeGenerator
- [ ] 视频模型: 传递 initialModelId 给 VideoGenerator
- [ ] 登录用户: 全屏生成器
- [ ] 未登录用户: 生成器 + 营销组件

#### 3.4 集成营销组件
- [ ] MarketingIntroduction
- [ ] MarketingBenefits
- [ ] MarketingHowToUse
- [ ] MarketingFAQ
- [ ] FeatureRecommend
- [ ] MarketingCTA
- [ ] AppFooter

---

### 阶段4：SEO配置 (1小时)

#### 4.1 更新Sitemap
- [ ] 编辑 `src/app/sitemap.ts`
- [ ] 添加三个模型页面URL

#### 4.2 验证SEO配置
- [ ] 检查 canonical URL
- [ ] 检查 hreflang 配置
- [ ] 检查 OG metadata
- [ ] 检查 Twitter Card

---

### 阶段5：测试与优化 (1-2小时)

#### 5.1 功能测试
- [ ] nano-banana 页面: 生成器正常工作，模型已预选
- [ ] wan-2-5 页面: 生成器正常工作，模型已预选
- [ ] z-image 页面: 生成器正常工作，模型已预选
- [ ] 登录/未登录状态切换正常
- [ ] 所有营销组件正确渲染

#### 5.2 SEO测试
- [ ] 使用 Rich Results Test 验证结构化数据
- [ ] 检查 sitemap.xml 包含模型页面
- [ ] 检查 robots.txt 允许模型页面

#### 5.3 响应式测试
- [ ] 移动端布局正常
- [ ] 平板端布局正常
- [ ] 桌面端布局正常

---

## 文件清单

### 新增文件
```
src/configs/models/
└── route-mapping.ts                              # 路由映射配置

src/app/[locale]/(default)/models/
└── [model_name]/
    └── page.tsx                                  # 模型动态页面

src/i18n/pages/models/
└── en.json                                       # 模型页面文案
```

### 修改文件
```
src/i18n/messages/en.json                         # Footer添加Models列
src/app/sitemap.ts                                # 添加模型页面URL
```

---

## 变更历史
- 2026-02-04 创建任务列表
- 2026-02-11 新增 Kling 3.0 模型页任务项与验收项
