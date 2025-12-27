"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, TagFollow, UserRssFeed } from "@/lib/types"
import { useUser } from "@/contexts/user-context"

interface FeedManager {
  feedTags: ShowTag[]
  rssFeeds: UserRssFeed[]
  allAvailableTags: ShowTag[]
  isLoading: boolean
  addTagToFeed: (tagId: string) => Promise<void>
  removeTagFromFeed: (tagId: string) => Promise<void>
  addNewAvailableTag: (tag: ShowTag) => void
}

type TagFollowWithTag = TagFollow & { show_tags: ShowTag | null }

export function useFeedManager(initialShowTags: ShowTag[]): FeedManager {
  const [supabase] = useState(() => createClient())
  const { user, isLoading: isUserLoading } = useUser()
  const [feedTags, setFeedTags] = useState<ShowTag[]>([])
  const [rssFeeds, setRssFeeds] = useState<UserRssFeed[]>([])
  const [allAvailableTags, setAllAvailableTags] = useState<ShowTag[]>(initialShowTags)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadFeedData = async () => {
      if (isUserLoading) return
      setIsLoading(true)

      if (user) {
        const [followsResult, rssFeedsResult] = await Promise.all([
          supabase.from("tag_follows").select(`*, show_tags (*)`).eq("user_id", user.id),
          supabase.from("user_rss_feeds").select("*").eq("user_id", user.id).order("title"),
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
      } else {
        setFeedTags([])
        setRssFeeds([])
      }
      setIsLoading(false)
    }

    loadFeedData()
  }, [user, isUserLoading, supabase])

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
    feedTags,
    rssFeeds,
    allAvailableTags,
    isLoading,
    addTagToFeed,
    removeTagFromFeed,
    addNewAvailableTag,
  }
}