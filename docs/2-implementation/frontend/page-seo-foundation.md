# Page: SEO Foundation

Related: docs/2-implementation/features/feature-seo-foundation.md

## Scope
Defines SEO metadata and structured data behavior for public-facing pages.

## Key Behavior
- Canonical + hreflang (`en`, `ja`) are included on key marketing and tool pages.
- World, user, and blog detail pages output OG/Twitter metadata and JSON-LD.
- Admin pages are marked `noindex, nofollow`.

## Mappings
- Canonical + hreflang: see the page files listed in the feature impact list.
- World detail JSON-LD: `CreativeWork` with `name`, `description`, `url`, `image`.
- User profile JSON-LD: `ProfilePage` with `Person` entity.
- Blog detail JSON-LD: `Article` with `headline`, `description`, `dates`, `author`.

## Files
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
- src/app/[locale]/(admin)/layout.tsx

## Change History
- 2026-01-28 FEAT-SEO-FOUNDATION Initial SEO metadata coverage
