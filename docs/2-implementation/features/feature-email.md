# Feature: Email Service

**Related**: [Emails API](../api/emails.md)

## Background & Objectives
AnividAI uses Resend to send system and marketing emails. This feature manages the templates, variable rendering, and integration with the backend services.

## Acceptance Criteria
- [x] Send welcome emails upon registration.
- [x] Send subscription thank you emails with correct plan details.
- [x] Support for refund notification emails (v5.0).
- [x] Email templates are loaded from R2 storage (via asset-loader).
- [x] Variables are correctly rendered using Mustache-style syntax.
- [x] Admin CMS supports manual email send by target type (`all` / `specific`).
- [x] Admin CMS supports sent email history list and detail view.
- [x] Admin CMS manual send only accepts plain text content, and system auto-generates themed HTML.
- [x] Auto-generated admin email HTML uses brand theme background + creamy glass style, with site logo at top-right and consistent typography.
- [x] Admin CMS supports one-click sync from Resend for sent-email status refresh.

## Current Solution
The email service is implemented in `src/services/email.ts`, utilizing Resend SDK. Templates are stored in `public/emails/` and are also synced to R2 for the production environment (Cloudflare Workers).

### System Flow
1. Event Trigger (e.g., Payment success)
2. Service call `sendEmail` with template name and variables.
3. `loadEmailTemplate` fetches the HTML content.
4. `renderTemplate` replaces variables and handles basic logic (`#if`).
5. Resend sends the email.

### Admin Manual Send Flow
1. Admin enters `subject` + plain text `contentText`.
2. Admin can preview the final styled email before send.
3. Backend converts plain text into styled HTML (theme color + creamy glass card + top-right logo + normalized typography).
4. Service sends email via Resend and persists both `text_content` and generated `html_content` in logs/campaign records.
5. Admin can click "Sync from Resend" to update local log status based on latest Resend `last_event`.

## Impact List
- **API**: `docs/2-implementation/api/emails.md`
- **Admin API**: `docs/2-implementation/api/admin.md`
- **Frontend**: N/A (Backend service)
- **Frontend(Admin)**: `src/app/[locale]/(admin)/admin/emails/page.tsx`, `src/components/admin/email/AdminEmailsClient.tsx`
- **Backend**: `src/services/email.ts`, `src/services/admin/email.ts`, `src/models/email-log.ts`, `src/models/email-campaign.ts`
- **Templates**: `public/emails/*.html`

## Variable Definitions (Subscription Thank You)
| Variable | Description |
| :--- | :--- |
| `user_name` | Name of the user |
| `plan_name` | Name of the plan (Basic, Plus, Pro) |
| `mc_amount` | Amount of Meow Coins included |
| `oc_limit` | Max number of OCs allowed |
| `is_unlimited_oc` | Boolean for Pro plan |
| `world_limit` | Max number of Worlds allowed |
| `is_unlimited_worlds` | Boolean for Pro plan |
| `has_sota_access` | Access to experimental models |
| `is_priority_support` | Boolean for Plus/Pro plans |
| `is_annual` | Boolean for annual billing |
| `start_date` | Date of subscription start |
| `next_billing_date` | Date of next renewal |

## Change History
- 2025-11-12 v1.0 Initial implementation.
- 2026-01-30 v1.1 Update subscription benefits based on new pricing model.
- 2026-02-13 v1.2 Stripe `invoice.payment_failed` 优化：忽略 `subscription_create` 场景，仅在多次重试失败后发送付款失败邮件，避免银行验证阶段误发。
- 2026-02-13 v1.3 Stripe `invoice.payment_failed` 进一步收敛：仅当订阅状态为 `unpaid` 才发送付款失败邮件，并在 `payment-failed` 模板补充账单管理入口按钮。
- 2026-02-13 v1.4 新增 CMS Email 子页：支持已发送邮件历史与手动发送（Resend + email_logs/email_campaigns）。
- 2026-02-13 v1.5 CMS 手动邮件改为纯文本输入并自动生成主题 HTML；新增一键从 Resend 同步邮件状态。
- 2026-02-13 v1.6 新增手动邮件发送前预览能力，预览与最终发送复用同一 HTML 生成逻辑。
