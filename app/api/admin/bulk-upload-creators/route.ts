import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { parseCreatorCSV, parseCreatorJSON, validateCreatorData, ParsedCreatorData, UploadResult } from '@/lib/creator-upload'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { content, format } = body

    if (!content || !format) {
      return NextResponse.json({ error: 'Missing content or format' }, { status: 400 })
    }

    // Parse content based on format
    let creators: ParsedCreatorData[]
    try {
      if (format === 'csv') {
        creators = parseCreatorCSV(content)
      } else if (format === 'json') {
        creators = parseCreatorJSON(content)
      } else {
        return NextResponse.json({ error: 'Invalid format. Must be csv or json' }, { status: 400 })
      }
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Failed to parse content', 
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 400 })
    }

    // Validate and process each creator
    const result: UploadResult = {
      success: true,
      created: 0,
      errors: []
    }

    // Fetch all existing tags in one query for efficient duplicate checking
    const creatorTags = creators.map(c => c.tag)
    const { data: existingTags } = await supabase
      .from('show_tags')
      .select('tag')
      .in('tag', creatorTags)
    
    const existingTagSet = new Set((existingTags || []).map(t => t.tag))

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i]
      
      // Validate data
      const validationErrors = validateCreatorData(creator)
      if (validationErrors.length > 0) {
        result.errors.push({
          row: format === 'csv' ? i + 2 : i + 1, // +2 for CSV header, +1 for JSON array index
          tag: creator.tag,
          error: validationErrors.join(', '),
          severity: 'error'
        })
        continue
      }

      try {
        // Check if tag already exists using the fetched set
        if (existingTagSet.has(creator.tag)) {
          result.errors.push({
            row: format === 'csv' ? i + 2 : i + 1,
            tag: creator.tag,
            error: 'Tag already exists',
            severity: 'error'
          })
          continue
        }

        // Insert show tag
        const { data: newTag, error: tagError } = await supabase
          .from('show_tags')
          .insert({
            tag: creator.tag,
            name: creator.name,
            category: creator.category || null
          })
          .select()
          .single()

        if (tagError || !newTag) {
          throw new Error(tagError?.message || 'Failed to create tag')
        }

        // Insert subdomain mapping if provided
        if (creator.subdomain) {
          const { error: subdomainError } = await supabase
            .from('subdomain_mappings')
            .insert({
              subdomain: creator.subdomain,
              show_tag_id: newTag.id
            })

          if (subdomainError) {
            // Don't fail the entire creator, just log the error
            result.errors.push({
              row: format === 'csv' ? i + 2 : i + 1,
              tag: creator.tag,
              error: `Failed to create subdomain: ${subdomainError.message}`,
              severity: 'warning'
            })
          }
        }

        // Insert RSS feeds
        if (creator.rss_feeds.length > 0) {
          const feedsToInsert = creator.rss_feeds.map(url => ({
            show_tag_id: newTag.id,
            rss_url: url,
            title: creator.name
          }))

          const { error: feedsError } = await supabase
            .from('show_rss_feeds')
            .insert(feedsToInsert)

          if (feedsError) {
            result.errors.push({
              row: format === 'csv' ? i + 2 : i + 1,
              tag: creator.tag,
              error: `Failed to create RSS feeds: ${feedsError.message}`,
              severity: 'warning'
            })
          }
        }

        // Insert community links
        if (creator.community_links.length > 0) {
          const linksToInsert = creator.community_links.map(link => ({
            show_tag_id: newTag.id,
            platform: link.platform,
            name: link.name,
            url: link.url,
            description: link.description || null,
            is_discord: link.platform.toLowerCase() === 'discord'
          }))

          const { error: linksError } = await supabase
            .from('show_community_links')
            .insert(linksToInsert)

          if (linksError) {
            result.errors.push({
              row: format === 'csv' ? i + 2 : i + 1,
              tag: creator.tag,
              error: `Failed to create community links: ${linksError.message}`,
              severity: 'warning'
            })
          }
        }

        result.created++
      } catch (error) {
        result.errors.push({
          row: format === 'csv' ? i + 2 : i + 1,
          tag: creator.tag,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          severity: 'error'
        })
      }
    }

    // Set overall success based on whether any creators were created
    result.success = result.created > 0

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
