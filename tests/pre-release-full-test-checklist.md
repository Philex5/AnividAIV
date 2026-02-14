# Pre-release Full Test Checklist

Goal: run a complete, traceable test pass before production release using the new test plan.

Date: YYYY-MM-DD
Version/Tag: vX.Y.Z
Owner: NAME
Environment: dev/staging

---

## 1) Preparation
- [ ] `pnpm dev` or staging environment is running and reachable
- [ ] Test accounts ready (user/VIP/admin)
- [ ] Payment providers in test mode (Stripe/Creem)
- [ ] API base URL confirmed
- [ ] UUIDs prepared (user_uuid/character_uuid/generation_uuid)
- [ ] Previous test data cleanup plan ready (optional)

## 2) API Full Run (P0 + P1)
- [ ] Open `tests/api-tests/test-collection.http`
- [ ] Update variables for current environment
- [ ] Execute all API requests (84+)
- [ ] Verify auth, permissions, and error handling
- [ ] Record results in `tests/api-tests/test-results/YYYYMMDD-api-test.md`

## 3) Scenario Full Run (P0 + P1)
- [ ] Run `tests/scenario-tests/ai-anime-generator.md`
- [ ] Run `tests/scenario-tests/ai-video-generator.md`
- [ ] Run `tests/scenario-tests/oc-maker.md`
- [ ] Run `tests/scenario-tests/oc-apps.md`
- [ ] Run `tests/scenario-tests/worlds.md`
- [ ] Run `tests/scenario-tests/roadmap-and-incentives.md`
- [ ] Run `tests/scenario-tests/chat.md`
- [ ] Run `tests/scenario-tests/community.md`
- [ ] Run `tests/scenario-tests/payments.md`
- [ ] Record results in `tests/scenario-tests/test-results/YYYYMMDD-scenario-test.md`

## 4) LLM Backend Service Verification
- [ ] Follow `docs/2-implementation/backend/service-llm-service.md`
- [ ] Verify routing by scenario (chat/image/video) and primary provider selection
- [ ] Verify fallback to OpenRouter on timeout/5xx/auth failure
- [ ] Verify retry behavior (maxRetries/backoff) and final error code
- [ ] Verify stream response handling and non-stream response format
- [ ] Record any issues in the results files above

## 4) Regression (Only if fixes landed during this cycle)
- [ ] Re-run affected API requests
- [ ] Re-run affected scenarios
- [ ] Update result files with regression notes

## 5) Release Gate
- [ ] P0 issues: 0
- [ ] P1 issues: 0 or explicitly accepted
- [ ] Result files saved and linked in release notes
- [ ] Release decision recorded (GO / NO-GO)

## 6) Evidence Links
- [ ] API results: `tests/api-tests/test-results/YYYYMMDD-api-test.md`
- [ ] Scenario results: `tests/scenario-tests/test-results/YYYYMMDD-scenario-test.md`
- [ ] Issue list (optional): URL/ID

---

## Issues Summary (Template)
| ID | Priority | Area | Description | Status | Owner |
|----|----------|------|-------------|--------|-------|
|  | P0/P1/P2 |  |  | Open/Fixed |  |
