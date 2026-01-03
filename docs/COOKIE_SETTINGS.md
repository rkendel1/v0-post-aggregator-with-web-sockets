# Cookie Settings - DO NOT MODIFY

## ⚠️ CRITICAL: READ BEFORE MAKING ANY CHANGES ⚠️

**This document describes the EXACT cookie configuration required for cross-subdomain authentication to work.**

These settings have been carefully tuned and tested. **DO NOT modify these settings** unless you fully understand the implications and have tested across all scenarios (main domain, subdomains, localhost development, production HTTPS).

### Why These Specific Settings?

This application uses **subdomain-based routing** where each show can have its own subdomain (e.g., `huberman-lab.podbridge.app`). Users must stay authenticated when navigating between:
- Main domain (`podbridge.app`)
- Various subdomains (`show1.podbridge.app`, `show2.podbridge.app`)
- Protected pages (`/queue`, `/saved`, `/settings`)

Modern browsers (especially Chrome) have **strict cookie policies** that block cookies without proper attributes.

## Required Cookie Configuration

**ALL cookie operations MUST use these EXACT settings:**

```typescript
const isProduction = process.env.NODE_ENV === 'production' // Server-side
// OR
const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:' // Client-side

const cookieOptions = {
  ...options,                          // Preserve any options from Supabase
  domain: `.${rootDomain}`,            // ✅ REQUIRED: Dot prefix for subdomain sharing
  path: '/',                           // ✅ REQUIRED: Available on all paths
  sameSite: 'lax' as const,           // ✅ REQUIRED: Cross-subdomain compatibility
  secure: isProduction,                // ✅ REQUIRED: Dynamic based on environment
}
```

### Why Each Attribute Matters

#### 1. `domain: '.podbridge.app'` (with leading dot)
- **Purpose**: Allows cookies to be shared across ALL subdomains
- **Without this**: Cookies set on `podbridge.app` won't work on `show.podbridge.app`
- **Must have leading dot**: `.podbridge.app` (not `podbridge.app`)

#### 2. `path: '/'`
- **Purpose**: Makes cookies accessible from all paths in the application
- **Without this**: Cookies might not be available on all routes
- **Always use**: `/` (never omit or use a specific path like `/auth`)

#### 3. `sameSite: 'lax'`
- **Purpose**: Required by modern browsers for cross-subdomain cookie sharing
- **Without this**: Chrome and other browsers may block or restrict cookies
- **Must be explicit**: Browsers no longer accept cookies without this attribute
- **Type safety**: Use `'lax' as const` for TypeScript type safety
- **Why 'lax' not 'strict'**: 'strict' would block cookies on cross-subdomain navigation
- **Why 'lax' not 'none'**: 'none' requires complex CORS setup and is less secure

#### 4. `secure: isProduction` (dynamic)
- **Purpose**: Required for cookies with cross-domain scope in HTTPS (production)
- **Why dynamic**: 
  - Production (HTTPS): `secure: true` is REQUIRED by browsers
  - Development (HTTP): `secure: false` is REQUIRED or cookies won't work on localhost
- **Without this**: 
  - If hardcoded `true`: Breaks local development
  - If hardcoded `false`: Breaks production (browsers reject the cookies)
  - If omitted: Browsers reject cross-subdomain cookies

## Files Using This Configuration

**DO NOT modify cookie settings in these files without updating ALL of them:**

1. **`lib/supabase/client.ts`** - Client-side Supabase
   - Uses `window.location.protocol === 'https:'` to detect production
   
2. **`lib/supabase/server.ts`** - Server-side Supabase  
   - Uses `process.env.NODE_ENV === 'production'` to detect production
   
3. **`middleware.ts`** - Next.js middleware
   - Uses `process.env.NODE_ENV === 'production'` to detect production
   
4. **`app/auth/callback/route.ts`** - OAuth callback handler
   - Uses `process.env.NODE_ENV === 'production'` to detect production

## Common Mistakes to Avoid

### ❌ DON'T: Hardcode `secure: true`
```typescript
// ❌ WRONG - Breaks localhost development
const cookieOptions = {
  domain: '.podbridge.app',
  path: '/',
  sameSite: 'lax' as const,
  secure: true, // ❌ This breaks HTTP (localhost)
}
```

### ❌ DON'T: Omit `sameSite`
```typescript
// ❌ WRONG - Modern browsers will block these cookies
const cookieOptions = {
  domain: '.podbridge.app',
  path: '/',
  // ❌ Missing sameSite - browsers will block!
}
```

### ❌ DON'T: Use `sameSite: 'strict'`
```typescript
// ❌ WRONG - Blocks cross-subdomain navigation
const cookieOptions = {
  domain: '.podbridge.app',
  path: '/',
  sameSite: 'strict', // ❌ Too restrictive for subdomains
}
```

### ❌ DON'T: Forget the leading dot in domain
```typescript
// ❌ WRONG - Won't work on subdomains
const cookieOptions = {
  domain: 'podbridge.app', // ❌ Missing leading dot
  path: '/',
  sameSite: 'lax' as const,
}
```

### ✅ DO: Use the exact configuration shown above
```typescript
// ✅ CORRECT
const isProduction = process.env.NODE_ENV === 'production'
const cookieOptions = {
  ...options,
  domain: `.${rootDomain}`,
  path: '/',
  sameSite: 'lax' as const,
  secure: isProduction,
}
```

## Testing Checklist

If you MUST modify cookie settings, test ALL of these scenarios:

- [ ] **Localhost Development**
  - [ ] Can sign in on `localhost:3000`
  - [ ] Session persists across page navigation
  - [ ] Can access protected pages (`/queue`, `/saved`, `/settings`)

- [ ] **Production Main Domain**
  - [ ] Can sign in on `podbridge.app`
  - [ ] Session persists across page navigation
  - [ ] Can access protected pages
  - [ ] Cookies have `secure` flag in browser DevTools

- [ ] **Production Subdomain**
  - [ ] Can sign in on `show-name.podbridge.app`
  - [ ] OAuth redirects to main domain callback
  - [ ] Redirects back to subdomain after auth
  - [ ] Session persists on subdomain

- [ ] **Cross-Subdomain Navigation**
  - [ ] Sign in on main domain
  - [ ] Navigate to subdomain - still authenticated
  - [ ] Navigate to different subdomain - still authenticated
  - [ ] Navigate back to main domain - still authenticated
  - [ ] Access protected pages from any domain/subdomain

- [ ] **Browser Cookie Inspection**
  - [ ] Check browser DevTools → Application → Cookies
  - [ ] Verify cookies have `domain=.podbridge.app`
  - [ ] Verify cookies have `path=/`
  - [ ] Verify cookies have `sameSite=Lax`
  - [ ] Verify cookies have `secure` (in production only)

## Troubleshooting

### Users Not Staying Logged In

1. **Check browser console for cookie warnings**
   - Look for "Cookie was blocked" messages
   - Look for sameSite warnings

2. **Inspect cookies in DevTools**
   - Open DevTools → Application → Cookies
   - Check if cookies exist
   - Verify all attributes are correct

3. **Verify environment variables**
   ```bash
   NEXT_PUBLIC_ROOT_DOMAIN=podbridge.app
   NODE_ENV=production  # In production
   ```

4. **Check NODE_ENV in production**
   - Many hosting platforms (Vercel, etc.) set this automatically
   - If not set, cookies will have `secure: false` in production (won't work!)

### OAuth Callback Issues

If OAuth fails, it's likely NOT a cookie issue. Check:
- OAuth redirect URI is registered: `https://podbridge.app/auth/callback`
- `getOAuthCallbackUrl()` returns the main domain (not subdomain)
- See `docs/SUBDOMAIN_AUTH_FIX.md` for OAuth-specific issues

## History

**This has been fixed multiple times.** Each time, someone modified the cookie settings and broke authentication. The issues included:

1. **Missing `sameSite` attribute** → Browsers blocked cookies
2. **Hardcoded `secure: true`** → Broke localhost development  
3. **Missing leading dot in domain** → Cookies didn't work on subdomains
4. **Using `sameSite: 'strict'`** → Blocked cross-subdomain navigation

**Please don't repeat history. If it works, don't touch it.**

## References

- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Chrome Cookie Updates](https://developer.chrome.com/docs/privacy-security/samesite-cookie-recipes/)
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Cookie Security Best Practices](https://owasp.org/www-community/controls/SecureCookieAttribute)

## Support

If authentication is broken and you need to modify these settings:

1. **Read this entire document**
2. **Review `docs/SUBDOMAIN_AUTH_FIX.md`** for the full history
3. **Test ALL scenarios** in the Testing Checklist above
4. **Update this document** if you discover new requirements
5. **Don't just "try something" - understand WHY these settings work**

---

**Last Updated**: 2026-01-03  
**Related Issues**: Users not staying logged in across domains/subdomains  
**Related Docs**: `docs/SUBDOMAIN_AUTH_FIX.md`, `DEVELOPMENT.md`
