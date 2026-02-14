Related: FEAT-credits-calc-optimize

# Page: My Credits

## Purpose
Display user credits summary and recent transactions using the aggregated API.

## Routes & Files
- Page: `src/app/[locale]/(default)/(console)/my-credits/page.tsx`
- API: `POST /api/get-user-credits`

## Data & State
- Summary fields: `balance`, `totalEarned`, `totalUsed`, `expiringCredits`, `expiringAt`, `lastEventAt`
- Compatibility: uses `left_credits` for tip display; migration to `balance` planned

## UI States
- Loading: skeleton or spinner
- Error: show i18n text "Credits summary is unavailable. Please try again."
- Empty: "No credits records"

## i18n
- Page-level only: `src/i18n/pages/my-credits/en.json` (to add)
- Avoid global messages

## Interactions
- Toolbar link to `/pricing` for recharge
- Optional: refresh button to re-fetch summary

## Mapping
- API response → table rows: use `includeTimeline=true` to render recent records if needed
- Tip: `left_credits` → legacy; otherwise `balance`

## Change Log
- 2025-10-29 FEAT-credits-calc-optimize Switch to aggregated API and document states

