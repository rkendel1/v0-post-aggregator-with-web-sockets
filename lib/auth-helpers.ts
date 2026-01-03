/**
 * Auth helper functions for cross-subdomain authentication
 */

/**
 * Gets the main domain callback URL for OAuth flows
 * 
 * When users are on subdomains (e.g., show-name.podbridge.app), OAuth providers
 * need to redirect to a consistent callback URL that's registered in their settings.
 * This function ensures we always use the main domain for OAuth callbacks.
 * 
 * @returns The OAuth callback URL using the main domain (e.g., https://podbridge.app/auth/callback)
 */
export function getOAuthCallbackUrl(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
  
  // In production, always use HTTPS with the main domain
  // In development, use the current origin (localhost)
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.0.0.1')) {
      return `${window.location.origin}/auth/callback`
    }
    
    // Use HTTPS and the main domain for OAuth callback
    return `https://${rootDomain}/auth/callback`
  }
  
  // Fallback for SSR
  return `https://${rootDomain}/auth/callback`
}

/**
 * Gets the redirect URL after successful authentication
 * 
 * After OAuth completes on the main domain, we want to redirect users back
 * to where they came from (potentially a subdomain).
 * 
 * @returns The URL to redirect to after authentication, preserving the subdomain
 */
export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '/'
  
  const currentUrl = window.location.href
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
  
  // If we're on localhost, just return the current origin
  if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.0.0.1')) {
    return window.location.origin
  }
  
  // If we're already on the main domain, just return it
  if (window.location.hostname === rootDomain || window.location.hostname === `www.${rootDomain}`) {
    return window.location.origin
  }
  
  // We're on a subdomain, preserve it for the redirect after auth
  return window.location.origin
}
