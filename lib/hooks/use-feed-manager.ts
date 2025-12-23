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

// Helper type guard for nested data structure
type TagFollowWithTag = TagFollow & { show_tags: ShowTag | null }

export function useFeedManager(initialShowTags: ShowTag[]): FeedManager {
  const supabase = createClient()
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
        // Authenticated (guest or full user): Load server-side data
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          // Ignore "not found" error
          console.error("Error fetching profile:", profileError)
        } else {
          setProfile((profileData as UserProfile) || null)
        }

        if (profileData) {
          // User has a profile, load their follows and RSS feeds
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
          }

          if (rssFeedsResult.error) {
            console.error("Error fetching RSS feeds:", rssFeedsResult.error)
            setRssFeeds([])
          } else {
            setRssFeeds(rssFeedsResult.data || [])
          }

          // Check if a full user needs to complete their profile (e.g., after social login)
          if (!currentUser.is_anonymous && !profileData.username) {
            setIsProfileSetupNeeded(true)
          }
        } else {
          // User exists in auth but has no profile yet. This can happen during signup.
          // If they are a full user, they need to set up their profile.
          if (!currentUser.is_anonymous) {
            setIsProfileSetupNeeded(true)
          }
        }
      } else {
        // No user session at all. The app will show a generic feed.
        setProfile(null)
        setFeedTags([])
        setRssFeeds([])
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
      loadDataForUser(currentUser)
    })

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser)
      loadDataForUser(currentUser)
    })

    return () => subscription.unsubscribe()
  }, [supabase, loadDataForUser])

  // Realtime subscription for RSS feeds
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`user_rss_feeds:${user.id}`)
      .on<UserRssFeed>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_rss_feeds",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Refetch all feeds on any change
          const { data: updatedFeeds } = await supabase
            .from("user_rss_feeds")
            .select("*")
            .eq("user_id", user.id)
            .order("title")
          setRssFeeds(updatedFeeds || [])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const reloadProfile = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    await loadDataForUser(currentUser)
  }, [supabase, loadDataForUser])

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