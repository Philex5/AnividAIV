# 测试用例：FEAT-primary-portrait 主立绘选择与回退

关联需求：FEAT-primary-portrait（`docs/2-implementation/features/feature-primary-portrait.md`）

## 主路径

1. 进入 OC 详情页编辑模式，存在多张 portrait。
2. 点击设置图标进入 portrait 列表，选择任意一张为 primary。
3. 保存并刷新页面。

**期望**：

- 仅一张 portrait 显示 Primary badge
- `profile_generation_image_uuid` 指向选中 portrait
- 其他生成器默认引用该主立绘

## 错误/边界

### 1. 删除主立绘（仍有其他 portrait）

步骤：

1. 选择某张 portrait 为 primary。
2. 删除该 primary portrait。
3. 确认弹窗提示。

期望：

- 弹窗提示出现并可确认/取消
- 删除后自动选择另一张 portrait 作为 primary
- `profile_generation_image_uuid` 更新为新 primary 的 UUID

### 2. 删除主立绘（无其他 portrait）

步骤：

1. 仅有一张 portrait 时删除该 primary。
2. 确认弹窗提示。

期望：

- `profile_generation_image_uuid` 被清空
- 页面不显示 Primary badge
- 新生成 portrait 时自动设置为 primary

### 3. 新生成 portrait 不覆盖主立绘

步骤：

1. 已存在 primary portrait。
2. 生成一张新的 portrait。

期望：

- 新 portrait 进入 gallery 列表
- 主立绘不变

### 4. 上传新增类型选择

步骤：

1. 触发上传新增弹窗，选择“是立绘”。
2. 再次上传并选择“否”。

期望：

- 第一张标记为 `type=portrait`
- 第二张标记为 `type=upload`

## 回归

- 画廊排序与拖拽调整不影响 primary 选择逻辑
- 头像与背景图设置不受主立绘逻辑影响
