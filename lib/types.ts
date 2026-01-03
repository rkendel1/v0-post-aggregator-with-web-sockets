/**
 * TypeScript Type Definitions for PodBridge
 * 
 * This file contains all TypeScript interfaces for the PodBridge application.
 * These types correspond to database tables and are used throughout the app.
 * 
 * Note: Database table names may differ from interface names (e.g., cash_tags vs ShowTag)
 * See ARCHITECTURE.md for complete database schema documentation.
 */

/**
 * Community links for show tags (Discord, Telegram, etc.)
 * Corresponds to: show_community_links table
 */
export interface ShowCommunityLink {
  id: string
  show_tag_id: string
  platform: string                  // e.g., 'discord', 'telegram'
  name: string                      // Display name for the link
  description: string | null        // Optional description
  url: string                       // Full URL to community
  created_at: string
  is_discord?: boolean              // Quick filter for Discord links
  discord_server_id?: string | null // Server ID extracted from URL
}

/**
 * Show tags - central organizing concept in PodBridge
 * Represents a podcast, creator, or topic (e.g., #JoeRogan, #HubermanLab)
 * Corresponds to: cash_tags table (note naming mismatch)
 */
export interface ShowTag {
  id: string
  tag: string                       // Slug format (e.g., 'joe-rogan')
  name: string                      // Display name (e.g., 'The Joe Rogan Experience')
  created_at: string
  category?: string | null          // Optional categorization
  claimed_by_user_id?: string | null // User who claimed ownership
  parent_tag_id?: string | null     // For alias tags
  user_rss_feeds?: { rss_url: string }[] | null // Associated RSS feeds
  subdomain_mappings?: { subdomain: string }[] | null // Custom subdomains
  show_community_links?: ShowCommunityLink[] // Discord, etc.
}

/**
 * Content sources (Twitter, Reddit, RSS, etc.)
 * Corresponds to: sources table
 */
export interface Source {
  id: string
  name: string                      // e.g., 'Twitter', 'Reddit', 'RSS'
  icon: string | null               // URL or emoji
  created_at: string
}

/**
 * Posts - core content type (user posts and podcast episodes)
 * Corresponds to: posts table
 */
export interface Post {
  id: string
  content: string                   // Post text/episode description
  author_name: string
  author_avatar: string | null
  show_tag_id: string               // Associated show tag
  source_id: string | null          // Where post originated
  likes_count: number
  created_at: string
  user_id: string | null            // Author (if authenticated user)
  external_guid?: string | null     // For RSS feed items
  image_url?: string | null
  external_url?: string | null      // Link to original post
  audio_url?: string | null         // For podcast episodes
  episode_slug?: string | null      // Auto-generated slug (YYYY-MM-DD-title)
  show_tags?: ShowTag               // Joined show tag data
  sources?: Source                  // Joined source data
  comment_counts?: CommentCount     // Aggregated comment count
  reaction_counts?: ReactionCount[] // Aggregated reactions
  user_profiles?: UserProfile       // Joined author profile
}

/**
 * User subscriptions to show tags (deprecated in favor of tag_follows)
 * Corresponds to: user_subscriptions table
 */
export interface UserSubscription {
  id: string
  user_id: string
  show_tag_id: string
  created_at: string
}

/**
 * Tag follows - users following show tags
 * Corresponds to: tag_follows table
 */
export interface TagFollow {
  id: string
  user_id: string
  show_tag_id: string
  created_at: string
  show_tags?: ShowTag
}

/**
 * User profiles - extended user information
 * Corresponds to: user_profiles table
 */
export interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
  user_follow_counts?: UserFollowCount
}

/**
 * External platforms (Twitter, Reddit, etc.)
 * Corresponds to: platforms table
 */
export interface Platform {
  id: string
  name: string
  display_name: string
  icon: string | null
  supports_read: boolean
  supports_write: boolean
  created_at: string
}

/**
 * Connected accounts - user's OAuth connections to external platforms
 * Corresponds to: connected_accounts table
 * Note: OAuth implementation is not yet complete
 */
export interface ConnectedAccount {
  id: string
  user_id: string
  platform_id: string
  platform_user_id: string
  platform_username: string | null
  is_active: boolean
  last_synced_at: string | null
  created_at: string
  updated_at: string
  platforms?: Platform
}

/**
 * Comments - threaded comment system
 * Corresponds to: comments table
 */
export interface Comment {
  id: string
  post_id: string
  parent_comment_id: string | null  // For threaded replies
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user_profiles?: UserProfile       // Joined author data
  replies?: Comment[]               // Nested replies
  reaction_counts?: ReactionCount[] // Aggregated reactions
}

/**
 * Comment count aggregation
 * Corresponds to: comment_counts view
 */
export interface CommentCount {
  post_id: string
  count: number
}

/**
 * Reaction types (Like, Love, Laugh, etc.)
 * Corresponds to: reaction_types table
 */
export interface ReactionType {
  id: string
  name: string
  emoji: string
  display_order: number
  created_at: string
}

/**
 * User reactions on posts and comments
 * Corresponds to: reactions table
 */
export interface Reaction {
  id: string
  user_id: string
  post_id: string | null            // Either post_id OR comment_id is set
  comment_id: string | null
  reaction_type_id: string
  created_at: string
  reaction_types?: ReactionType     // Joined reaction type data
}

/**
 * Reaction count aggregation
 * Corresponds to: reaction_counts view
 */
export interface ReactionCount {
  id: string
  post_id: string | null
  comment_id: string | null
  reaction_type_id: string
  count: number
  reaction_types?: ReactionType
}

/**
 * User follows - users following other users
 * Corresponds to: user_follows table
 */
export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

/**
 * Saved posts and playback queue
 * Corresponds to: saved_posts table
 */
export interface SavedPost {
  id: string
  user_id: string
  post_id: string
  queue_position?: number | null    // Set for queued items, null otherwise
  created_at: string
}

/**
 * User follow count aggregation
 * Corresponds to: user_follow_counts view
 */
export interface UserFollowCount {
  user_id: string
  followers_count: number
  following_count: number
}

/**
 * Federated posts - outbound posts to external platforms
 * Corresponds to: federated_posts table
 * Note: Actual federation not yet implemented
 */
export interface FederatedPost {
  id: string
  local_post_id: string             // Reference to posts table
  connected_account_id: string
  external_post_id: string | null   // ID on external platform
  external_url: string | null       // Link to external post
  status: "pending" | "published" | "failed"
  error_message: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  connected_accounts?: ConnectedAccount
}

/**
 * Aggregated posts - inbound posts from external platforms
 * Corresponds to: aggregated_posts table
 * Note: Automated aggregation not yet implemented
 */
export interface AggregatedPost {
  id: string
  local_post_id: string | null
  connected_account_id: string
  external_post_id: string
  external_url: string | null
  author_name: string
  author_avatar: string | null
  content: string
  external_created_at: string | null
  synced_at: string
  created_at: string
  connected_accounts?: ConnectedAccount
}

/**
 * User RSS feeds - user-submitted RSS feeds for aggregation
 * Corresponds to: user_rss_feeds table
 */
export interface UserRssFeed {
  id: string
  user_id: string
  rss_url: string
  title: string
  last_fetched_at: string | null
  created_at: string
  show_tag_id?: string | null
}