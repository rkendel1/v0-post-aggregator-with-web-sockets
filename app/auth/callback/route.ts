import { createServerClient, type CookieOptions } from "@supabase/ssr"
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
    
    // Store cookies to be set on the response
    // We collect cookies here because setAll() is called during exchangeCodeForSession,
    // but we need to apply them to the NextResponse object before returning it
    const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = []
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookieList) {
            // Collect cookies to set them on the response later
            cookieList.forEach(({ name, value, options }) => {
              // Set domain to allow cookie sharing across subdomains
              const cookieOptions: CookieOptions = {
                ...options,
                domain: `.${rootDomain}`,
                path: '/', // Explicitly set path for better compatibility
              }
              cookiesToSet.push({ name, value, options: cookieOptions })
              // Also set on cookieStore for server-side availability (e.g., in middleware)
              // This doesn't affect the HTTP response, but makes cookies available
              // to subsequent server-side code that runs before the response is sent
              try {
                cookieStore.set(name, value, cookieOptions)
              } catch {
                // Ignore errors from Server Component context
              }
            })
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
      
      // Create the redirect response
      const response = NextResponse.redirect(redirectUrl)
      
      // Set all collected cookies on the response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      
      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
