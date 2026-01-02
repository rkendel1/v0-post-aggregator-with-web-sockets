# Testing Guide - Authentication UI Improvements

## Quick Test Checklist

### 1. Sign-In and Sign-Up Distinction
Visit `/auth/login` and verify:

- [ ] Two clear tabs: "Sign In" and "Sign Up"
- [ ] Active tab is visually highlighted
- [ ] Sign In tab shows "Welcome back" heading
- [ ] Sign Up tab shows "Create an account" heading
- [ ] Different description text for each tab
- [ ] Can easily switch between tabs

### 2. OAuth Provider Buttons
On both Sign In and Sign Up tabs:

- [ ] Google button is displayed with Google icon
- [ ] Apple button is displayed with Apple icon
- [ ] Discord button is displayed with Discord icon
- [ ] Buttons have appropriate text ("Continue with" vs "Sign up with")
- [ ] All buttons are visually consistent
- [ ] Buttons show loading state when clicked

**Note:** OAuth buttons will only work if providers are configured in Supabase. Without configuration, they will show an error message.

### 3. Email/Password Forms

#### Sign In Form
- [ ] Email input field
- [ ] Single password input field
- [ ] "Sign in" button
- [ ] "Forgot your password?" link
- [ ] "Don't have an account? Sign up" link at bottom
- [ ] Clicking "Sign up" link switches to Sign Up tab

#### Sign Up Form
- [ ] Email input field
- [ ] "Create a Password" field
- [ ] "Confirm Password" field
- [ ] "Sign up" button
- [ ] "Already have an account? Sign in" link at bottom
- [ ] Clicking "Sign in" link switches to Sign In tab
- [ ] Password confirmation validation works

### 4. Password Reset Flow
- [ ] Click "Forgot your password?" on sign-in form
- [ ] Enter email address
- [ ] Click to send reset email
- [ ] See success toast message
- [ ] (In production) Receive email with reset link
- [ ] (In production) Clicking link redirects to `/auth/reset-password`
- [ ] Can set new password with confirmation
- [ ] Redirects to home after successful reset

### 5. Auth Modal (In-App)
Test the auth modal that appears when trying to perform authenticated actions:

- [ ] Modal shows tabs for Sign In and Sign Up
- [ ] Same layout as login page but in modal format
- [ ] Can switch between tabs
- [ ] OAuth buttons work in modal
- [ ] Email/password forms work in modal
- [ ] Modal closes after successful authentication

### 6. URL Parameters
- [ ] `/auth/login` defaults to Sign In tab
- [ ] `/auth/login?mode=signup` defaults to Sign Up tab

### 7. Error Handling
- [ ] Invalid email shows error message
- [ ] Wrong password shows error message
- [ ] Passwords not matching shows error message
- [ ] Password too short shows error message
- [ ] Network errors show appropriate toast messages
- [ ] OAuth errors redirect to `/auth/auth-code-error`

### 8. Visual Design
- [ ] Tab navigation is clear and prominent
- [ ] OAuth buttons have proper spacing
- [ ] Divider between OAuth and email sections is visible
- [ ] Form fields are properly aligned
- [ ] Buttons have hover states
- [ ] Loading states show spinner
- [ ] Overall design matches PodBridge branding

## OAuth Setup (For Full Testing)

To test OAuth providers, configure them in Supabase:

### Supabase Dashboard Steps
1. Go to Authentication → Providers
2. Enable desired providers (Google, Apple, Discord)
3. For each provider:
   - Enter Client ID
   - Enter Client Secret
   - Add redirect URL: `https://your-domain.com/auth/callback`
   - Save configuration

### Provider-Specific Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

#### Apple OAuth
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create Sign in with Apple service
3. Configure return URLs
4. Copy credentials to Supabase

#### Discord OAuth
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create an application
3. Add OAuth2 redirect: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

## Expected Behavior

### Successful Sign-In
1. User enters email and password (or uses OAuth)
2. Loading spinner appears on button
3. Success toast notification appears
4. User is redirected to home page
5. User is now authenticated

### Successful Sign-Up
1. User enters email and password (with confirmation)
2. Loading spinner appears on button
3. Success toast appears: "Account created! Please check your email..."
4. (In production) Verification email is sent
5. User can sign in after verifying email

### Failed Authentication
1. User enters invalid credentials
2. Error toast appears with specific message
3. Form remains in place for retry
4. No page redirect

## Automated Testing (Future)

Recommended test cases to add:
- Tab switching functionality
- Form validation (password length, email format, password matching)
- OAuth button clicks (with mocked responses)
- Toast notifications appear correctly
- Redirect after successful authentication
- Error handling for network failures

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- [ ] Tab navigation works with keyboard
- [ ] Forms can be filled using keyboard only
- [ ] Screen reader announces tab changes
- [ ] Error messages are announced
- [ ] Focus is managed properly

## Performance

- [ ] Page loads quickly
- [ ] Tab switching is instant
- [ ] No layout shift during loading
- [ ] Images/icons load quickly

## Known Limitations

1. **OAuth Requires Configuration**: OAuth buttons won't work until providers are configured in Supabase
2. **Email Verification**: In production, users need to verify email before signing in
3. **Rate Limiting**: Supabase may rate-limit authentication attempts

## Troubleshooting

### OAuth buttons show errors
- Check Supabase provider configuration
- Verify redirect URLs are correct
- Check browser console for specific errors

### Password reset email not received
- Check spam folder
- Verify email service is configured in Supabase
- Check Supabase email templates

### Tab navigation not working
- Check browser console for JavaScript errors
- Verify Radix UI Tabs component is properly installed
- Clear browser cache

## Support

For issues or questions:
1. Check AUTH_IMPROVEMENTS_SUMMARY.md for implementation details
2. Review AUTH_UI_COMPARISON.md for expected UI behavior
3. Check browser console for error messages
4. Verify Supabase configuration
