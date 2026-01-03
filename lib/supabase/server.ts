import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server-side Supabase client with cross-subdomain cookie support
 * 
 * ⚠️ WARNING: DO NOT MODIFY COOKIE SETTINGS WITHOUT READING docs/COOKIE_SETTINGS.md
 * These settings are critical for cross-subdomain authentication and have been fixed multiple times.
 * Changing these settings WILL break user authentication across subdomains.
 */
export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
  
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          // ⚠️ DO NOT MODIFY: These cookie settings are critical for cross-subdomain auth
          // See docs/COOKIE_SETTINGS.md for details. These have been fixed multiple times.
          // Set domain to allow cookie sharing across subdomains
          // Set sameSite and secure for cross-subdomain compatibility
          // In development (localhost), secure should be false; in production (HTTPS), it should be true
          const isProduction = process.env.NODE_ENV === 'production'
          const cookieOptions = {
            ...options,
            domain: `.${rootDomain}`,
            path: '/', // Explicitly set path for better compatibility
            sameSite: 'lax' as const, // Required for cross-subdomain cookies
            secure: isProduction, // Required for cross-subdomain in production
          }
          cookieStore.set({ name, value, ...cookieOptions })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          // ⚠️ DO NOT MODIFY: These cookie settings are critical for cross-subdomain auth
          // See docs/COOKIE_SETTINGS.md for details. These have been fixed multiple times.
          // Set domain to allow cookie removal across subdomains
          // Set sameSite and secure for cross-subdomain compatibility
          // In development (localhost), secure should be false; in production (HTTPS), it should be true
          const isProduction = process.env.NODE_ENV === 'production'
          const cookieOptions = {
            ...options,
            domain: `.${rootDomain}`,
            path: '/', // Explicitly set path for better compatibility
            sameSite: 'lax' as const, // Required for cross-subdomain cookies
            secure: isProduction, // Required for cross-subdomain in production
          }
          cookieStore.set({ name, value: "", ...cookieOptions })
        } catch (error) {
          // The `remove` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}