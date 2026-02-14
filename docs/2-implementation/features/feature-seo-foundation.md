# Feature: SEO Foundation

Related PRD: docs/1-specs/PRD.md

## Background & Goals
AnividAI relies on public OC pages and community content for viral sharing and discovery. The current SEO foundations need alignment with this strategy by ensuring public pages are indexable, discoverable, and properly annotated for search and social sharing.

## Acceptance Criteria
- Public OC pages (`/characters/[uuid]`) are indexable.
- Private/admin/auth routes are blocked for both `en` and `ja` paths.
- Sitemap is dynamically generated and includes core marketing pages plus public UGC (characters/worlds) and blog posts.
- Canonical + hreflang are present on key pages.
- World/user/blog detail pages include OG/Twitter metadata and JSON-LD.

## System Flow (Textual)
1. Crawler requests `/sitemap.xml`.
2. Server composes URLs for static pages and public content.
3. Robots rules allow public pages and block private routes.

## Impact List
- Robots: public/robots.txt
- Sitemap: src/app/sitemap.ts
- Metadata & hreflang:
  - src/app/[locale]/(default)/page.tsx
  - src/app/[locale]/(default)/community/page.tsx
  - src/app/[locale]/(default)/pricing/page.tsx
  - src/app/[locale]/(default)/posts/page.tsx
  - src/app/[locale]/(default)/posts/[slug]/page.tsx
  - src/app/[locale]/(default)/oc-maker/page.tsx
  - src/app/[locale]/(default)/ai-anime-generator/page.tsx
  - src/app/[locale]/(default)/ai-anime-video-generator/page.tsx
  - src/app/[locale]/(default)/ai-action-figure-generator/page.tsx
  - src/app/[locale]/(default)/ai-sticker-generator/page.tsx
  - src/app/[locale]/(default)/art-prompt-generator/page.tsx
  - src/app/[locale]/(default)/anime-character-generator/page.tsx
  - src/app/[locale]/(default)/chat/page.tsx
  - src/app/[locale]/(default)/cookie-settings/page.tsx
  - src/app/[locale]/(default)/worlds/[uuid]/page.tsx
  - src/app/[locale]/(default)/user/[uuid]/page.tsx
- Admin noindex:
  - src/app/[locale]/(admin)/layout.tsx

## Linked Implementation Docs
- Frontend: docs/2-implementation/frontend/page-seo-foundation.md
- Backend: docs/2-implementation/backend/module-seo-foundation.md

## Test Notes
- tests/test-cases/FEAT-SEO-FOUNDATION-seo-foundation.md

## Change History
- 2026-01-28 FEAT-SEO-FOUNDATION Initial SEO foundation implementation
