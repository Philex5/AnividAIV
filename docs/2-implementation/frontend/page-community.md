# Page: Community

Related: FEAT-community

状态：已实现

## 1. 目标与范围

- 目标：定义社区主页面的路由、布局、筛选/排序/搜索/标签、无限滚动、详情弹窗路由联动、状态管理、国际化与无障碍规范。复用 ShipAny 现有 UI 组件与主题。
- 不含：真实后端实现；仅定义页面对 API 契约的映射与前端交互行为。

## 2. 路由与结构

- 路由：`src/app/[locale]/(default)/community/page.tsx`
- 详情路由联动：打开弹窗时在 URL 上追加 `?artwork={id}`，返回（Back）关闭，无整页刷新。
- 页面结构：
  1. 顶部工具区：搜索输入、类型 Tab（All/OC/Image/Video）、排序下拉（Trending/Newest/Top）、标签选择
  2. 二级分类 Badge：当类型为 Image/OC/Video 时显示对应 gen_type（可多选）
  3. 内容区：响应式栅格 + 无限滚动列表（卡片为 `ArtworkCard` 系列）
  4. 详情：通用弹窗（左媒体/右信息面板，右上角悬浮 Close 按钮）

## 3. 布局与响应式

- 栅格列数：≥1536px 5 / ≥1280px 4 / ≥1024px 3 / ≥768px 2 / <768px 1。
- 顶部工具区在移动端折叠为两行：第一行搜索，第二行类型 Tab；排序与标签进入抽屉式筛选。
- 保持主题一致性：使用现有 `Card/Button/Badge/Skeleton/Avatar/Tooltip` 等组件；避免颜色硬编码。

## 4. 交互流程

1. 初始化加载：根据 URL 查询参数（type/sort/q/tags）请求列表；显示 Skeleton。
2. 搜索：提交时更新 URL `q` 并重载列表（重置游标）。
3. 类型/排序/标签：点击即更新 URL 并重载列表（重置游标）。
4. 二级 Badge：默认不选（等于全选），点击即更新 URL `gen_types`，支持多选。
5. 无限滚动：IntersectionObserver 触底加载下一页；失败显示英文 toast 并可重试。
6. 打开详情：点击卡片 → 弹窗打开 → URL 附 `?artwork=ID`；返回或 Close 关闭。
7. 点赞/收藏：在卡片与详情中均支持，乐观更新失败回滚；英文错误提示。
8. 分享：复制作品链接 `/community/[type]/[id]`；成功/失败 toast。

## 5. 状态管理

- 页面状态：
  - filters：{ type, sort, q, tags[] }
  - genTypes：string[]（选中的二级分类，空数组表示全选）
  - pagination：{ cursor, hasMore, isLoading }
  - items：`ArtworkPreview[]`
  - detail：{ open: boolean, id?: string, type?: 'oc' | 'image' | 'video' }

- URL 同步：
  - 读写 `type/sort/q/gen_types/tags/cursor`（cursor 仅内部使用，不暴露为查询串）。
  - `?artwork` 用于详情态，关闭时移除该参数。

- 数据获取：
- 列表：GET `/api/community/artworks?type=&sort=&q=&gen_types=&tags=&cursor=`
  - 详情：GET `/api/community/artworks/{id}`（弹窗打开后按需拉取）

## 6. 错误/加载/空态

- 加载：首屏 Skeleton（列数对齐栅格），分页加载追加 Skeleton 占位。
- 错误：toast 英文信息（如 `"Failed to load artworks"`），提供 Retry。
- 空态：展示空，并提示调整筛选。

## 7. 国际化与文案

- 仅页面级 i18n：`src/i18n/pages/community/en.json`
- 示例 keys：
  - search.placeholder, tabs.all, tabs.oc, tabs.image, tabs.video
  - sort.trending, sort.newest, sort.top
  - genTypes.title, genTypes.options.*
  - filters.tags, actions.search, actions.clear
  - states.loading, states.noResults, states.loadFailed, states.retry
  - detail.useOc, detail.stats.likes, detail.stats.views, detail.stats.comments

组件与页面严禁硬编码中文或英文文案：

- 页面/操作类文案统一从页面级配置读取。
- 通用要素（模型/风格/种族/配饰等）名称从系统级 `src/i18n/messages/en.json` 获取，基于数据中的 code 映射。

## 8. 可达性（A11y）

- 工具区控件具备 label 与键盘可达；Tab/下拉/多选标签可用键盘导航。
- 卡片可聚焦，Enter 打开详情；Esc 关闭弹窗。
- 详情右侧信息面板顶部 Sticky Header 左右分布（作者/社交），按钮具 aria-label。

## 9. 性能

- 列表按需批量渲染；首屏优先保证图片加载；视频封面 `preload="metadata"`。
- 无限滚动阈值设置与节流；视频 hover 预览仅桌面启用且限时。
- 使用 `src/lib/r2-utils.ts` 统一构造资源 URL；避免组件内重复拼接。

## 10. 页面与组件映射（实现文件，计划）

- 页面：`src/app/[locale]/(default)/community/page.tsx`（服务端入口，设置 locale 与 metadata）
- 页面客户端：`src/app/[locale]/(default)/community/page-client.tsx`（实际交互逻辑）
- 过滤工具：`src/components/community/filters/{Search,TypeTabs,SortSelect,GenTypeBadges,TagPicker}.tsx`（可按需合并）
- 列表与加载：`src/components/community/ArtworkCard.tsx` + `cards/*` + `InfiniteLoader.tsx`
- 详情：`src/components/community/detail/*`
- i18n：`src/i18n/pages/community/en.json`

## 11. 伪代码（简化示意）

```tsx
function CommunityPage() {
  const [filters, setFilters] = useFiltersFromUrl(); // type, sort, q, tags
  const { items, cursor, hasMore, loading, error, loadMore, refresh } =
    useCommunityList(filters);
  const detail = useDetailFromUrl(); // {open,id,type}

  return (
    <Page>
      <Toolbar onChange={setFilters} values={filters} />
      <Grid>
        {items.map((x) => (
          <ArtworkCard key={x.id} data={x} onOpen={() => openDetail(x)} />
        ))}
        <InfiniteLoader hasMore={hasMore} loading={loading} onLoad={loadMore} />
      </Grid>
      {detail.open && (
        <ArtworkDetailModal
          id={detail.id}
          type={detail.type}
          onClose={closeDetail}
        />
      )}
      {error && (
        <Toast
          message="Failed to load artworks"
          action="Retry"
          onAction={refresh}
        />
      )}
    </Page>
  );
}
```

## 12. 验收要点

- URL 与页面状态完全同步（筛选/搜索/详情）。
- 无限滚动在触底时加载下一页；网络错误可重试且不影响已加载内容。
- 详情弹窗：右侧信息面板顶部为左右分布的作者信息与社交按钮；Close 悬浮于右上角且不占位。
- 所有文案从页面级 i18n 读取；错误与默认提示均为英文。

## 13. 影响清单

- Frontend：本页面与依赖组件（见第 10 节文件清单）
- API：`docs/2-implementation/api/community.md`
- 数据模型：参考 `docs/1-specs/data-models.md`（后续补充 artworks 与 stats 字段）

## 14. 变更历史

- 2025-10-22 FEAT-community 初版：页面结构、状态管理、URL 同步、无限滚动与详情联动规范。
- 2025-01-24 FEAT-community 实现社区页面前端（筛选、无限滚动、详情弹窗联动）
- 2025-01-24 FEAT-community 新增 gen_type 二级分类 Badge 筛选与 URL 同步
