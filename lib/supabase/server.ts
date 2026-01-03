import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
  
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          // Set domain to allow cookie sharing across subdomains
          const cookieOptions = {
            ...options,
            domain: `.${rootDomain}`,
            path: '/', // Explicitly set path for better compatibility
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
          // Set domain to allow cookie removal across subdomains
          const cookieOptions = {
            ...options,
            domain: `.${rootDomain}`,
            path: '/', // Explicitly set path for better compatibility
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