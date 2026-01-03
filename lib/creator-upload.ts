/**
 * Creator Upload Format Utilities
 * 
 * This module handles bulk upload of creator show data via CSV/JSON
 * allowing quick onboarding of creators with all metadata.
 */

export interface CreatorUploadData {
  // Basic Info (required)
  tag: string                          // Slug (e.g., 'joe-rogan-experience')
  name: string                         // Display name (e.g., 'The Joe Rogan Experience')
  
  // Optional metadata
  category?: string                    // Category (e.g., 'Comedy', 'Technology')
  subdomain?: string                   // Custom subdomain (e.g., 'joerogan')
  
  // RSS Feeds (pipe-separated for CSV)
  rss_feeds?: string                   // e.g., 'https://feed1.com|https://feed2.com'
  
  // Community Links (JSON string or multiple fields)
  discord_name?: string
  discord_url?: string
  discord_description?: string
  
  telegram_name?: string
  telegram_url?: string
  telegram_description?: string
  
  // Additional community links (JSON array string)
  additional_links?: string            // JSON array: [{"platform":"..","name":"..","url":"..","description":".."}]
}

export interface ParsedCreatorData {
  tag: string
  name: string
  category?: string
  subdomain?: string
  rss_feeds: string[]
  community_links: Array<{
    platform: string
    name: string
    url: string
    description?: string
  }>
}

export interface UploadResult {
  success: boolean
  created: number
  errors: Array<{
    row: number
    tag: string
    error: string
  }>
}

/**
 * Parse CSV content into creator data
 */
export function parseCreatorCSV(csvContent: string): ParsedCreatorData[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const results: ParsedCreatorData[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every(v => !v)) continue // Skip empty lines

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })

    results.push(parseCreatorRow(row))
  }

  return results
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)

  return values.map(v => v.replace(/^"|"$/g, ''))
}

/**
 * Parse a row object into structured creator data
 */
function parseCreatorRow(row: CreatorUploadData): ParsedCreatorData {
  const result: ParsedCreatorData = {
    tag: row.tag.toLowerCase().trim(),
    name: row.name.trim(),
    category: row.category?.trim() || undefined,
    subdomain: row.subdomain?.trim() || undefined,
    rss_feeds: [],
    community_links: []
  }

  // Parse RSS feeds (pipe-separated)
  if (row.rss_feeds) {
    result.rss_feeds = row.rss_feeds
      .split('|')
      .map(url => url.trim())
      .filter(url => url.length > 0)
  }

  // Parse Discord link
  if (row.discord_url && row.discord_name) {
    result.community_links.push({
      platform: 'discord',
      name: row.discord_name.trim(),
      url: row.discord_url.trim(),
      description: row.discord_description?.trim()
    })
  }

  // Parse Telegram link
  if (row.telegram_url && row.telegram_name) {
    result.community_links.push({
      platform: 'telegram',
      name: row.telegram_name.trim(),
      url: row.telegram_url.trim(),
      description: row.telegram_description?.trim()
    })
  }

  // Parse additional links from JSON
  if (row.additional_links) {
    try {
      const links = JSON.parse(row.additional_links)
      if (Array.isArray(links)) {
        result.community_links.push(...links)
      }
    } catch (e) {
      // Ignore invalid JSON in additional_links
    }
  }

  return result
}

/**
 * Validate creator data
 */
export function validateCreatorData(data: ParsedCreatorData): string[] {
  const errors: string[] = []

  // Required fields
  if (!data.tag || data.tag.length === 0) {
    errors.push('Tag is required')
  } else if (!/^[a-z0-9-]+$/.test(data.tag)) {
    errors.push('Tag must contain only lowercase letters, numbers, and hyphens')
  }

  if (!data.name || data.name.length === 0) {
    errors.push('Name is required')
  }

  // Validate subdomain if provided
  if (data.subdomain && !/^[a-z0-9-]+$/.test(data.subdomain)) {
    errors.push('Subdomain must contain only lowercase letters, numbers, and hyphens')
  }

  // Validate RSS feeds
  data.rss_feeds.forEach((url, index) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      errors.push(`RSS feed ${index + 1} must be a valid URL`)
    }
  })

  // Validate community links
  data.community_links.forEach((link, index) => {
    if (!link.name) {
      errors.push(`Community link ${index + 1} is missing a name`)
    }
    if (!link.url) {
      errors.push(`Community link ${index + 1} is missing a URL`)
    } else if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
      errors.push(`Community link ${index + 1} must have a valid URL`)
    }
    if (!link.platform) {
      errors.push(`Community link ${index + 1} is missing a platform`)
    }
  })

  return errors
}

/**
 * Generate sample CSV template
 */
export function generateSampleCSV(): string {
  const headers = [
    'tag',
    'name',
    'category',
    'subdomain',
    'rss_feeds',
    'discord_name',
    'discord_url',
    'discord_description',
    'telegram_name',
    'telegram_url',
    'telegram_description',
    'additional_links'
  ]

  const sampleRows = [
    [
      'joe-rogan-experience',
      'The Joe Rogan Experience',
      'Society & Culture',
      'joerogan',
      'https://feeds.megaphone.fm/jre|https://joeroganexp.joerogan.com/feed',
      'JRE Discord',
      'https://discord.gg/joerogan',
      'Official Joe Rogan Discord server',
      '',
      '',
      '',
      '[]'
    ],
    [
      'huberman-lab',
      'Huberman Lab',
      'Science',
      'huberman',
      'https://feeds.megaphone.fm/hubermanlab',
      'Huberman Lab Community',
      'https://discord.gg/hubermanlab',
      'Discuss neuroscience and health',
      'Huberman Lab Chat',
      'https://t.me/hubermanlab',
      'Telegram community',
      '[]'
    ]
  ]

  const csv = [headers.join(',')]
  sampleRows.forEach(row => {
    csv.push(row.map(val => {
      // Quote values that contain commas
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }).join(','))
  })

  return csv.join('\n')
}

/**
 * Parse JSON upload format
 */
export function parseCreatorJSON(jsonContent: string): ParsedCreatorData[] {
  const data = JSON.parse(jsonContent)
  
  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array of creator objects')
  }

  return data.map(item => parseCreatorRow(item))
}

/**
 * Generate sample JSON template
 */
export function generateSampleJSON(): string {
  const sample = [
    {
      tag: 'joe-rogan-experience',
      name: 'The Joe Rogan Experience',
      category: 'Society & Culture',
      subdomain: 'joerogan',
      rss_feeds: 'https://feeds.megaphone.fm/jre|https://joeroganexp.joerogan.com/feed',
      discord_name: 'JRE Discord',
      discord_url: 'https://discord.gg/joerogan',
      discord_description: 'Official Joe Rogan Discord server'
    },
    {
      tag: 'huberman-lab',
      name: 'Huberman Lab',
      category: 'Science',
      subdomain: 'huberman',
      rss_feeds: 'https://feeds.megaphone.fm/hubermanlab',
      discord_name: 'Huberman Lab Community',
      discord_url: 'https://discord.gg/hubermanlab',
      discord_description: 'Discuss neuroscience and health',
      additional_links: JSON.stringify([
        {
          platform: 'twitter',
          name: 'Huberman Lab Twitter',
          url: 'https://twitter.com/hubermanlab',
          description: 'Follow on Twitter'
        }
      ])
    }
  ]

  return JSON.stringify(sample, null, 2)
}
