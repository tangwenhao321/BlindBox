# Release Acceptance Checklist

## Core Commerce E2E
- Login with normal user account.
- Open home feed and verify banners, hot filters, and stock/countdown modules.
- Enter box details and complete create-order flow.
- Open result modal and execute: pay now, try again, and share actions.
- Verify order status transitions in order tab.

## Community E2E
- Create post, add comment, toggle like, and follow another user.
- Submit report from community.
- In admin moderation, process report status and verify post visibility/status updates.

## Ops E2E
- Create campaign, segment, message task, and ticket from ops platform.
- Execute message task and verify status transition.
- Update ticket status and verify list view refresh.

## Observability
- Verify mobile analytics upload succeeds and queue retries on simulated failures.
- Validate admin funnel, trend, top events, and event detail views.
- Export CSV from analytics detail table and verify exported fields.

## Reliability & Security
- Verify idempotency key blocks duplicate write requests.
- Verify rate limit returns 429 after threshold.
- Verify admin high-risk operations require OTP header when configured.
- Verify audit trail records critical operations with actor/object/traceId.
