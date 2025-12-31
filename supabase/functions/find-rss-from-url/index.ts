import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore: Deno relative import
import { verifyJwt } from '../_shared/auth.ts'
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authResult = await verifyJwt(req)
  if (!authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  try {
    const { pageUrl } = await req.json()
    if (!pageUrl) {
      return new Response(JSON.stringify({ error: 'pageUrl is required' }), { status: 400, headers: corsHeaders })
    }

    const response = await fetch(pageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }
    const html = await response.text()

    const doc = new DOMParser().parseFromString(html, "text/html")
    if (!doc) {
      throw new Error("Failed to parse HTML document")
    }

    const linkElement = doc.querySelector('link[rel="alternate"][type="application/rss+xml"]')
    
    if (linkElement) {
      let rssUrl = linkElement.getAttribute('href')
      if (rssUrl) {
        // Resolve relative URLs against the base page URL
        rssUrl = new URL(rssUrl, pageUrl).href
        return new Response(JSON.stringify({ rssUrl }), { headers: corsHeaders, status: 200 })
      }
    }

    return new Response(JSON.stringify({ error: 'No RSS feed link found on the page' }), { status: 404, headers: corsHeaders })

  } catch (error) {
    console.error('Error finding RSS feed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { headers: corsHeaders, status: 500 })
  }
})