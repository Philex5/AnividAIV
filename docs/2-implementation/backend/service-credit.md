Related: FEAT-credits-calc-optimize

# Service: Credit Aggregation

## Responsibility
- Provide server-side aggregation for user credits: balance, totals, expiring, last activity.
- Expose filtered timeline for UI inspection and debugging.
- Centralize error handling with a unified code.

## Public Methods
- `getUserCreditSummary({ userUuid, window, type })`
  - window: `all | 30d | 7d` (filters by `created_at`)
  - type: `all | in | out` (positive/negative `credits`)
  - Returns: `{ balance, totalEarned, totalUsed, expiringCredits, expiringAt?, lastEventAt?, window, type }`

- `getUserCreditTimeline({ userUuid, window, type, limit })`
  - Returns array of timeline items `{ id, transNo, amount, transType, orderNo?, expiresAt?, createdAt }`
  - Ordered by `created_at desc`, limit capped at 5000

## Implementation Notes
- Location: `src/services/credit.ts`
- DB: uses `credits` table with indexes and optional `user_credit_balances` view
- Error: throw `ServiceError('ERR_CREDITS_AGGREGATION_FAILED', message)`; API maps to message string

## Files
- Service: `src/services/credit.ts`
- API: `src/app/api/get-user-credits/route.ts`
- Types: `src/types/credit.d.ts`

## Error Handling
- Returns unified error message `ERR_CREDITS_AGGREGATION_FAILED` for server errors
- 401 unauth handled in API route

## Performance & Ops
- Indexes: `(user_uuid, created_at desc)`, `(user_uuid, expired_at)`
- View: `user_credit_balances` as baseline; consider MVIEW with concurrent refresh if needed
- Targets: single-user 10k rows P95 < 250ms (internal DB)

## Change Log
- 2025-10-29 FEAT-credits-calc-optimize Initial aggregation service and API integration

