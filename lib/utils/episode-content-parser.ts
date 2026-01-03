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

// Pre-compile entity patterns at module level for better performance
const HTML_ENTITY_PATTERNS = [
  { pattern: /&amp;/gi, replacement: '&' },
  { pattern: /&lt;/gi, replacement: '<' },
  { pattern: /&gt;/gi, replacement: '>' },
  { pattern: /&quot;/gi, replacement: '"' },
  { pattern: /&#39;/gi, replacement: "'" },
  { pattern: /&nbsp;/gi, replacement: ' ' }
]

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
    const matches: Array<{ type: 'timestamp' | 'link' | 'hashtag', index: number, length: number, content: string, href?: string, timestamp?: string }> = []
    
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
    urlPattern.lastIndex = 0 // Reset regex
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
    hashtagPattern.lastIndex = 0 // Reset regex
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
        timestamp: m.timestamp
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
 * This function is used to clean RSS content before parsing for timestamps/links.
 * The output is always rendered as text in React components, not as HTML.
 */
export function stripHtml(html: string): string {
  // First, decode HTML entities before removing tags to preserve text content
  let text = html
  
  // Decode common HTML entities using pre-compiled patterns
  for (const { pattern, replacement } of HTML_ENTITY_PATTERNS) {
    text = text.replace(pattern, replacement)
  }
  
  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  
  // Convert common block-level tags to newlines before removing all tags
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<p[^>]*>/gi, '')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<div[^>]*>/gi, '')
  
  // Remove all HTML tags (this removes any potentially malicious tags)
  // Using a more defensive approach: remove tags in multiple passes to handle nested/malformed HTML
  let prevText = ''
  let iterations = 0
  const maxIterations = 10 // Prevent infinite loops
  
  while (text !== prevText && iterations < maxIterations) {
    prevText = text
    text = text.replace(/<[^>]*>/g, '')
    iterations++
  }
  
  // Remove any remaining angle brackets that might be left over
  text = text.replace(/[<>]/g, '')
  
  return text.trim()
}
