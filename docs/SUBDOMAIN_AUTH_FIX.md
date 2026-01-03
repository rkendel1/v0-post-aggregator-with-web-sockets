# Subdomain Authentication Fix

## Problem Statement

Users were consistently being logged out when navigating to subdomains (e.g., `latest-breaking-news-on-fox-news.podbridge.app`) and encountered authentication errors when trying to sign in with Google OAuth. Additionally, authenticated users were being prompted to log in again when accessing protected pages like `/queue`, `/saved`, and `/settings`.

## Root Cause

The authentication issue occurred because:

1. **OAuth Redirect URI Mismatch**: When users attempted to sign in from a subdomain, the application was setting the OAuth callback URL to `https://<subdomain>.podbridge.app/auth/callback`. However, OAuth providers like Google only have the main domain callback URL registered (`https://podbridge.app/auth/callback`).

2. **Cross-Subdomain Cookie Issues**: While cookies were being set with `domain: .podbridge.app`, they lacked the explicit `path: '/'` attribute, which could cause compatibility issues in some browsers.

3. **Environment Variable Inconsistency**: Server-side Supabase client creation in `lib/supabase/server.ts` and `middleware.ts` was using `SUPABASE_URL` and `SUPABASE_ANON_KEY`, while client-side code used `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. When server-only env vars weren't set, server-side session validation failed, causing re-login prompts.

## Solution

### Overview

The fix ensures that all OAuth authentication flows use the main domain (`podbridge.app`) for the callback URL, while preserving the user's current subdomain so they can be redirected back after successful authentication. All Supabase clients now use consistent environment variables to ensure reliable session management.

### Implementation Details

#### 1. Authentication Helper Functions (`lib/auth-helpers.ts`)

Created utility functions to manage OAuth URLs consistently:

- **`getOAuthCallbackUrl()`**: Returns the main domain callback URL
  - Production: `https://podbridge.app/auth/callback`
  - Development: `http://localhost:PORT/auth/callback`

- **`getAuthRedirectUrl()`**: Captures the current subdomain URL to redirect back after authentication

- **`isSafeRedirectUrl(url)`**: Validates redirect URLs to prevent open redirect attacks
  - Allows main domain and all subdomains of `podbridge.app`
  - Allows localhost in development
  - Rejects all other domains

- **`isLocalDevelopment()`**: Helper to detect local development environment

#### 2. Sign-In Form Updates (`components/auth/sign-in-form.tsx`)

```typescript
// Before
redirectTo: `${window.location.origin}/auth/callback`

// After
redirectTo: `${getOAuthCallbackUrl()}?next=${encodeURIComponent(originUrl)}`
```

Now passes the subdomain URL as a `next` parameter to redirect back after authentication.

#### 3. Sign-Up Form Updates (`components/auth/sign-up-form.tsx`)

Same changes as sign-in form for both OAuth and email signup flows.

#### 4. Callback Route Security (`app/auth/callback/route.ts`)

Added validation to prevent open redirect attacks:

```typescript
if (next.startsWith('http')) {
  // Validate full URL for security
  if (isSafeRedirectUrl(next)) {
    redirectUrl = next
  } else {
    // Unsafe URL, redirect to main domain instead
    redirectUrl = origin
  }
}
```

#### 5. Cookie Configuration Updates

Added explicit `path: '/'` to all cookie operations in:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `middleware.ts`

This ensures cookies work correctly across all subdomains.

#### 6. Cookie Security Attributes

Added explicit `sameSite` and `secure` attributes to all cookie operations for proper cross-subdomain authentication:

**Updated in all cookie handlers:**
```typescript
const cookieOptions = {
  ...options,
  domain: `.${rootDomain}`,
  path: '/',
  sameSite: 'lax' as const, // Required for cross-subdomain cookies
  secure: true, // Required for cross-subdomain in production (HTTPS)
}
```

**Why this matters:**
- Modern browsers (especially Chrome) require explicit `sameSite` attribute for cross-subdomain cookies
- Without `sameSite: 'lax'`, browsers may block or restrict cookie sharing between subdomains
- The `secure: true` flag is required for cookies with cross-domain scope in production (HTTPS)
- In client-side code, `secure` is dynamically set based on protocol to support localhost development

**Files updated:**
- `lib/supabase/client.ts` - Client-side cookie handling
- `lib/supabase/server.ts` - Server-side cookie handling
- `middleware.ts` - Middleware cookie handling
- `app/auth/callback/route.ts` - OAuth callback cookie handling

#### 7. Environment Variable Consistency

Fixed environment variable inconsistency that was causing re-login prompts:

**Before:**
```typescript
// lib/supabase/server.ts
createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, ...)

// middleware.ts
createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, ...)
```

**After:**
```typescript
// lib/supabase/server.ts
createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, ...)

// middleware.ts
createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, ...)
```

Also removed unreliable env variable mapping from `next.config.mjs` that was attempting to map `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`.

This ensures consistent session validation across all server-side and client-side code, preventing authentication failures on protected pages.

## Authentication Flow

### Before Fix
1. User visits `show-name.podbridge.app`
2. User clicks "Sign in with Google"
3. OAuth redirects to `https://show-name.podbridge.app/auth/callback`
4. ❌ Google rejects - unauthorized redirect URI
5. User sees authentication error

### After Fix
1. User visits `show-name.podbridge.app`
2. User clicks "Sign in with Google"
3. OAuth redirects to `https://podbridge.app/auth/callback?next=https%3A%2F%2Fshow-name.podbridge.app`
4. ✅ Google accepts - authorized redirect URI
5. Callback validates `next` URL is safe
6. User is redirected to `https://show-name.podbridge.app`
7. Cookies work across all subdomains
8. User is authenticated ✅

## Testing

### Manual Testing Checklist

- [ ] **Main Domain Authentication**
  - [ ] Sign in with Google from `podbridge.app`
  - [ ] Sign in with email/password
  - [ ] Verify cookies persist

- [ ] **Subdomain Authentication**
  - [ ] Navigate to `<show-slug>.podbridge.app`
  - [ ] Sign in with Google
  - [ ] Verify redirect to main domain callback
  - [ ] Verify redirect back to subdomain
  - [ ] Verify authentication persists

- [ ] **Cross-Subdomain Navigation**
  - [ ] Sign in on main domain
  - [ ] Navigate to subdomain
  - [ ] Verify still authenticated
  - [ ] Navigate to different subdomain
  - [ ] Verify still authenticated

- [ ] **Security Testing**
  - [ ] Try malicious redirect URL in `next` parameter
  - [ ] Verify redirect to safe domain
  - [ ] Test with external domain in `next`
  - [ ] Verify rejection

### Test URLs

Replace `<show-slug>` with actual show tags from your database:

- Main domain: `https://podbridge.app`
- Subdomain: `https://<show-slug>.podbridge.app`
- Auth callback: `https://podbridge.app/auth/callback?next=https%3A%2F%2F<show-slug>.podbridge.app`

## Security Considerations

1. **Open Redirect Prevention**: The `isSafeRedirectUrl()` function validates all redirect URLs to ensure they belong to the application domain or subdomains.

2. **Cookie Security**: Cookies are set with:
   - `domain: .podbridge.app` - Works across all subdomains
   - `path: /` - Accessible from all paths
   - `sameSite: lax` - Required for cross-subdomain cookie sharing in modern browsers
   - `secure: true` - HTTPS only (in production)
   - CSRF protection via `sameSite` attribute

3. **CodeQL Analysis**: Passed with 0 security vulnerabilities detected.

## Configuration Requirements

### OAuth Provider Setup (Google)

Ensure the following redirect URI is registered in your Google OAuth settings:

```
https://podbridge.app/auth/callback
```

### Environment Variables

```env
NEXT_PUBLIC_ROOT_DOMAIN=podbridge.app
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Rollout Notes

1. **No Breaking Changes**: This fix maintains backward compatibility with existing authentication flows.

2. **Cookie Migration**: Existing cookies will continue to work. New cookies will have the improved configuration.

3. **Deployment**: No special deployment steps required. The changes are fully backward compatible.

## Future Enhancements

1. **Multi-Domain Support**: If needed, the helper functions can be extended to support multiple root domains.

2. **Custom Redirect Logic**: The `next` parameter could be enhanced to support custom redirect paths within subdomains.

3. **Session Management**: Consider adding session refresh logic for long-lived sessions across subdomains.

## Related Files

- `lib/auth-helpers.ts` - Authentication URL helpers
- `components/auth/sign-in-form.tsx` - Sign-in UI
- `components/auth/sign-up-form.tsx` - Sign-up UI
- `app/auth/callback/route.ts` - OAuth callback handler
- `lib/supabase/client.ts` - Client-side Supabase config (uses `NEXT_PUBLIC_*` env vars)
- `lib/supabase/server.ts` - Server-side Supabase config (uses `NEXT_PUBLIC_*` env vars)
- `middleware.ts` - Next.js middleware for routing and session refresh (uses `NEXT_PUBLIC_*` env vars)
- `next.config.mjs` - Next.js configuration (env mapping removed)
- `DEVELOPMENT.md` - Environment variable documentation

## References

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Cookie Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
