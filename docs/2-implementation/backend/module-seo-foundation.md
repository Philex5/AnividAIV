# Module: SEO Foundation (Sitemap)

Related: docs/2-implementation/features/feature-seo-foundation.md

## Responsibility
Generates the dynamic sitemap for public pages and content.

## Data Flow
1. Query public posts, characters, and worlds.
2. Merge with static routes.
3. Return `MetadataRoute.Sitemap` entries.

## Notes
- Uses `SITEMAP_LIMIT` to cap entries.
- Locale-aware URLs are generated for `en` and `ja`.

## Files
- src/app/sitemap.ts

## Change History
- 2026-01-28 FEAT-SEO-FOUNDATION Initial dynamic sitemap module
