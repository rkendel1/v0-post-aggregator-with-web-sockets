import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Root-level application routes that should not be rewritten on subdomains
 * These routes work the same way on both main domain and subdomains
 */
const ROOT_LEVEL_ROUTES = ['/queue', '/saved', '/settings', '/admin', '/auth', '/post']

/**
 * Next.js Middleware for PodBridge Subdomain Routing
 * 
 * This middleware enables show-specific subdomains (e.g., huberman-lab.podbridge.app)
 * by rewriting requests to the appropriate /show/[showTag] route.
 * 
 * Flow:
 * 1. Set up Supabase client with cross-subdomain cookie support
 * 2. Check if request is on main domain or subdomain
 * 3. For subdomains:
 *    a. Check subdomain_mappings table for explicit mapping
 *    b. Check show_tags table for direct match (including aliases)
 *    c. Fallback to /show/[subdomain] and let page handle 404
 * 
 * Special cases:
 * - Root-level routes (queue, settings, etc.) are NOT rewritten
 * - Cookies are shared across subdomains for authentication
 * - localhost and www are treated as main domain
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client with cookie handling
  // Cookies are set with domain=.podbridge.app to work across all subdomains
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set domain to allow cookie sharing across subdomains
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
          const cookieOptions = {
            ...options,
            domain: `.${rootDomain}`,
            path: '/', // Explicitly set path for better compatibility
          }
          request.cookies.set({ name, value, ...cookieOptions })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...cookieOptions })
        },
        remove(name: string, options: CookieOptions) {
          // Set domain to allow cookie removal across subdomains
          const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
          const cookieOptions = {
            ...options,
            domain: `.${rootDomain}`,
            path: '/', // Explicitly set path for better compatibility
          }
          request.cookies.set({ name, value: '', ...cookieOptions })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...cookieOptions })
        },
      },
    }
  )

  // Refresh auth session
  await supabase.auth.getUser()

  // Parse request URL
  const url = request.nextUrl
  const hostname = request.headers.get('host')!
  const pathname = url.pathname

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'

  // If on main domain (podbridge.app, www.podbridge.app, or localhost), no rewriting needed
  if (
    hostname.startsWith('localhost') ||
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`
  ) {
    return response
  }

  // Extract subdomain (e.g., "huberman-lab" from "huberman-lab.podbridge.app")
  const subdomain = hostname.replace(`.${rootDomain}`, '')
  if (subdomain) {
    // Don't rewrite root-level application routes - these should work the same on subdomains
    const isRootLevelRoute = ROOT_LEVEL_ROUTES.some(route => pathname.startsWith(route))
    
    if (isRootLevelRoute) {
      return response
    }

    // 1. Check for a direct subdomain mapping to a canonical tag
    // This allows custom subdomains to map to specific show tags
    const { data: mapping } = await supabase
      .from('subdomain_mappings')
      .select('show_tags(tag)')
      .eq('subdomain', subdomain)
      .single()

    const mappedTagSlug = (mapping as any)?.show_tags?.tag
    if (mappedTagSlug) {
      return NextResponse.rewrite(new URL(`/show/${mappedTagSlug}${pathname}`, request.url), response)
    }

    // 2. If no mapping, check if the subdomain matches an alias tag
    // This handles direct subdomain = tag slug matches
    const { data: tagData } = await supabase
      .from('show_tags')
      .select('tag, parent:parent_tag_id(tag)')
      .ilike('tag', subdomain)
      .single()

    if (tagData) {
      // If it's an alias with a parent, rewrite to the parent's slug
      if (tagData.parent && (tagData.parent as any).tag) {
        return NextResponse.rewrite(new URL(`/show/${(tagData.parent as any).tag}${pathname}`, request.url), response)
      }
      // Otherwise, it's a canonical tag, rewrite to its own slug
      return NextResponse.rewrite(new URL(`/show/${tagData.tag}${pathname}`, request.url), response)
    }
    
    // 3. Fallback: if no mapping and no tag found, let the page handle the "Not Found" state
    return NextResponse.rewrite(new URL(`/show/${subdomain}${pathname}`, request.url), response)
  }

  return response
}

/**
 * Middleware matcher configuration
 * Runs on all routes except:
 * - API routes
 * - Static files (_next/static, _next/image)
 * - Favicon
 * - Image files (svg, png, jpg, jpeg, gif, webp)
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}