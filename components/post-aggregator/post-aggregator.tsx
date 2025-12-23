"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Toaster, toast } from "react-hot-toast"
import { RssImportModal } from "@/components/settings/rss-import-modal"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PostAggregatorProps {
  initialShowTags: ShowTag[]
}

export function PostAggregator({ initialShowTags }: PostAggregatorProps) {
  const {
    user,
    profile,
    feedTags,
    rssFeeds,
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

  const [activeFeed, setActiveFeed] = useState<"following" | "for-you">("following")
  const [selectedFeedId, setSelectedFeedId] = useState<string | "all" | null>("all")
  const [posts, setPosts] = useState<Post[]>([])
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [isRssModalOpen, setIsRssModalOpen] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)

  const supabase = createClient()

  const feedTagIds = useMemo(() => feedTags.map((t) => t.id).join(","), [feedTags])

  // Fetch posts
  useEffect(() => {
    // Wait for the user's followed tags to load first
    if (isFeedLoading) return

    // Handle the "For You" feed separately
    if (activeFeed === "for-you") {
      setPosts([])
      setIsLoadingPosts(false)
      return
    }

    // If no feed is selected in the "Following" tab, do nothing
    if (!selectedFeedId) {
      setPosts([])
      setIsLoadingPosts(false)
      return
    }

    const fetchPosts = async () => {
      setIsLoadingPosts(true)

      let hiddenPostIds: string[] = []
      if (user) {
        const { data: hiddenPosts } = await supabase.from("hidden_posts").select("post_id").eq("user_id", user.id)
        if (hiddenPosts) {
          hiddenPostIds = hiddenPosts.map((p) => p.post_id)
        }
      }

      const query = supabase
        .from("posts")
        .select(
          `
          *,
          show_tags (*),
          sources (*),
          comment_counts (*)
        `,
        )
        .order("created_at", { ascending: false })

      if (selectedFeedId === "all") {
        const tagIds = feedTagIds ? feedTagIds.split(",") : []
        if (tagIds.length > 0) {
          query.in("show_tag_id", tagIds)
        } else {
          // No tags followed, so no posts to show
          setPosts([])
          setIsLoadingPosts(false)
          return
        }
      } else {
        query.eq("show_tag_id", selectedFeedId)
      }

      if (hiddenPostIds.length > 0) {
        query.not("id", "in", `(${hiddenPostIds.join(",")})`)
      }

      const { data } = await query

      if (data) {
        setPosts(data as Post[])
      }
      setIsLoadingPosts(false)
    }

    fetchPosts()
  }, [activeFeed, selectedFeedId, feedTagIds, supabase, user, isFeedLoading])

  // Subscribe to real-time updates
  useEffect(() => {
    if (activeFeed === "following" && !selectedFeedId) return

    const tagIds = feedTagIds ? feedTagIds.split(",") : []
    if (activeFeed === "following" && selectedFeedId === "all" && tagIds.length === 0) {
      return
    }

    const channelName = `posts:${activeFeed}:${selectedFeedId || "all"}`
    let filter: string | undefined = undefined

    if (activeFeed === "following") {
      filter =
        selectedFeedId === "all" ? `show_tag_id=in.(${tagIds.join(",")})` : `show_tag_id=eq.${selectedFeedId}`
    }

    const handleInsert = async (payload: any) => {
      const { data } = await supabase
        .from("posts")
        .select(
          `
          *,
          show_tags (*),
          sources (*),
          comment_counts (*)
        `,
        )
        .eq("id", payload.new.id)
        .single()

      if (data) {
        setPosts((current) => {
          if (current.some((p) => p.id === (data as Post).id)) {
            return current
          }
          return [data as Post, ...current]
        })
      }
    }

    const handleUpdate = async (payload: any) => {
      const { data } = await supabase
        .from("posts")
        .select(
          `
          *,
          show_tags (*),
          sources (*),
          comment_counts (*)
        `,
        )
        .eq("id", payload.new.id)
        .single()

      if (data) {
        setPosts((current) => current.map((post) => (post.id === payload.new.id ? (data as Post) : post)))
      }
    }

    const handleDelete = (payload: any) => {
      setPosts((current) => current.filter((post) => post.id !== payload.old.id))
    }

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter }, handleInsert)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter }, handleUpdate)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts", filter }, handleDelete)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeFeed, selectedFeedId, feedTagIds, supabase])

  const handlePostDeleted = (postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId))
  }

  const handlePostHidden = async (postId: string) => {
    if (!user) return
    setPosts((current) => current.filter((post) => post.id !== postId))
    toast.success("Post hidden.")
    await supabase.from("hidden_posts").insert({ user_id: user.id, post_id: postId })
  }

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

  const selectedTag =
    selectedFeedId !== "all" && selectedFeedId !== null ? feedTags.find((t) => t.id === selectedFeedId) : null

  return (
    <div className="flex h-screen">
      <Toaster position="bottom-right" />
      <ShowTagSidebar
        feedTags={feedTags}
        selectedFeedId={selectedFeedId}
        onSelectFeed={(id) => {
          setActiveFeed("following")
          setSelectedFeedId(id)
        }}
        onOpenManager={() => setIsManagerOpen(true)}
        onOpenRssImporter={() => setIsRssModalOpen(true)}
      />

      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {activeFeed === "following"
                  ? selectedFeedId === "all"
                    ? "All Feeds"
                    : selectedTag
                    ? `#${selectedTag.tag}`
                    : "Select a tag"
                  : "For You"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeFeed === "following"
                  ? selectedFeedId === "all"
                    ? `Posts from ${feedTags.length} followed tags`
                    : selectedTag?.name || "Choose a show tag to view posts"
                  : "A curated feed of posts from across the platform"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button
                onClick={() => setIsComposerOpen(true)}
                size="sm"
                className="gap-2"
                disabled={activeFeed === "for-you" || (activeFeed === "following" && !selectedTag)}
              >
                <PlusCircle className="h-4 w-4" />
                New Post
              </Button>
            </div>
          </div>
          <Tabs
            value={activeFeed}
            onValueChange={(value) => setActiveFeed(value as "following" | "for-you")}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2">
              <TabsTrigger value="following">Following</TabsTrigger>
              <TabsTrigger value="for-you">For You</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <div className="flex-1 overflow-hidden">
          {activeFeed === "for-you" ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold">Coming Soon!</h2>
                <p className="text-muted-foreground mt-2">A curated feed of posts is on its way.</p>
              </div>
            </div>
          ) : feedTags.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Your feed is empty.</p>
                <Button onClick={() => setIsManagerOpen(true)} size="sm">
                  Add Shows/Tags to Start
                </Button>
              </div>
            </div>
          ) : selectedFeedId ? (
            <PostFeed
              posts={posts}
              isLoading={isLoadingPosts}
              currentUser={user}
              onPostDeleted={handlePostDeleted}
              onPostHidden={handlePostHidden}
            />
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
          profile={profile}
          onClose={() => setIsComposerOpen(false)}
          onPostCreated={(newPost) => {
            if (selectedFeedId === "all" || selectedFeedId === newPost.show_tag_id) {
              setPosts((current) => [newPost, ...current])
            }
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
          migrateAnonymousFeed={async () => {}}
          addNewAvailableTag={addNewAvailableTag}
        />
      )}

      {isRssModalOpen && (
        <RssImportModal
          isOpen={isRssModalOpen}
          onClose={() => setIsRssModalOpen(false)}
          initialRssFeeds={rssFeeds}
          onImportSuccess={() => {
            reloadProfile()
            setIsRssModalOpen(false)
          }}
        />
      )}
    </div>
  )
}