"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, Post } from "@/lib/types"
import { ShowTagSidebar } from "./show-tag-sidebar"
import { PostFeed } from "./post-feed"
import { PostComposer } from "./post-composer"
import { FeedManagementModal } from "./feed-management-modal"
import { useFeedManager } from "@/lib/hooks/use-feed-manager"
import { Button } from "@/components/ui/button"
import { PlusCircle, Settings, Loader2 } from "lucide-react"
import Link from "next/link"
import { ProfileSetupModal } from "@/components/auth/profile-setup-modal"
import { GuestHandleModal } from "@/components/auth/guest-handle-modal"
import { Toaster } from "react-hot-toast"

interface PostAggregatorProps {
  initialShowTags: ShowTag[]
}

export function PostAggregator({ initialShowTags }: PostAggregatorProps) {
  const {
    profile,
    feedTags,
    allAvailableTags,
    isLoading: isFeedLoading,
    isGuest,
    isProfileSetupNeeded,
    isHandleRequired,
    addTagToFeed,
    removeTagFromFeed,
    addNewAvailableTag,
    reloadProfile,
  } = useFeedManager(initialShowTags)

  const [selectedTag, setSelectedTag] = useState<ShowTag | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)

  const supabase = createClient()

  // Set initial selected tag when feedTags loads
  useEffect(() => {
    if (!selectedTag && feedTags.length > 0) {
      setSelectedTag(feedTags[0])
    } else if (feedTags.length === 0) {
      setSelectedTag(null)
    }
  }, [feedTags, selectedTag])

  // Fetch posts for selected tag
  useEffect(() => {
    if (!selectedTag) {
      setPosts([])
      setIsLoadingPosts(false)
      return
    }

    const fetchPosts = async () => {
      setIsLoadingPosts(true)
      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          show_tags (*),
          sources (*),
          comment_counts (*)
        `)
        .eq("show_tag_id", selectedTag.id)
        .order("created_at", { ascending: false })

      if (data) {
        setPosts(data as Post[])
      }
      setIsLoadingPosts(false)
    }

    fetchPosts()
  }, [selectedTag, supabase])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!selectedTag) return

    const channel = supabase
      .channel(`posts:show_tag_id=eq.${selectedTag.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `show_tag_id=eq.${selectedTag.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("posts")
            .select(`
              *,
              show_tags (*),
              sources (*),
              comment_counts (*)
            `)
            .eq("id", payload.new.id)
            .single()

          if (data) {
            setPosts((current) => [data as Post, ...current])
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: `show_tag_id=eq.${selectedTag.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("posts")
            .select(`
              *,
              show_tags (*),
              sources (*),
              comment_counts (*)
            `)
            .eq("id", payload.new.id)
            .single()

          if (data) {
            setPosts((current) => current.map((post) => (post.id === payload.new.id ? (data as Post) : post)))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedTag, supabase])

  if (isFeedLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isHandleRequired) {
    return (
      <>
        <GuestHandleModal onSuccess={reloadProfile} />
        <Toaster position="bottom-right" />
      </>
    )
  }

  if (isProfileSetupNeeded) {
    return (
      <>
        <ProfileSetupModal onSave={reloadProfile} />
        <Toaster position="bottom-right" />
      </>
    )
  }

  return (
    <div className="flex h-screen">
      <Toaster position="bottom-right" />
      <ShowTagSidebar
        feedTags={feedTags}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        onOpenManager={() => setIsManagerOpen(true)}
      />

      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedTag ? `#${selectedTag.tag}` : "Select a tag"}
              </h1>
              <p className="text-sm text-muted-foreground">{selectedTag?.name || "Choose a show tag to view posts"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button onClick={() => setIsComposerOpen(true)} size="sm" className="gap-2" disabled={!selectedTag}>
                <PlusCircle className="h-4 w-4" />
                New Post
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {feedTags.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Your feed is empty.</p>
                <Button onClick={() => setIsManagerOpen(true)} size="sm">
                  Add Shows/Tags to Start
                </Button>
              </div>
            </div>
          ) : selectedTag ? (
            <PostFeed posts={posts} isLoading={isLoadingPosts} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a show tag to see posts</p>
            </div>
          )}
        </div>
      </div>

      {isComposerOpen && selectedTag && (
        <PostComposer
          showTag={selectedTag}
          onClose={() => setIsComposerOpen(false)}
          onPostCreated={(newPost) => {
            setPosts((current) => [newPost, ...current])
            setIsComposerOpen(false)
          }}
        />
      )}

      {isManagerOpen && (
        <FeedManagementModal
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
          feedTags={feedTags}
          allAvailableTags={allAvailableTags}
          isAnonymous={isGuest}
          profile={profile}
          addTagToFeed={addTagToFeed}
          removeTagFromFeed={removeTagFromFeed}
          migrateAnonymousFeed={async () => {}} // This is now handled by upgrading the user account
          addNewAvailableTag={addNewAvailableTag}
        />
      )}
    </div>
  )
}