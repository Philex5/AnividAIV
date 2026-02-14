# FEAT-community gen_type 二级筛选用例

关联需求：FEAT-community（docs/2-implementation/features/feature-community.md）

## 主路径

1. 进入 `/community?type=image`，默认无 gen_type 选中。
2. 点击 `Sticker` Badge，URL 追加 `gen_types=sticker`，列表仅显示对应 gen_type。
3. 再点击 `Action Figure`，URL 变为 `gen_types=sticker,action_figure`，列表为两者并集。
4. 取消 `Sticker`，URL 仅保留 `gen_types=action_figure`。

## 错误/边界

1. 访问 `/api/community/artworks?type=image&gen_types=unknown` 返回 400，错误为英文。
2. 当 `type=all` 且携带 `gen_types` 时，列表仍可正常返回且不报错。
3. `gen_types` 为空（未设置或清空）时，等价于全选。

## 回归

1. 不设置 `gen_types` 时列表与分页行为与之前一致。
2. `type` 切换会清空 `gen_types` 并重新加载列表。
3. 详情弹窗打开/关闭与 URL 参数共存不冲突（保留 `gen_types`）。
