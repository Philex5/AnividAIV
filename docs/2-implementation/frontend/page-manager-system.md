# Frontend - Admin Manager System (Related: FEAT-manager-system)

目标：在管理端新增以下页面并对齐 i18n、SSR、组件复用规范。

## 页面结构
- `/admin`：仪表盘增强（新增 generations 曲线）
- `/admin/generations`：类型卡片 + 趋势图 + 失败预览表
- `/admin/logs`：失败列表（分页预留）
- `/admin/revenue`：收入趋势 + 成本列表（手工录入）

## 关键文件
- `src/app/[locale]/(admin)/admin/page.tsx`
- `src/app/[locale]/(admin)/admin/generations/page.tsx`
- `src/app/[locale]/(admin)/admin/logs/page.tsx`
- `src/app/[locale]/(admin)/admin/revenue/page.tsx`
- i18n：
  - `src/i18n/pages/admin/generations/en.json`
  - `src/i18n/pages/admin/logs/en.json`
  - `src/i18n/pages/admin/revenue/en.json`

## i18n
- 页面级文案采用 `src/i18n/pages/admin/*/en.json`
- 在 `src/app/[locale]/layout.tsx` 合并到 `messages.admin.*` 命名空间
- 仅英文，后续再扩展其他语言

## 组件与交互
- 复用：`DataCards`、`DataCharts`、`TableSlot`
- 趋势默认窗口 90 天；移动端优先 7 天（组件内已处理）
- 列表默认 50 条（后续添加筛选与分页）

## 权限
- 依赖 `src/app/[locale]/(admin)/layout.tsx` 菜单与管理员校验

## 后续优化
- generations 页面接入筛选（用户、类型、时间窗）
- logs 导出 CSV、筛选 error_code
- revenue 页面增加成本创建/编辑表单（对接 `/api/admin/costs`）

变更历史：
- 2025-10-31 FEAT-manager-system 首次创建

