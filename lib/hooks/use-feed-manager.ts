"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, UserProfile, TagFollow } from "@/lib/types"
import { User } from "@supabase/supabase-js"

const ANON_FEED_KEY = 'anon_feed_tags'

interface FeedManager {
  user: User | null
  profile: UserProfile | null
  feedTags: ShowTag[]
  allAvailableTags: ShowTag[]
  isLoading: boolean
  isAnonymous: boolean
  isProfileSetupNeeded: boolean
  addTagToFeed: (tagId: string) => Promise<void>
  removeTagFromFeed: (tagId: string) => Promise<void>
  migrateAnonymousFeed: () => Promise<void>
  addNewAvailableTag: (tag: ShowTag) => void
  reloadProfile: () => Promise<void>
}

// Helper type guard for nested data structure
type TagFollowWithTag = TagFollow & { show_tags: ShowTag | null }

export function useFeedManager(initialShowTags: ShowTag[]): FeedManager {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [feedTags, setFeedTags] = useState<ShowTag[]>([])
  const [allAvailableTags, setAllAvailableTags] = useState<ShowTag[]>(initialShowTags)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileSetupNeeded, setIsProfileSetupNeeded] = useState(false)

  const isAnonymous = user === null

  const loadFeed = useCallback(async (currentUser: User | null) => {
    setIsLoading(true)
    setIsProfileSetupNeeded(false) // Reset on each load
    
    if (currentUser) {
      // Authenticated: Load server-side follows
      const { data: follows, error: followError } = await supabase
        .from("tag_follows")
        .select(`*, show_tags (*)`)
        .eq("user_id", currentUser.id)
      
      if (followError) {
        console.error("Error fetching authenticated feed:", followError)
        setFeedTags([])
      } else if (follows) {
        const tags = (follows as TagFollowWithTag[])
          .map(f => f.show_tags)
          .filter((t): t is ShowTag => !!t)
        setFeedTags(tags)
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()
      
      setProfile(profileData as UserProfile || null)

      // Check if profile setup is needed
      if (profileData && !profileData.username) {
        setIsProfileSetupNeeded(true)
      }

    } else {
      // Anonymous: Load local storage feed
      const localTagIds = JSON.parse(localStorage.getItem(ANON_FEED_KEY) || '[]') as string[]
      const tags = allAvailableTags.filter(tag => localTagIds.includes(tag.id))
      setFeedTags(tags)
    }
    setIsLoading(false)
  }, [supabase, allAvailableTags])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      loadFeed(currentUser)
    })

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser)
      loadFeed(currentUser)
    })

    return () => subscription.unsubscribe()
  }, [supabase, loadFeed])

  const reloadProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      await loadFeed(currentUser)
    }
  }, [supabase, loadFeed])

  const updateLocalFeed = (newTagIds: string[]) => {
    localStorage.setItem(ANON_FEED_KEY, JSON.stringify(newTagIds))
    const newTags = allAvailableTags.filter(tag => newTagIds.includes(tag.id))
    setFeedTags(newTags)
  }

  const addNewAvailableTag = useCallback((tag: ShowTag) => {
    setAllAvailableTags(current => {
      if (!current.some(t => t.id === tag.id)) {
        return [...current, tag]
      }
      return current
    })
  }, [])

  const addTagToFeed = async (tagId: string) => {
    const tagToAdd = allAvailableTags.find(t => t.id === tagId)
    if (!tagToAdd) return

    if (isAnonymous) {
      const currentIds = JSON.parse(localStorage.getItem(ANON_FEED_KEY) || '[]') as string[]
      if (!currentIds.includes(tagId)) {
        updateLocalFeed([...currentIds, tagId])
      }
    } else if (user) {
      const { error } = await (supabase.from("tag_follows").insert({
        user_id: user.id,
        show_tag_id: tagId,
      }) as any).onConflict('user_id, show_tag_id').ignore()
      
      if (!error) {
        setFeedTags(current => {
          if (!current.some(t => t.id === tagId)) {
            return [...current, tagToAdd]
          }
          return current
        })
      }
    }
  }

  const removeTagFromFeed = async (tagId: string) => {
    if (isAnonymous) {
      const currentIds = JSON.parse(localStorage.getItem(ANON_FEED_KEY) || '[]') as string[]
      updateLocalFeed(currentIds.filter(id => id !== tagId))
    } else if (user) {
      const { error } = await supabase
        .from("tag_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("show_tag_id", tagId)
      
      if (!error) {
        setFeedTags(current => current.filter(tag => tag.id !== tagId))
      }
    }
  }

  const migrateAnonymousFeed = async () => {
    if (!user) return

    const localTagIds = JSON.parse(localStorage.getItem(ANON_FEED_KEY) || '[]') as string[]
    if (localTagIds.length === 0) return

    const followsToInsert = localTagIds.map(tagId => ({
      user_id: user.id,
      show_tag_id: tagId,
    }))

    const { error } = await (supabase.from("tag_follows").insert(followsToInsert) as any).onConflict('user_id, show_tag_id').ignore()

    if (!error) {
      localStorage.removeItem(ANON_FEED_KEY)
      await loadFeed(user)
    } else {
      console.error("Migration failed:", error)
    }
  }

  return {
    user,
    profile,
    feedTags,
    allAvailableTags,
    isLoading,
    isAnonymous,
    isProfileSetupNeeded,
    addTagToFeed,
    removeTagFromFeed,
    migrateAnonymousFeed,
    addNewAvailableTag,
    reloadProfile,
  }
}