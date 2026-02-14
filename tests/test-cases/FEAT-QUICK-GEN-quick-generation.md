# 测试用例：FEAT-QUICK-GEN 快速生成 OC

关联需求：FEAT-QUICK-GEN（docs/2-implementation/features/feature-oc-maker.md）

## 主路径

1. 已登录用户进入 `/oc-maker`
2. 在 Quick Create 面板输入一句英文描述（例如：A cool cyberpunk hacker girl with a mechanical cat）
3. 点击 Generate
4. 期望：
   - 返回成功并创建角色记录（页面可看到预填充字段/可跳转到 `/characters/{uuid}`）
   - 若开启自动生图：出现生成任务并开始轮询，最终展示立绘结果

## 错误/边界

### 未登录
- 操作：未登录直接调用快速生成
- 期望：接口返回 401，前端弹出登录引导（不中断当前输入内容）

### 描述为空/过长
- 操作：description 为空或超过限制
- 期望：接口返回 400（Zod 校验），前端提示失败（英文错误信息）

### 余额不足
- 前置：用户 credits < 1
- 操作：快速生成
- 期望：接口返回 402（Insufficient credits），不创建角色记录

### LLM 输出非 JSON
- 操作：模拟 LLM 返回无法解析 JSON 的文本
- 期望：接口返回 500（Failed to parse JSON from LLM response），不创建角色记录

## 回归

- 手动分步创建与示例生成不受影响（表单、保存、生图、头像生成逻辑正常）
- 已存在角色编辑模式下不会被 quick-gen 重置已有数据（除非用户主动点击 Generate）

## 变更历史
- 2026-01-04 FEAT-QUICK-GEN 新增用例覆盖主路径/错误边界/回归

