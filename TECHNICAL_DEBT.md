# PodBridge Technical Debt & Known Issues

This document tracks known technical debt, gaps, and areas for improvement in the PodBridge codebase.

## Database Schema Issues

### Legacy Naming Convention

**Issue**: Original table name `cash_tags` is still used in the database schema, but the application refers to them as `show_tags`.

**Impact**: 
- Confusion for new developers
- Inconsistency between database and application code
- Foreign key references still use `cash_tag_id`

**Location**: 
- Database: `scripts/001_create_schema.sql`
- All tables with `cash_tag_id` foreign keys

**Remediation**:
- Rename table from `cash_tags` to `show_tags`
- Rename all `cash_tag_id` columns to `show_tag_id`
- Update all foreign key constraints
- Create migration script with proper sequence

**Priority**: Medium (works but causes confusion)

**Effort**: Medium (requires careful migration)

---

### Missing Indexes

**Issue**: Some frequently queried columns lack indexes.

**Missing Indexes**:
- `comments.parent_comment_id` - Used for threaded comment queries
- `reactions.comment_id` - Used for comment reaction counts
- `federated_posts.local_post_id` - Used for federation status queries
- `aggregated_posts.connected_account_id` - Used for account filtering

**Impact**:
- Slower queries as data grows
- Increased database load

**Remediation**:
```sql
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_reactions_comment_id ON reactions(comment_id);
CREATE INDEX idx_federated_posts_local_post_id ON federated_posts(local_post_id);
CREATE INDEX idx_aggregated_posts_connected_account_id ON aggregated_posts(connected_account_id);
```

**Priority**: Low (performance optimization)

**Effort**: Low (single migration script)

---

## Authentication & User Management

### ~~Incomplete OAuth Implementation~~ ✅ COMPLETED

**Issue**: OAuth flow for connected accounts is not fully implemented.

**Location**: `components/settings/connected-accounts-manager.tsx`, `lib/oauth/`, `app/api/oauth/`

**Status**: ✅ **RESOLVED** - OAuth 2.0 flow has been implemented

**Implementation Details**:
- ✅ OAuth 2.0 authorization flow with PKCE support
- ✅ Platform-specific callback handlers for Twitter, Reddit, Mastodon, LinkedIn, Discord
- ✅ Secure token encryption using AES-256-GCM
- ✅ Token refresh logic with automatic expiry detection
- ✅ State validation for CSRF protection
- ✅ Comprehensive error handling and user feedback

**Files Added**:
- `lib/oauth/config.ts` - Platform OAuth configurations
- `lib/oauth/utils.ts` - Token encryption, PKCE, state management
- `lib/oauth/token-manager.ts` - Token retrieval with auto-refresh
- `app/api/oauth/[platform]/authorize/route.ts` - OAuth initiation
- `app/api/oauth/[platform]/callback/route.ts` - OAuth callback handling
- `app/api/oauth/refresh/route.ts` - Token refresh endpoint
- `docs/OAUTH_SETUP.md` - Setup documentation

**Configuration Required**:
- Set `OAUTH_ENCRYPTION_KEY` environment variable (required)
- Add platform-specific OAuth credentials (see `docs/OAUTH_SETUP.md`)
- Configure callback URLs in each platform's developer console

**Note**: While the OAuth infrastructure is complete, actual federation and aggregation features still need to be built on top of this foundation.

---

### Guest User Limitations

**Issue**: Guest users can browse but UI doesn't clearly indicate what they can/cannot do.

**Impact**:
- Confusing UX when guests try to interact
- No clear path to sign up for features

**Remediation**:
- Add visual indicators for auth-required features
- Show "Sign up to..." prompts on protected actions
- Consider guest session persistence

**Priority**: Medium (UX improvement)

**Effort**: Low (UI enhancements)

---

## Real-time & Performance

### ~~Subscription Memory Leaks~~ ✅ FIXED (2026-01-03)

**Issue**: Some components may not properly clean up Realtime subscriptions.

**Impact**:
- Memory leaks in long-running sessions
- Multiple subscriptions for same data
- Increased WebSocket connections

**Resolution** (2026-01-03):
- ✅ Audited all `useEffect` hooks with subscriptions across the codebase
- ✅ Removed unstable dependencies (like `supabase` instance) from useEffect dependency arrays
- ✅ Converted `useState(() => createClient())` to `useRef(createClient())` to ensure stable client instances
- ✅ Fixed `fetchComments` callback dependency in comments-section.tsx using ref pattern
- ✅ Created `useRealtimeSubscription` custom hook for consistent subscription management
- ✅ All subscriptions now have proper cleanup in return functions with minimal dependencies

**Files Modified**:
- `components/post-aggregator/post-aggregator.tsx`
- `components/post-aggregator/comments-section.tsx`
- `components/post-aggregator/post-card.tsx`
- `components/post-aggregator/post-detail-view.tsx`
- `components/post-aggregator/federated-post-status.tsx`
- `components/post-aggregator/show-tag-feed.tsx`
- `lib/hooks/use-realtime-subscription.ts` (new)

**Priority**: ~~Medium~~ RESOLVED

**Effort**: ~~Medium~~ COMPLETED

---

### No Pagination Strategy

**Issue**: Many feed queries load all data without pagination.

**Impact**:
- Slow initial page loads
- High database query costs
- Poor performance with large datasets

**Current State**:
- Some components have infinite scroll
- No consistent pagination pattern
- No cursor-based pagination

**Remediation**:
- Implement cursor-based pagination
- Add "load more" or infinite scroll consistently
- Cache paginated results
- Set reasonable default limits (e.g., 50 items)

**Priority**: Medium (performance issue)

**Effort**: Medium (refactor multiple components)

---

## Federation & Aggregation

### Mock Federation

**Issue**: Federation to external platforms is currently simulated, not real.

**Location**: Connected accounts and federated posts features

**Impact**:
- Posts don't actually publish to external platforms
- Status updates are simulated
- Core value proposition incomplete

**Remediation**:
- Implement real API integrations for each platform
- Add background job processing for federation
- Implement retry logic for failed posts
- Add rate limiting per platform

**Priority**: High (core feature)

**Effort**: Very High (platform-specific integrations)

---

### ~~No Automated Aggregation~~ ✅ FIXED (2026-01-03)

**Issue**: Inbound post aggregation from external platforms is not automated.

**Resolution** (2026-01-03):
- ✅ Created database tables for RSS feed management (`show_rss_feeds`, `user_rss_feeds`, `aggregation_logs`)
- ✅ Implemented `aggregate-connected-accounts` edge function for background polling
- ✅ Created `/api/webhooks` endpoint for real-time webhook ingestion
- ✅ Implemented duplicate detection using `external_guid` and content similarity
- ✅ Added basic content filtering and spam detection
- ✅ Created automatic sync trigger from `aggregated_posts` to `posts` table
- ✅ Documented setup in `docs/AUTOMATED_AGGREGATION.md`

**What's Implemented**:
- RSS feed polling infrastructure
- Webhook handler with platform-specific routing
- Duplicate detection algorithm
- Basic spam filtering patterns
- Aggregation logging for monitoring

**What's Still TODO**:
- Platform-specific API integrations (Twitter, Reddit, Mastodon APIs)
- Advanced ML-based content filtering
- Webhook signature verification for each platform
- Smart tag detection from content

**Priority**: ~~High~~ PARTIALLY RESOLVED (core infrastructure complete, platform integrations pending)

**Effort**: ~~High~~ COMPLETED (infrastructure), Medium remaining (platform integrations)

---

## Error Handling

### Inconsistent Error Handling

**Issue**: Error handling varies across components.

**Patterns**:
- Some use `toast` notifications
- Some use inline error messages
- Some silently fail
- No consistent error logging

**Remediation**:
- Standardize error handling pattern
- Create error boundary components
- Implement error logging service
- Add user-friendly error messages

**Priority**: Medium (UX and debugging)

**Effort**: Medium (refactor across codebase)

---

### No Error Tracking

**Issue**: No error tracking or monitoring service integrated.

**Impact**:
- Bugs in production go unnoticed
- No visibility into user issues
- Difficult to debug production problems

**Remediation**:
- Integrate Sentry or similar service
- Add client and server error tracking
- Set up alerts for critical errors
- Track error trends

**Priority**: Medium (observability)

**Effort**: Low (service integration)

---

## Testing

### No Automated Tests

**Issue**: No test suite exists for the application.

**Current State**:
- Manual testing only
- Manual testing guides exist
- No CI/CD test automation

**Impact**:
- Risk of regressions
- Slower development (manual testing)
- Lower confidence in changes

**Remediation**:
- Add unit tests for utilities (slugs, formatting)
- Add component tests with React Testing Library
- Add E2E tests with Playwright
- Set up CI/CD test pipeline

**Priority**: High (code quality)

**Effort**: Very High (build entire test suite)

---

### No TypeScript Coverage in Tests

**Issue**: Even manual tests don't verify TypeScript types at runtime.

**Impact**:
- Type safety only at build time
- Runtime type errors possible

**Remediation**:
- Add Zod schemas for runtime validation
- Validate API responses
- Validate user input

**Priority**: Low (TypeScript provides build-time safety)

**Effort**: Medium (add validation layer)

---

## Documentation

### Outdated Implementation Docs

**Issue**: Multiple implementation summary and guide documents are outdated.

**Files**:
- `IMPLEMENTATION_COMPLETE.md`
- `IMPLEMENTATION_SUMMARY.md`
- `FIX_SUMMARY.md`
- `FIX_400_ERROR_SUMMARY.md`
- `VALIDATION_REPORT.md`
- Multiple visual comparison docs

**Impact**:
- Confusion about current state
- Outdated information
- Cluttered repository

**Remediation**:
- Archive outdated docs to `docs/archive/`
- Keep only current architecture and development docs
- Update main README

**Priority**: Medium (organization)

**Effort**: Low (file reorganization) - **IN PROGRESS**

---

### No API Documentation

**Issue**: API routes lack documentation.

**Current State**:
- RSS feed API exists
- No OpenAPI/Swagger spec
- No usage examples

**Remediation**:
- Document all API routes
- Add OpenAPI specification
- Create API usage guide
- Add example requests/responses

**Priority**: Low (internal APIs mostly)

**Effort**: Low (documentation only)

---

## Security

### Service Role Key Exposure Risk

**Issue**: Service role key used in some contexts where anon key should suffice.

**Impact**:
- Potential security risk if leaked
- Broader permissions than needed

**Remediation**:
- Audit service role key usage
- Replace with anon key where possible
- Use server-side only where needed
- Add key rotation procedure

**Priority**: High (security)

**Effort**: Low (code audit)

---

### Missing Rate Limiting

**Issue**: No rate limiting on API routes or actions.

**Impact**:
- Vulnerable to abuse
- No protection against spam
- Could incur high costs

**Remediation**:
- Add rate limiting middleware
- Implement per-user/IP limits
- Add CAPTCHA for public actions
- Monitor usage patterns

**Priority**: Medium (security and cost)

**Effort**: Medium (implement rate limiting)

---

### No Content Moderation

**Issue**: No moderation tools for user-generated content.

**Impact**:
- Spam and abuse possible
- No reporting mechanism
- No admin moderation interface

**Remediation**:
- Add content reporting
- Implement admin moderation UI
- Add automated spam detection
- Create community guidelines

**Priority**: Medium (community health)

**Effort**: High (full moderation system)

---

## Mobile & Accessibility

### Mobile Experience Gaps

**Issue**: Some components not fully optimized for mobile.

**Known Issues**:
- Episode catalog on small screens
- Audio player on mobile
- Complex dropdown menus
- Table layouts in admin

**Remediation**:
- Mobile-first responsive design review
- Test on real devices
- Add mobile-specific layouts
- Consider Progressive Web App (PWA)

**Priority**: Medium (user experience)

**Effort**: Medium (responsive design work)

---

### Accessibility Issues

**Issue**: Limited accessibility testing and implementation.

**Gaps**:
- Missing ARIA labels in places
- Keyboard navigation incomplete
- Screen reader testing not done
- Color contrast issues possible

**Remediation**:
- Accessibility audit with axe or similar
- Add ARIA labels throughout
- Test with screen readers
- Ensure full keyboard navigation
- Fix color contrast issues

**Priority**: Medium (inclusivity)

**Effort**: Medium (audit and fixes)

---

## Infrastructure

### No Monitoring or Observability

**Issue**: No application performance monitoring (APM).

**Missing**:
- Performance metrics
- Database query monitoring
- Real-time connection tracking
- User analytics

**Remediation**:
- Add Vercel Analytics
- Set up Supabase monitoring
- Add custom metric tracking
- Create observability dashboard

**Priority**: Low (nice to have)

**Effort**: Low (service integrations)

---

### No Backup Strategy

**Issue**: Relying on Supabase's default backups.

**Impact**:
- No custom backup schedule
- No tested restore procedure
- No point-in-time recovery plan

**Remediation**:
- Document Supabase backup settings
- Create backup verification procedure
- Test restore process
- Document recovery plan

**Priority**: Low (Supabase handles this)

**Effort**: Low (documentation)

---

## Code Quality

### Inconsistent Component Patterns

**Issue**: Mix of component styles and patterns.

**Examples**:
- Some use custom hooks, some don't
- State management varies
- Props patterns inconsistent

**Remediation**:
- Define component best practices
- Refactor to consistent patterns
- Create component templates
- Add linting rules for patterns

**Priority**: Low (works but inconsistent)

**Effort**: High (large refactor)

---

### Unused Code

**Issue**: Some components and utilities may be unused.

**Impact**:
- Larger bundle size
- Maintenance burden
- Confusion about what's active

**Remediation**:
- Audit for unused exports
- Remove dead code
- Add tree-shaking optimization
- Document active components

**Priority**: Low (optimization)

**Effort**: Medium (code audit)

---

## Data Management

### No Data Export

**Issue**: Users cannot export their data.

**Impact**:
- No data portability
- GDPR compliance gap
- User lock-in

**Remediation**:
- Add data export feature
- Support common formats (JSON, CSV)
- Include all user data
- Add GDPR compliance features

**Priority**: Medium (compliance)

**Effort**: Medium (implement export)

---

### No Data Retention Policy

**Issue**: No automated cleanup of old data.

**Impact**:
- Database grows indefinitely
- Increased costs
- Slower queries over time

**Remediation**:
- Define retention policy
- Implement automated archival
- Add soft delete patterns
- Document data lifecycle

**Priority**: Low (not urgent at current scale)

**Effort**: Medium (implement lifecycle)

---

## Summary

### Priority Breakdown

**High Priority** (3 items):
1. OAuth Implementation for Connected Accounts
2. Real Federation Implementation
3. Automated Test Suite

**Medium Priority** (12 items):
- Legacy naming convention cleanup
- Various UX and performance improvements
- Security enhancements
- Documentation organization
- ~~Subscription Memory Leaks~~ ✅ FIXED (2026-01-03)

**Low Priority** (8 items):
- Performance optimizations
- Infrastructure improvements
- Code quality refinements

### Recent Fixes

**2026-01-03**:
- ✅ **Subscription Memory Leaks** - Fixed all Realtime subscription memory leaks by using stable refs and removing unstable dependencies from useEffect hooks. Created reusable `useRealtimeSubscription` hook.
- ✅ **Automated Aggregation System** - Implemented core infrastructure for automated post aggregation including:
  - Database tables for RSS feed management and logging
  - Edge function for polling connected accounts
  - Webhook API endpoint for real-time ingestion
  - Duplicate detection algorithm
  - Basic content filtering and spam detection
  - Automatic sync from aggregated_posts to posts table

### Recommended Order

1. **Phase 1**: ~~Documentation cleanup~~ ✅ COMPLETED, ~~error handling standardization~~, ~~subscription cleanup~~ ✅ COMPLETED, ~~automated aggregation~~ ✅ COMPLETED
2. **Phase 2**: OAuth and federation implementation (core features)
3. **Phase 3**: Test suite development (quality)
4. **Phase 4**: Performance optimizations (pagination, indexes)
5. **Phase 5**: Security hardening (rate limiting, moderation)
6. **Phase 6**: Mobile and accessibility improvements

### Effort Summary

- **Low Effort**: 8 items
- **Medium Effort**: 12 items  
- **High Effort**: 4 items
- **Very High Effort**: 1 item

---

*Last Updated: 2026-01-03*
*This document should be updated as issues are resolved and new technical debt is identified.*
