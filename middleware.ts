import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Root-level application routes that should not be rewritten on subdomains
const ROOT_LEVEL_ROUTES = ['/queue', '/saved', '/settings', '/admin', '/auth', '/post']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()

  const url = request.nextUrl
  const hostname = request.headers.get('host')!
  const pathname = url.pathname

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'

  if (
    hostname.startsWith('localhost') ||
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`
  ) {
    return response
  }

  const subdomain = hostname.replace(`.${rootDomain}`, '')
  if (subdomain) {
    // Don't rewrite root-level application routes - these should work the same on subdomains
    const isRootLevelRoute = ROOT_LEVEL_ROUTES.some(route => pathname.startsWith(route))
    
    if (isRootLevelRoute) {
      return response
    }

    // 1. Check for a direct subdomain mapping to a canonical tag
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

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}