# OG卡片预览测试页面使用指南

## 概述

为了方便测试和预览OG卡片的生成效果，我们创建了一个专门的测试页面，支持实时预览不同参数组合下的卡片效果。

## 页面路径

```
/[locale]/dev/og-preview/[uuid]
```

例如：
- `http://localhost:3000/en/dev/og-preview/character-uuid-here`
- `http://localhost:3000/ja/dev/og-preview/character-uuid-here`

## 文件结构

```
src/app/[locale]/(default)/dev/og-preview/[uuid]/
├── page.tsx              # 服务器组件页面
└── preview-client.tsx     # 客户端预览组件
```

## 功能特性

### 1. 实时预览
- 点击"Generate"按钮生成卡片
- 支持实时切换参数查看效果
- 卡片尺寸：1200x630像素

### 2. 参数控制

#### 模板类型 (Template)
- **TCG Card**: 游戏王风格的交易卡牌
- **Movie Poster**: 电影海报风格
- **Business Card**: 专业名片风格

#### 稀有度 (Rarity)
- **R**: 稀有级（蓝色）
- **SR**: 史诗级（紫色）
- **SSR**: 传说级（金色）

#### 主题 (Theme)
- **Fantasy**: 奇幻主题（默认，紫色系）
- **Dark**: 暗色主题
- **Light**: 亮色主题
- **Cyberpunk**: 赛博朋克主题
- **Minimal**: 简约主题

### 3. 操作功能
- **Generate**: 生成预览卡片
- **Download**: 下载PNG格式卡片
- **参数切换**: 实时调整所有参数

### 4. 信息展示
- 当前配置显示
- 角色信息概览
- 卡片尺寸标识

## 使用方法

### 1. 访问页面

在浏览器中打开：
```
http://localhost:3000/[locale]/dev/og-preview/[character-uuid]
```

将 `[character-uuid]` 替换为实际的角色UUID。

### 2. 选择参数

在左侧控制面板中选择：
- 卡片模板
- 稀有度等级
- 主题风格

### 3. 生成预览

点击"Generate"按钮，等待卡片生成完成。

### 4. 下载卡片

满意后点击"Download"按钮保存PNG文件。

## API调用

测试页面通过以下API生成卡片：

```typescript
GET /api/og/character/[uuid]?template={template}&rarity={rarity}&theme={theme}
```

参数说明：
- `uuid`: 角色UUID
- `template`: 模板类型（tcg/movie/business-card）
- `rarity`: 稀有度（r/sr/ssr）
- `theme`: 主题（dark/light/cyberpunk/minimal/fantasy）

示例：
```bash
# 生成奇幻主题SSR稀有度TCG卡牌
curl "http://localhost:3000/api/og/character/uuid-123?template=tcg&rarity=ssr&theme=fantasy" \
  --output card.png
```

## 最佳实践

### 1. 快速测试不同稀有度
推荐测试流程：
1. 选择 Fantasy 主题
2. 依次测试 R → SR → SSR
3. 观察稀有度特效差异

### 2. 主题对比测试
在相同稀有度下测试不同主题：
1. 选择 SSR 稀有度
2. 依次切换：Fantasy → Dark → Cyberpunk → Minimal
3. 选择视觉效果最佳的主题

### 3. 模板效果验证
测试所有模板类型：
1. 固定稀有度和主题
2. 对比 TCG vs Movie vs Business Card
3. 选择最适合角色特点的模板

## 性能优化

### 1. 缓存机制
- 相同参数的卡片会缓存
- 重复生成速度更快
- 可通过URL直接分享特定配置

### 2. 加载优化
- 生成过程中显示加载动画
- 禁用按钮防止重复提交
- 自动显示错误信息

## 常见问题

### Q: 生成的卡片不显示？
A: 检查：
1. 角色UUID是否正确
2. 角色是否存在
3. 是否设置了profile_image

### Q: 下载的图片很小？
A: 默认生成1200x630像素，这是OG图片的标准尺寸

### Q: 如何批量测试？
A: 可以通过编程方式调用API，或手动切换参数测试

## 开发调试

### 查看日志
服务器端会输出生成日志：
```bash
# 开发服务器控制台
OG generation failed: [error details]
```

### 网络请求
在浏览器开发者工具中查看：
1. Network 面板
2. 筛选 `/api/og/character/*`
3. 查看请求和响应

### 错误处理
- 生成失败：显示错误提示
- 网络错误：自动重试
- 参数错误：400状态码

## 示例配置

### 推荐测试配置

#### 配置1：奇幻主题SSR
```
Template: TCG Card
Rarity: SSR
Theme: Fantasy
```

#### 配置2：赛博朋克SR
```
Template: Movie Poster
Rarity: SR
Theme: Cyberpunk
```

#### 配置3：简约R
```
Template: Business Card
Rarity: R
Theme: Minimal
```

## 技术实现

### 1. 数据获取
```typescript
// 服务器端获取角色数据
const character = await findCharacterByUuid(uuid);
const modules = parseCharacterModules(character.modules);
```

### 2. 参数管理
```typescript
// 客户端状态管理
const [template, setTemplate] = useState<TemplateType>("tcg");
const [rarity, setRarity] = useState<RarityType>("ssr");
const [theme, setTheme] = useState<ThemeType>("fantasy");
```

### 3. 卡片生成
```typescript
// 生成卡片
const response = await fetch(`/api/og/character/${uuid}?template=${template}&rarity=${rarity}&theme=${theme}`);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
```

## 扩展建议

### 1. 添加更多模板
- 自定义模板选项
- 用户上传模板
- 模板预览缩略图

### 2. 批量生成
- 支持多个稀有度同时生成
- 打包下载所有变体
- 生成对比图

### 3. 参数保存
- 保存常用配置
- 分享链接生成
- 配置历史记录

### 4. 高级功能
- 自定义文本内容
- 调整特效强度
- 实时编辑角色信息

## 更新日志

- 2026-01-25: 初始版本创建
  - 支持三种模板类型
  - 支持三种稀有度
  - 支持五种主题
  - 实现实时预览和下载功能
