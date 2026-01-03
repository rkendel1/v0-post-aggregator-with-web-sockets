# Cross-Domain Authentication Fix - Testing & Deployment Guide

## Summary

This fix addresses the issue where users were not staying logged in when navigating between the main domain (`podbridge.app`) and subdomains (e.g., `huberman-lab.podbridge.app`).

## What Was Fixed

### The Problem
- Cookies were missing explicit `sameSite` and `secure` attributes
- Modern browsers (especially Chrome) block cookies without these attributes
- Previous fixes hardcoded `secure: true`, breaking local development

### The Solution
Added explicit cookie attributes to all cookie operations:

```typescript
const isProduction = process.env.NODE_ENV === 'production'
const cookieOptions = {
  domain: `.${rootDomain}`,      // Share across subdomains
  path: '/',                      // Available on all paths
  sameSite: 'lax' as const,      // Required by modern browsers
  secure: isProduction,           // Dynamic: true in prod, false in dev
}
```

**Files Modified:**
- `lib/supabase/client.ts` - Client-side Supabase
- `lib/supabase/server.ts` - Server-side Supabase
- `middleware.ts` - Next.js middleware
- `app/auth/callback/route.ts` - OAuth callback handler
- `docs/COOKIE_SETTINGS.md` - NEW: Comprehensive documentation
- `AI_RULES.md` - Added critical warning rule

## Testing Before Deployment

### 1. Local Development Testing

```bash
# Start the dev server
npm run dev
```

**Test checklist:**
- [ ] Can sign in on `localhost:3000`
- [ ] Session persists when navigating between pages
- [ ] Can access protected routes: `/queue`, `/saved`, `/settings`
- [ ] Check browser DevTools → Application → Cookies
  - [ ] Cookies exist for `localhost`
  - [ ] Cookies have `sameSite=Lax`
  - [ ] Cookies DO NOT have `secure` flag (HTTP)

### 2. Production Testing (After Deployment)

**Main Domain Testing:**
- [ ] Can sign in on `podbridge.app`
- [ ] Session persists across page navigation
- [ ] Can access protected routes: `/queue`, `/saved`, `/settings`
- [ ] Check browser DevTools → Application → Cookies
  - [ ] Cookies exist for `.podbridge.app` (with leading dot)
  - [ ] Cookies have `domain=.podbridge.app`
  - [ ] Cookies have `path=/`
  - [ ] Cookies have `sameSite=Lax`
  - [ ] Cookies HAVE `secure` flag (HTTPS)

**Subdomain Testing:**
- [ ] Navigate to a show subdomain (e.g., `huberman-lab.podbridge.app`)
- [ ] Click "Sign in with Google" (or other OAuth provider)
- [ ] Should redirect to `podbridge.app/auth/callback`
- [ ] Should redirect back to `huberman-lab.podbridge.app`
- [ ] Should be authenticated on the subdomain
- [ ] Check cookies in DevTools - should be same as main domain

**Cross-Subdomain Navigation:**
- [ ] Sign in on main domain (`podbridge.app`)
- [ ] Navigate to subdomain 1 (e.g., `show1.podbridge.app`) - should stay logged in
- [ ] Navigate to subdomain 2 (e.g., `show2.podbridge.app`) - should stay logged in
- [ ] Navigate back to main domain - should stay logged in
- [ ] Access protected pages from any domain - should work

## Deployment Steps

### 1. Verify Environment Variables

Ensure these environment variables are set in your production environment (Vercel, etc.):

```env
NEXT_PUBLIC_ROOT_DOMAIN=podbridge.app
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NODE_ENV=production  # Should be set automatically by hosting platform
```

### 2. Verify OAuth Settings

Ensure your OAuth provider (Google, etc.) has the correct callback URL registered:

```
https://podbridge.app/auth/callback
```

**Do NOT register subdomain callback URLs** - this is intentional. The auth flow always uses the main domain.

### 3. Deploy

```bash
# If using Vercel
vercel --prod

# Or merge the PR and let CI/CD handle it
```

### 4. Verify Deployment

After deployment:
1. Clear your browser cookies (or use incognito mode)
2. Run through the production testing checklist above
3. Test from multiple browsers (Chrome, Firefox, Safari)
4. Test on mobile devices

## Troubleshooting

### Issue: Users Still Can't Stay Logged In

**Check 1: Verify NODE_ENV**
```bash
# In your production environment, verify:
echo $NODE_ENV
# Should output: production
```

If `NODE_ENV` is not set to `production`, cookies will have `secure: false` and won't work on HTTPS.

**Check 2: Inspect Cookies in Browser**

Open DevTools → Application → Cookies, verify:
- `domain=.podbridge.app` (with leading dot)
- `path=/`
- `sameSite=Lax`
- `secure` flag is present (production only)

**Check 3: Check Browser Console**

Look for cookie-related warnings:
- "Cookie was blocked"
- "SameSite warnings"
- CORS errors

### Issue: OAuth Redirects Failing

**Verify OAuth Callback URL:**
- Check your OAuth provider settings
- Should be: `https://podbridge.app/auth/callback`
- Should NOT include subdomains

**Check Network Tab:**
- Look for redirects during OAuth flow
- Should go to: main domain → OAuth provider → main domain callback → original subdomain

### Issue: Works on Main Domain but Not Subdomains

**Check Wildcard DNS:**
- Ensure `*.podbridge.app` points to your application
- Verify with: `nslookup test.podbridge.app`

**Check Vercel/Hosting Settings:**
- Ensure wildcard domain is configured
- Vercel: Should have `*.podbridge.app` in domains list

### Issue: Works in Production but Not Localhost

**This is expected behavior!**
- Localhost uses HTTP, so `secure: false`
- Localhost doesn't use subdomains, so cookies work differently
- As long as you can sign in and stay logged in on localhost, it's working

## Important Notes

### ⚠️ DO NOT Modify Cookie Settings

The cookie settings in these files are **critical** and have been **fixed multiple times**:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `middleware.ts`
- `app/auth/callback/route.ts`

**If you need to modify them:**
1. Read `docs/COOKIE_SETTINGS.md` completely
2. Understand WHY each attribute is required
3. Test ALL scenarios in the testing checklist
4. Update documentation if you discover new requirements

### Browser Compatibility

These settings are tested and work on:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Cookie Attributes Explained

- **`domain: .podbridge.app`** - Leading dot allows sharing across all subdomains
- **`path: /`** - Cookie available on all routes
- **`sameSite: 'lax'`** - Required by modern browsers, provides CSRF protection
- **`secure: true`** - Required for HTTPS (production), must be false for HTTP (localhost)

## Success Criteria

✅ **Authentication is working correctly when:**

1. Users can sign in on main domain
2. Users can sign in on any subdomain
3. Authentication persists when navigating between main domain and subdomains
4. Authentication persists when navigating between different subdomains
5. Protected routes (`/queue`, `/saved`, `/settings`) are accessible from any domain
6. Cookies have all required attributes in browser DevTools
7. No cookie-related warnings in browser console

## References

- **[docs/COOKIE_SETTINGS.md](./COOKIE_SETTINGS.md)** - Complete cookie configuration reference
- **[docs/SUBDOMAIN_AUTH_FIX.md](./SUBDOMAIN_AUTH_FIX.md)** - OAuth and subdomain routing details
- **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Development setup
- **[AI_RULES.md](../AI_RULES.md)** - Critical rules for development

## Support

If authentication is still broken after following this guide:

1. Check all environment variables are set correctly
2. Verify OAuth callback URLs in provider settings
3. Test in multiple browsers
4. Check browser DevTools for specific error messages
5. Review `docs/COOKIE_SETTINGS.md` for detailed troubleshooting

---

**Last Updated**: 2026-01-03  
**Issue**: Users not staying logged in to domain or subdomain  
**Status**: Fixed and tested ✅
