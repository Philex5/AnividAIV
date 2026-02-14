**Related**:
- Feature：`docs/2-implementation/features/feature-story-lab.md`
- API：`docs/2-implementation/api/story-lab.md`
- Backend：`docs/2-implementation/backend/module-story-lab.md`

# 页面：Story Lab Workspace

## 页面目标
- 提供 Script -> Scene -> Shot -> Generate -> Export 的阶段化工作台。
- 支持“AI 自动拆解 + 人工校正 + 局部重试”的协同编辑流程。

## 路由与文件位置（规划）
- 页面路由：`/[(locale)]/(default)/story-lab`
- 页面文件：`src/app/[locale]/(default)/story-lab/page.tsx`
- 核心组件（建议）：
  - `src/components/story-lab/story-lab-workspace.tsx`
  - `src/components/story-lab/scene-panel.tsx`
  - `src/components/story-lab/shot-table.tsx`
  - `src/components/story-lab/run-log-panel.tsx`

## 布局结构
- 顶部：Run 标题、状态 Badge、主操作按钮（Parse / Plan / Generate / Export）。
- 左侧：Scene 列表与摘要。
- 中间：Shot 编辑区（camera/composition/motion/duration）。
- 右侧：RunLog / 错误详情 / 重试入口。
- 底部：生成结果缩略图与下游入口（Manga / Video）。

## 状态管理
- 最小状态：
  - `run`: run 主信息（status、progress、counts）
  - `scenes`: SceneCard[]
  - `shots`: ShotCard[]
  - `logs`: RunLog[]
  - `selectedSceneUuid` / `selectedShotUuid`
- 状态来源：全部来自 Story Lab API，不在前端做业务规则推断。

## 交互规则
- `draft` 状态允许编辑 script 与资产绑定。
- `planning` 后允许编辑 shot 语义并触发重排校验。
- `generating` 阶段禁止全局结构编辑，仅允许单镜头重试。
- 若接口返回 error，前端必须展示英文错误消息与 error_code。

## API 字段映射（核心）
- run.status -> 顶部阶段指示器
- scenes[].summary -> Scene 列表摘要
- shots[].camera/composition/motion/duration -> Shot 编辑表单
- logs[].phase/error_code/error_message -> 右侧日志面板

## 空态/错误态/加载态
- 空态：无 run 时展示“Create your first Story Lab run”。
- 错误态：显示 `error_code + error_message`，提供 `Retry`。
- 加载态：阶段执行期间使用 skeleton + 阶段进度文本。

## i18n
- 页面级文案配置：
  - `src/i18n/pages/story-lab/en.json`
  - `src/i18n/pages/story-lab/ja.json`
- 禁止在页面中硬编码中文/英文文案。

## 变更历史
- 2026-02-11 FEAT-story-lab 新增 Story Lab 前端页面设计草案（影响：Frontend/Feature）
