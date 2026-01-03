import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { isSafeRedirectUrl } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Get the 'next' parameter to redirect back to the original subdomain/page
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = await cookies()
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // Set domain to allow cookie sharing across subdomains
                const cookieOptions = {
                  ...options,
                  domain: `.${rootDomain}`,
                  path: '/', // Explicitly set path for better compatibility
                }
                cookieStore.set(name, value, cookieOptions)
              })
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Validate the redirect URL to prevent open redirect attacks
      // If next is a full URL, validate it; otherwise construct it relative to origin
      let redirectUrl: string
      
      if (next.startsWith('http')) {
        // Validate full URL for security
        if (isSafeRedirectUrl(next)) {
          redirectUrl = next
        } else {
          // Unsafe URL, redirect to main domain instead
          redirectUrl = origin
        }
      } else {
        // Relative path, safe to use
        redirectUrl = `${origin}${next}`
      }
      
      return NextResponse.redirect(redirectUrl)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
