/**
 * Slug generation utilities for Podbridge
 * Implements the naming convention for Discord integration and episode organization
 */

/**
 * Generate a kebab-case slug from a string
 * @param text - The text to convert to a slug
 * @returns A lowercase, hyphen-separated slug
 */
export function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate a show-level slug from a show name
 * @param showName - The name of the show
 * @returns A clean, kebab-case slug for the show
 * @example generateShowSlug("The Joe Rogan Experience") => "joe-rogan-experience"
 */
export function generateShowSlug(showName: string): string {
  // Remove common podcast terms
  const cleaned = showName
    .replace(/\b(podcast|show|the)\b/gi, '')
    .trim()
  
  return toKebabCase(cleaned)
}

/**
 * Extract a short descriptive slug from episode title
 * Takes the first 4-8 meaningful words from the title
 * @param title - The episode title
 * @param maxWords - Maximum number of words to include (default: 6)
 * @returns A shortened slug for the episode
 */
export function extractEpisodeTitleSlug(title: string, maxWords = 6): string {
  // Remove hashtags and episode numbers
  const cleaned = title
    .replace(/#\w+/g, '') // Remove hashtags
    .replace(/episode\s*#?\d+/gi, '') // Remove episode numbers
    .replace(/ep\.?\s*\d+/gi, '') // Remove ep. numbers
    .trim()
  
  // Split into words and take first N meaningful words
  const words = cleaned
    .split(/\s+/)
    .filter(word => word.length > 2) // Filter out very short words
    .slice(0, maxWords)
  
  const slug = toKebabCase(words.join(' '))
  
  // Ensure it's not too long (Discord channel name limit is ~100 chars)
  return slug.length > 60 ? slug.substring(0, 60).replace(/-+$/, '') : slug
}

/**
 * Generate an episode-level slug with date prefix
 * Format: YYYY-MM-DD-episode-slug
 * @param episodeDate - The date the episode was published
 * @param episodeTitle - The title of the episode
 * @returns A date-prefixed episode slug
 * @example generateEpisodeSlug(new Date('2025-12-22'), 'Transform Pain & Trauma Into Creative Expression')
 *          => "2025-12-22-transform-pain-trauma-creative"
 */
export function generateEpisodeSlug(episodeDate: Date | string, episodeTitle: string): string {
  const date = typeof episodeDate === 'string' ? new Date(episodeDate) : episodeDate
  
  // Format date as YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const datePrefix = `${year}-${month}-${day}`
  
  // Generate title slug
  const titleSlug = extractEpisodeTitleSlug(episodeTitle)
  
  return `${datePrefix}-${titleSlug}`
}

/**
 * Generate a Discord thread/channel name for an episode
 * Format: YYYY-MM-DD - Episode Title (truncated)
 * @param episodeDate - The date the episode was published
 * @param episodeTitle - The title of the episode
 * @returns A Discord-friendly thread name
 */
export function generateDiscordThreadName(episodeDate: Date | string, episodeTitle: string): string {
  const date = typeof episodeDate === 'string' ? new Date(episodeDate) : episodeDate
  
  // Format date as YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const datePrefix = `${year}-${month}-${day}`
  
  // Clean up the title (remove hashtags, etc.)
  const cleanTitle = episodeTitle
    .replace(/#\w+/g, '')
    .replace(/episode\s*#?\d+/gi, '')
    .trim()
  
  // Truncate if too long (Discord has ~100 char limit for thread names)
  const maxTitleLength = 80
  const truncatedTitle = cleanTitle.length > maxTitleLength 
    ? cleanTitle.substring(0, maxTitleLength) + '...'
    : cleanTitle
  
  return `${datePrefix} - ${truncatedTitle}`
}

/**
 * Generate a Discord channel URL for an episode discussion
 * @param serverUrl - The base Discord server URL
 * @param episodeSlug - The episode slug
 * @returns A Discord channel/thread URL
 */
export function generateDiscordEpisodeUrl(serverUrl: string, episodeSlug: string): string {
  // If the server URL already contains a channel/thread ID, append the slug as a query param for reference
  // Otherwise, assume it's a server invite and just return it
  // This is a placeholder - actual implementation would depend on Discord server structure
  return `${serverUrl}?episode=${episodeSlug}`
}
