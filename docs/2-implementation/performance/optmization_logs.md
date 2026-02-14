## 首页优化记录
已完成以下首页性能优化：
1. Hero 组件优化
- draggable-card.tsx: 移除了 framer-motion的复杂动画（motion.div、drag、rotate等），改用简的 CSS transition
- draggable-hero/index.tsx:
  - 使用 Next.js Image 组件替代原生 img，添加priority 属性预加载关键图片
  - 动态导入 OCArtworkPanel 组件，减少首屏 JS体积
2. Introduce 组件优化
- introduce/index.tsx: 移除了 framer-motion 的motion.div 入场动画，直接渲染内容
3. 页面缓存配置
- page.tsx: 将 force-dynamic 改为 revalidate = 3600，启用 ISR 静态化缓存
4. 中间件优化
- middleware.ts: 对公共路由删除 Set-Cookie 头，使CDN 能正确缓存页面
5. 静态资源缓存
- next.config.mjs: 添加 /imgs/* 和/_next/static/* 的长期缓存头配置
6. 数据层缓存
- user-showcase/index.tsx: 使用 unstable_cache包裹 batchFetchArtworks，缓存 1 小时
