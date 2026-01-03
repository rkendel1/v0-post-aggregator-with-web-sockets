# Production Security Checklist

Before deploying the automated aggregation system to production, complete these security tasks:

## Critical Security Items (Must Complete)

### 1. ⚠️ Implement Webhook Signature Verification

**Status**: ❌ Not Implemented (accepting all webhooks in development)

**Location**: `/app/api/webhooks/route.ts`

**Tasks**:
- [ ] Reddit webhook verification
  - [ ] Get webhook secret from Reddit app settings
  - [ ] Store in environment variable `REDDIT_WEBHOOK_SECRET`
  - [ ] Implement HMAC-SHA256 signature verification
  - [ ] Test with actual Reddit webhooks
  - [ ] Remove security warning from code

- [ ] Discord webhook verification
  - [ ] Get public key from Discord app settings
  - [ ] Store in environment variable `DISCORD_PUBLIC_KEY`
  - [ ] Implement Ed25519 signature verification
  - [ ] Test with actual Discord webhooks
  - [ ] Remove security warning from code

- [ ] Mastodon webhook verification
  - [ ] Implement HTTP signature verification
  - [ ] Store signing key in environment
  - [ ] Test with actual Mastodon webhooks
  - [ ] Remove security warning from code

**Reference**:
- Reddit: https://www.reddit.com/dev/api#section_webhooks
- Discord: https://discord.com/developers/docs/resources/webhook
- Mastodon: https://docs.joinmastodon.org/spec/webhooks/

### 2. ⚠️ Restrict RSS Feed Access Control

**Status**: ❌ Any authenticated user can create/modify official feeds

**Location**: `/scripts/015_add_rss_feeds_tables.sql`

**Tasks**:
- [ ] Add `is_admin` boolean field to `user_profiles` table
- [ ] Update RLS policies to check admin status
- [ ] Create admin management interface
- [ ] Assign admin privileges to authorized users
- [ ] Test that non-admins cannot create official feeds
- [ ] Remove TODO comment from migration script

**Example Policy**:
```sql
create policy "Only admins can create show RSS feeds"
  on public.show_rss_feeds for insert
  with check (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );
```

### 3. ⚠️ Add Rate Limiting

**Status**: ❌ No rate limiting implemented

**Location**: `/app/api/webhooks/route.ts`

**Tasks**:
- [ ] Choose rate limiting solution (e.g., Upstash Redis, Vercel Edge Config)
- [ ] Implement per-IP rate limiting (e.g., 60 requests/hour)
- [ ] Implement per-platform rate limiting
- [ ] Add rate limit headers to response
- [ ] Test with load testing tool
- [ ] Monitor rate limit hits in production

**Recommended Libraries**:
- `@upstash/ratelimit` for Redis-based rate limiting
- `rate-limiter-flexible` for memory-based rate limiting

## Important Security Items (Should Complete)

### 4. ⏸️ Content Sanitization

**Status**: ⚠️ Basic filtering implemented, needs enhancement

**Location**: Multiple files

**Tasks**:
- [ ] Add HTML sanitization to prevent XSS
- [ ] Implement SQL injection prevention (parameterized queries already used)
- [ ] Add content length limits
- [ ] Validate URLs before storing
- [ ] Add MIME type validation for media
- [ ] Test with malicious payloads

**Recommended Libraries**:
- `dompurify` for HTML sanitization
- `validator` for URL and input validation

### 5. ⏸️ CRON_SECRET Rotation

**Status**: ⚠️ Manual rotation required

**Tasks**:
- [ ] Set up secret rotation schedule (every 90 days)
- [ ] Create rotation procedure documentation
- [ ] Set calendar reminder for rotation
- [ ] Document emergency rotation procedure
- [ ] Store previous secrets during rotation window

### 6. ⏸️ Environment Variable Security

**Status**: ⚠️ Needs hardening

**Tasks**:
- [ ] Audit all environment variables
- [ ] Ensure service role key is only in server-side code
- [ ] Remove any hardcoded secrets
- [ ] Set up secret scanning (GitHub Advanced Security)
- [ ] Document which variables are sensitive

## Monitoring & Alerting (Recommended)

### 7. ⏸️ Set Up Security Monitoring

**Tasks**:
- [ ] Create alerts for failed aggregations
- [ ] Monitor for suspicious patterns in aggregation logs
- [ ] Set up error tracking (Sentry, Rollbar, etc.)
- [ ] Create dashboard for aggregation health
- [ ] Set up anomaly detection for unusual post volumes

### 8. ⏸️ Implement Audit Logging

**Tasks**:
- [ ] Log all admin actions on RSS feeds
- [ ] Log webhook signature failures
- [ ] Log rate limit violations
- [ ] Create audit log query interface
- [ ] Set retention policy for audit logs

## Testing & Validation

### 9. ⏸️ Security Testing

**Tasks**:
- [ ] Penetration testing on webhook endpoint
- [ ] Test with malformed webhook payloads
- [ ] Verify RLS policies with different user roles
- [ ] Test CRON_SECRET authentication
- [ ] Validate all input sanitization

### 10. ⏸️ Documentation

**Tasks**:
- [ ] Document incident response procedure
- [ ] Create security runbook
- [ ] Document all security controls
- [ ] Create security review checklist for future changes

## Quick Start

To address the critical items first:

1. **Week 1**: Implement webhook signature verification
2. **Week 2**: Set up admin-only RSS feed access
3. **Week 3**: Add rate limiting
4. **Week 4**: Complete testing and monitoring

## Verification

Before going to production, verify:

```bash
# Test webhook signature verification
curl -X POST https://your-domain.com/api/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: invalid_signature" \
  -d '{"platform":"reddit","event_type":"test","data":{}}'
# Expected: 401 Unauthorized

# Test non-admin cannot create RSS feeds
# Login as regular user, try to insert to show_rss_feeds
# Expected: Permission denied

# Test rate limiting
# Send 100 requests in quick succession
# Expected: 429 Too Many Requests after threshold
```

## Notes

- All items marked with ⚠️ are **blocking** for production deployment
- Items marked with ⏸️ are **recommended** but not blocking
- Update this checklist as items are completed
- Review this checklist before each deployment
- Keep a copy in your security documentation

## Contact

For security questions or concerns, contact:
- Development team: [your-team@example.com]
- Security team: [security@example.com]

---

Last Updated: 2026-01-03  
Next Review: Before production deployment
