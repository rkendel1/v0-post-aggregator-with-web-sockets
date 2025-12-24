"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, UserProfile, TagFollow, UserRssFeed } from "@/lib/types"
import { User } from "@supabase/supabase-js"

interface FeedManager {
  user: User | null
  profile: UserProfile | null
  feedTags: ShowTag[]
  rssFeeds: UserRssFeed[]
  allAvailableTags: ShowTag[]
  isLoading: boolean
  isGuest: boolean
  isProfileSetupNeeded: boolean
  addTagToFeed: (tagId: string) => Promise<void>
  removeTagFromFeed: (tagId: string) => Promise<void>
  addNewAvailableTag: (tag: ShowTag) => void
  reloadProfile: () => Promise<void>
}

const CACHE_KEYS = {
  PROFILE: "podbridge_profile",
  FEED_TAGS: "podbridge_feed_tags",
}

// Helper type guard for nested data structure
type TagFollowWithTag = TagFollow & { show_tags: ShowTag | null }

export function useFeedManager(initialShowTags: ShowTag[]): FeedManager {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [feedTags, setFeedTags] = useState<ShowTag[]>([])
  const [rssFeeds, setRssFeeds] = useState<UserRssFeed[]>([])
  const [allAvailableTags, setAllAvailableTags] = useState<ShowTag[]>(initialShowTags)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileSetupNeeded, setIsProfileSetupNeeded] = useState(false)

  const isGuest = user?.is_anonymous ?? false

  const loadDataForUser = useCallback(
    async (currentUser: User | null) => {
      setIsLoading(true)
      setIsProfileSetupNeeded(false)

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error fetching profile:", profileError)
        } else {
          setProfile((profileData as UserProfile) || null)
          if (profileData) localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify(profileData))
        }

        if (profileData) {
          const [followsResult, rssFeedsResult] = await Promise.all([
            supabase.from("tag_follows").select(`*, show_tags (*)`).eq("user_id", currentUser.id),
            supabase.from("user_rss_feeds").select("*").eq("user_id", currentUser.id).order("title"),
          ])

          if (followsResult.error) {
            console.error("Error fetching feed:", followsResult.error)
            setFeedTags([])
          } else if (followsResult.data) {
            const tags = (followsResult.data as TagFollowWithTag[])
              .map((f) => f.show_tags)
              .filter((t): t is ShowTag => !!t)
            setFeedTags(tags)
            localStorage.setItem(CACHE_KEYS.FEED_TAGS, JSON.stringify(tags))
          }

          if (rssFeedsResult.error) {
            console.error("Error fetching RSS feeds:", rssFeedsResult.error)
            setRssFeeds([])
          } else {
            setRssFeeds(rssFeedsResult.data || [])
          }

          if (!currentUser.is_anonymous && !profileData.username) {
            setIsProfileSetupNeeded(true)
          }
        } else {
          if (!currentUser.is_anonymous) {
            setIsProfileSetupNeeded(true)
          }
        }
      } else {
        setProfile(null)
        setFeedTags([])
        setRssFeeds([])
        localStorage.removeItem(CACHE_KEYS.PROFILE)
        localStorage.removeItem(CACHE_KEYS.FEED_TAGS)
      }
      setIsLoading(false)
    },
    [supabase],
  )

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        // On initial load or sign in, first try to populate from cache for speed
        if (currentUser) {
          try {
            const cachedProfile = localStorage.getItem(CACHE_KEYS.PROFILE)
            const cachedFeedTags = localStorage.getItem(CACHE_KEYS.FEED_TAGS)
            if (cachedProfile) setProfile(JSON.parse(cachedProfile))
            if (cachedFeedTags) setFeedTags(JSON.parse(cachedFeedTags))
          } catch (e) {
            console.error("Failed to parse cache", e)
          }
        }
        // Then, always fetch fresh data from the server
        loadDataForUser(currentUser)
      } else if (event === "SIGNED_OUT") {
        // On sign out, clear everything
        loadDataForUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, loadDataForUser])

  const reloadProfile = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)
  }, [supabase])

  const addNewAvailableTag = useCallback((tag: ShowTag) => {
    setAllAvailableTags((current) => {
      if (!current.some((t) => t.id === tag.id)) {
        return [...current, tag]
      }
      return current
    })
  }, [])

  const addTagToFeed = async (tagId: string) => {
    const tagToAdd = allAvailableTags.find((t) => t.id === tagId)
    if (!tagToAdd || !user) return

    const { error } = await supabase.from("tag_follows").upsert(
      {
        user_id: user.id,
        show_tag_id: tagId,
      },
      {
        onConflict: "user_id,show_tag_id",
        ignoreDuplicates: true,
      },
    )

    if (!error) {
      setFeedTags((current) => {
        if (!current.some((t) => t.id === tagId)) {
          return [...current, tagToAdd]
        }
        return current
      })
    }
  }

  const removeTagFromFeed = async (tagId: string) => {
    if (!user) return

    const { error } = await supabase.from("tag_follows").delete().eq("user_id", user.id).eq("show_tag_id", tagId)

    if (!error) {
      setFeedTags((current) => current.filter((tag) => tag.id !== tagId))
    }
  }

  return {
    user,
    profile,
    feedTags,
    rssFeeds,
    allAvailableTags,
    isLoading,
    isGuest,
    isProfileSetupNeeded,
    addTagToFeed,
    removeTagFromFeed,
    addNewAvailableTag,
    reloadProfile,
  }
}