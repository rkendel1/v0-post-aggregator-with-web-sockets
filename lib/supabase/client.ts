import { createBrowserClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"

export function createClient() {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          
          return document.cookie
            .split('; ')
            .filter(c => c)
            .map(c => {
              const [name, ...rest] = c.split('=')
              return { name, value: rest.join('=') }
            })
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return
          
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set domain to allow cookie sharing across subdomains
            // Set sameSite and secure for cross-subdomain compatibility
            const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
            const cookieOptions: CookieOptions = {
              ...options,
              domain: `.${rootDomain}`,
              path: '/', // Explicitly set path for better compatibility
              sameSite: 'lax', // Required for cross-subdomain cookies
              secure: isProduction, // Required for cross-subdomain in production
            }
            
            // Build cookie string
            let cookie = `${name}=${value}`
            
            if (cookieOptions.maxAge) {
              cookie += `; max-age=${cookieOptions.maxAge}`
            }
            if (cookieOptions.domain) {
              cookie += `; domain=${cookieOptions.domain}`
            }
            if (cookieOptions.path) {
              cookie += `; path=${cookieOptions.path}`
            }
            if (cookieOptions.sameSite) {
              cookie += `; samesite=${cookieOptions.sameSite}`
            }
            if (cookieOptions.secure) {
              cookie += `; secure`
            }
            
            document.cookie = cookie
          })
        },
      },
    }
  )
}
