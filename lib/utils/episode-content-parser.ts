/**
 * Utilities for parsing and formatting podcast episode content
 * Handles timestamps, links, and show notes formatting
 */

export interface ParsedContentSegment {
  type: 'text' | 'timestamp' | 'link' | 'hashtag'
  content: string
  href?: string
  timestamp?: string
}

/**
 * Parse episode content to identify timestamps, links, and hashtags
 * Timestamps are in formats like: 00:00, 00:00:00, [00:00], (00:00)
 */
export function parseEpisodeContent(content: string): ParsedContentSegment[] {
  const segments: ParsedContentSegment[] = []
  
  // Regex patterns
  const timestampPattern = /(\[?\(?)(\d{1,2}:\d{2}(?::\d{2})?)\]?\)?/g
  const urlPattern = /(https?:\/\/[^\s]+)/g
  const hashtagPattern = /(#[\w-]+)/g
  
  // Split content into lines for better processing
  const lines = content.split('\n')
  
  for (const line of lines) {
    if (!line.trim()) {
      segments.push({ type: 'text', content: '\n' })
      continue
    }
    
    let lastIndex = 0
    const lineSegments: ParsedContentSegment[] = []
    
    // Find all matches (timestamps, URLs, hashtags) in the line
    const matches: Array<{ type: 'timestamp' | 'link' | 'hashtag', index: number, length: number, content: string, href?: string }> = []
    
    // Find timestamps
    let match
    while ((match = timestampPattern.exec(line)) !== null) {
      matches.push({
        type: 'timestamp',
        index: match.index,
        length: match[0].length,
        content: match[0],
        timestamp: match[2]
      })
    }
    
    // Find URLs
    timestampPattern.lastIndex = 0 // Reset regex
    while ((match = urlPattern.exec(line)) !== null) {
      matches.push({
        type: 'link',
        index: match.index,
        length: match[0].length,
        content: match[0],
        href: match[0]
      })
    }
    
    // Find hashtags
    urlPattern.lastIndex = 0 // Reset regex
    while ((match = hashtagPattern.exec(line)) !== null) {
      matches.push({
        type: 'hashtag',
        index: match.index,
        length: match[0].length,
        content: match[0]
      })
    }
    
    // Sort matches by index
    matches.sort((a, b) => a.index - b.index)
    
    // Build segments
    for (const m of matches) {
      // Add text before this match
      if (m.index > lastIndex) {
        const textContent = line.substring(lastIndex, m.index)
        if (textContent) {
          lineSegments.push({ type: 'text', content: textContent })
        }
      }
      
      // Add the match
      lineSegments.push({
        type: m.type,
        content: m.content,
        href: m.href,
        timestamp: m.type === 'timestamp' ? (m as any).timestamp : undefined
      })
      
      lastIndex = m.index + m.length
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      lineSegments.push({ type: 'text', content: line.substring(lastIndex) })
    }
    
    // Add line segments to main segments
    segments.push(...lineSegments)
    segments.push({ type: 'text', content: '\n' })
  }
  
  return segments
}

/**
 * Strip HTML tags from content (for RSS content that may contain HTML)
 */
export function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '')
  
  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '<br>': '\n',
    '<br/>': '\n',
    '<br />': '\n',
    '</p>': '\n\n',
    '<p>': ''
  }
  
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'gi'), char)
  }
  
  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  
  return text.trim()
}
