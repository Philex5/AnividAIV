# Tasks: FEAT-ui-ux-refactor UI/UX 视觉重构

## 任务描述
根据 `docs/2-implementation/features/feature-ui-ux-refactor.md` 的方案，全面重构网站视觉系统，实现高度玻璃态和大圆角的现代动漫风格。

## 验收标准
- [ ] 所有卡片容器均支持 `glass-card` 效果。
- [ ] 按钮和导航项支持全圆角（药丸状）变体。
- [ ] 侧边栏改为悬浮式设计，符合参考图风格。
- [ ] 响应式设计在移动端保持良好的易用性。
- [ ] 全局颜色变量严格遵循主题色约束（暖橙+吉祥物粉）。

## 任务列表
- [ ] **设计与基础 (1天)**
    - [ ] 更新 `src/app/theme.css` 中的设计令牌（圆角、玻璃态变量）。
    - [ ] 准备全局装饰性背景资产。
- [ ] **基础组件更新 (2天)**
    - [ ] 修改 `Button` 组件，添加 `pill` 变体。
    - [ ] 修改 `Card` 组件，优化 `glass` 变体。
    - [ ] 重构 `Input` 和 `Select` 以适应玻璃态风格。
- [ ] **布局重构 (2天)**
    - [ ] 重构 `Sidebar` 组件为悬浮式结构。
    - [ ] 更新 `Header` 区域，集成搜索与用户状态。
    - [ ] 优化全局内容容器的间距和圆角。
- [ ] **页面级适配 (3天)**
    - [ ] 适配首页 (Landing Page) 的 Hero 区域。
    - [ ] 适配控制台 (Console) 相关页面。
    - [ ] 适配 OC 生成与详情页面。
- [ ] **测试与优化 (1天)**
    - [ ] 完成跨浏览器兼容性测试。
    - [ ] 检查深色模式下的对比度和可读性。

## 相关文档
- 设计方案: `docs/2-implementation/features/feature-ui-ux-refactor.md`
- 视觉参考: `debug/ui_reference.png`
