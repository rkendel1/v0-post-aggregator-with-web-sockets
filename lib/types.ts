export interface ShowTag {
  id: string
  tag: string
  name: string
  created_at: string
  category?: string | null
}

export interface Source {
  id: string
  name: string
  icon: string | null
  created_at: string
}

export interface Post {
  id: string
  content: string
  author_name: string
  author_avatar: string | null
  show_tag_id: string
  source_id: string | null
  likes_count: number
  created_at: string
  user_id: string | null
  image_url?: string | null
  external_url?: string | null
  audio_url?: string | null
  show_tags?: ShowTag
  sources?: Source
  comment_counts?: CommentCount
}

export interface UserSubscription {
  id: string
  user_id: string
  show_tag_id: string
  created_at: string
}

export interface TagFollow {
  id: string
  user_id: string
  show_tag_id: string
  created_at: string
  show_tags?: ShowTag
}

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

export interface Platform {
  id: string
  name: string
  display_name: string
  icon: string | null
  supports_read: boolean
  supports_write: boolean
  created_at: string
}

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

export interface Comment {
  id: string
  post_id: string
  parent_comment_id: string | null
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user_profiles?: UserProfile
  replies?: Comment[]
  reaction_counts?: ReactionCount[]
}

export interface CommentCount {
  post_id: string
  count: number
}

export interface ReactionType {
  id: string
  name: string
  emoji: string
  display_order: number
  created_at: string
}

export interface Reaction {
  id: string
  user_id: string
  post_id: string | null
  comment_id: string | null
  reaction_type_id: string
  created_at: string
  reaction_types?: ReactionType
}

export interface ReactionCount {
  id: string
  post_id: string | null
  comment_id: string | null
  reaction_type_id: string
  count: number
  reaction_types?: ReactionType
}

export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface SavedPost {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface UserFollowCount {
  user_id: string
  followers_count: number
  following_count: number
}

export interface FederatedPost {
  id: string
  local_post_id: string
  connected_account_id: string
  external_post_id: string | null
  external_url: string | null
  status: "pending" | "published" | "failed"
  error_message: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  connected_accounts?: ConnectedAccount
}

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

export interface UserRssFeed {
  id: string
  user_id: string
  rss_url: string
  title: string
  last_fetched_at: string | null
  created_at: string
}