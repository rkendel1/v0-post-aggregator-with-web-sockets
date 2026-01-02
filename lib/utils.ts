import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Post, UserProfile } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the navigation path for a post based on its type
 * @param post - The post object containing navigation information
 * @returns The navigation path or null if not navigable
 */
export function getPostNavigationPath(post: Post): string | null {
  // User-generated posts: navigate to user profile
  if (!post.external_guid && post.user_profiles?.username) {
    return `/${post.user_profiles.username}`
  }
  // Official/external posts: navigate to show tag page
  if (post.external_guid && post.show_tags?.tag) {
    return `/show/${post.show_tags.tag}`
  }
  return null
}

/**
 * Gets the navigation path for a user profile
 * @param userProfile - The user profile object
 * @returns The navigation path or null if not navigable
 */
export function getUserProfileNavigationPath(userProfile?: UserProfile | null): string | null {
  if (userProfile?.username) {
    return `/${userProfile.username}`
  }
  return null
}
