# FEAT-SEO-FOUNDATION SEO Foundation Test Cases

Related requirement: FEAT-SEO-FOUNDATION (docs/2-implementation/features/feature-seo-foundation.md)

## Main Path
1. Request `/sitemap.xml` and verify it returns URLs for en/ja static pages and recent public characters/worlds/posts.
2. Visit `/characters/[uuid]` (public) and confirm it is not blocked by robots and has canonical + OG tags.

## Error/Edge
1. Ensure `/admin` and `/ja/admin` are blocked in `robots.txt`.
2. Visit a private world as non-owner and confirm it returns 404 (not indexable).

## Regression
1. Validate `/community`, `/pricing`, `/chat` include canonical + hreflang for `en` and `ja`.
2. Validate blog detail JSON-LD includes headline and dates.
