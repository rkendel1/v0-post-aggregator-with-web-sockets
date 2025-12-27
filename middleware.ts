import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  if (hostname.startsWith('localhost')) {
    return response
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return response
  }

  const subdomain = hostname.replace(`.${rootDomain}`, '')
  if (subdomain) {
    // 1. Check for a direct subdomain mapping
    const { data: mapping } = await supabase
      .from('subdomain_mappings')
      .select('show_tags(tag)')
      .eq('subdomain', subdomain)
      .single()

    const mappedTagSlug = (mapping as any)?.show_tags?.tag

    if (mappedTagSlug) {
      return NextResponse.rewrite(new URL(`/show/${mappedTagSlug}${url.pathname}`, request.url), response)
    }

    // 2. If no mapping, check if the subdomain is an alias tag
    const { data: tagData } = await supabase
      .from('show_tags')
      .select('tag, parent:parent_tag_id(tag)')
      .ilike('tag', subdomain)
      .single()

    if (tagData) {
      // The parent relationship is returned as an array, so we access the first element.
      if (tagData.parent?.[0]?.tag) {
        // It's an alias, rewrite to the parent's slug
        return NextResponse.rewrite(new URL(`/show/${tagData.parent[0].tag}${url.pathname}`, request.url), response)
      }
      // It's a canonical tag without a mapping, rewrite to its own slug
      return NextResponse.rewrite(new URL(`/show/${tagData.tag}${url.pathname}`, request.url), response)
    }
    
    // 3. Fallback: if no mapping and no tag found, let the page show "Not Found"
    return NextResponse.rewrite(new URL(`/show/${subdomain}${url.pathname}`, request.url), response)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}