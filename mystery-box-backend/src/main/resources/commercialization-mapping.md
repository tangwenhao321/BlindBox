# Commercialization In-Memory to DB Mapping

## Community Domain
- `CommunityDomainService.posts` -> `community_post`
- `CommunityDomainService.comments` -> `community_comment`
- `CommunityDomainService.likes` -> `community_like`
- `CommunityDomainService.follows` -> `community_follow`
- `CommunityDomainService.notifications` -> `community_notification`
- `CommunityDomainService.reports` -> `community_report`

## Ops Domain
- `OpsPlatformService.campaigns` -> `ops_campaign`
- `OpsPlatformService.segments` -> `ops_segment`
- `OpsPlatformService.messageTasks` -> `ops_message_task`
- `OpsPlatformService.tickets` -> `ops_ticket`

## Observability Domain
- `AnalyticsEventService.events` -> `analytics_event`
- `AuditTrailService.entries` -> `audit_trail`

## Feature Flag Source
- Default bootstrap flags are inserted into `ops_feature_flag`.
- Runtime defaults are also provided in `application-dev.yml` for local dev fail-safe.
