"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, Post } from "@/lib/types"
import { ShowTagSidebar } from "./show-tag-sidebar"
import { PostFeed } from "./post-feed"
import { PostComposer } from "./post-composer"
import { FeedManagementModal } from "./feed-management-modal"
import { useFeedManager } from "@/lib/hooks/use-feed-manager"
import { Button } from "@/components/ui/button"
import { PlusCircle, Settings, Loader2, Rss, Menu } from "lucide-react"
import Link from "next/link"
import { ProfileSetupModal } from "@/components/auth/profile-setup-modal"
import { GuestHandleModal } from "@/components/auth/guest-handle-modal"
import { AuthModal } from "@/components/auth/auth-modal"
import { AuthPromptModal } from "@/components/auth/auth-prompt-modal"
import { Toaster, toast } from "react-hot-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface PostAggregatorProps {
  initialShowTags: ShowTag[]
}

const POST_SELECT_QUERY = `
  *,
  show_tags (*),
  sources (*),
  comment_counts (*),
  reaction_counts (*, reaction_types (*))
`
const POSTS_PER_PAGE = 20

export function PostAggregator({ initialShowTags }: PostAggregatorProps) {
  const {
    user,
    profile,
    feedTags,
    allAvailableTags,
    isLoading: isFeedLoading,
    isGuest,
    isProfileSetupNeeded,
    addTagToFeed,
    removeTagFromFeed,
    addNewAvailableTag,
    reloadProfile,
  } = useFeedManager(initialShowTags)

  const [activeFeed, setActiveFeed] = useState<"following" | "for-you">("following")
  const [selectedFeedId, setSelectedFeedId] = useState<string | "all" | null>("all")
  const [posts, setPosts] = useState<Post[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [authPrompt, setAuthPrompt] = useState({ open: false, message: "" })
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const [supabase] = useState(() => createClient())

  const feedTagIds = useMemo(() => feedTags.map((t) => t.id).join(","), [feedTags])

  const requireUser = (actionMessage: string) => {
    if (!user) {
      setAuthPrompt({ open: true, message: `To ${actionMessage}, please create an account or continue as a guest.` })
      return false
    }
    return true
  }

  const handleContinueAsGuest = () => {
    setAuthPrompt({ open: false, message: "" })
    setIsGuestModalOpen(true)
  }

  const handleSignUp = () => {
    setAuthPrompt({ open: false, message: "" })
    setIsAuthModalOpen(true)
  }

  const handleGuestSuccess = () => {
    setIsGuestModalOpen(false)
    reloadProfile()
  }

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false)
    reloadProfile()
  }

  // Fetch initial posts
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoadingPosts(true)
      setPosts([])
      setOffset(0)
      setHasMore(true)

      if (!user) {
        const { data } = await supabase
          .from("posts")
          .select(POST_SELECT_QUERY)
          .order("created_at", { ascending: false })
          .range(0, POSTS_PER_PAGE - 1)
        if (data) {
          setPosts(data as Post[])
          setOffset(data.length)
          if (data.length < POSTS_PER_PAGE) setHasMore(false)
        }
        setIsLoadingPosts(false)
        return
      }

      if (isFeedLoading) return
      if (activeFeed === "for-you" || !selectedFeedId) {
        setPosts([])
        setIsLoadingPosts(false)
        return
      }

      let hiddenPostIds: string[] = []
      const { data: hiddenPosts } = await supabase.from("hidden_posts").select("post_id").eq("user_id", user.id)
      if (hiddenPosts) hiddenPostIds = hiddenPosts.map((p) => p.post_id)

      const query = supabase.from("posts").select(POST_SELECT_QUERY).order("created_at", { ascending: false })

      if (selectedFeedId === "all") {
        const tagIds = feedTagIds ? feedTagIds.split(",") : []
        if (tagIds.length > 0) query.in("show_tag_id", tagIds)
        else {
          setPosts([])
          setIsLoadingPosts(false)
          return
        }
      } else {
        query.eq("show_tag_id", selectedFeedId)
      }

      if (hiddenPostIds.length > 0) query.not("id", "in", `(${hiddenPostIds.join(",")})`)

      const { data } = await query.range(0, POSTS_PER_PAGE - 1)
      if (data) {
        setPosts(data as Post[])
        setOffset(data.length)
        if (data.length < POSTS_PER_PAGE) setHasMore(false)
      }
      setIsLoadingPosts(false)
    }

    fetchPosts()
  }, [activeFeed, selectedFeedId, feedTagIds, supabase, user, isFeedLoading])

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMore) return

    setIsFetchingMore(true)

    let query = supabase.from("posts").select(POST_SELECT_QUERY).order("created_at", { ascending: false })

    if (user) {
      let hiddenPostIds: string[] = []
      const { data: hiddenPosts } = await supabase.from("hidden_posts").select("post_id").eq("user_id", user.id)
      if (hiddenPosts) hiddenPostIds = hiddenPosts.map((p) => p.post_id)
      if (hiddenPostIds.length > 0) query.not("id", "in", `(${hiddenPostIds.join(",")})`)

      if (selectedFeedId === "all") {
        const tagIds = feedTagIds ? feedTagIds.split(",") : []
        if (tagIds.length > 0) query.in("show_tag_id", tagIds)
      } else if (selectedFeedId) {
        query.eq("show_tag_id", selectedFeedId)
      }
    }

    const { data } = await query.range(offset, offset + POSTS_PER_PAGE - 1)

    if (data) {
      setPosts((prev) => [...prev, ...(data as Post[])])
      setOffset((prev) => prev + data.length)
      if (data.length < POSTS_PER_PAGE) setHasMore(false)
    }
    setIsFetchingMore(false)
  }, [isFetchingMore, hasMore, offset, user, supabase, selectedFeedId, feedTagIds])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || activeFeed === "for-you" || !selectedFeedId) return

    const tagIds = feedTagIds ? feedTagIds.split(",") : []
    if (selectedFeedId === "all" && tagIds.length === 0) return

    const filter = selectedFeedId === "all" ? `show_tag_id=in.(${tagIds.join(",")})` : `show_tag_id=eq.${selectedFeedId}`

    const handleInsert = async (payload: any) => {
      const { data } = await supabase.from("posts").select(POST_SELECT_QUERY).eq("id", payload.new.id).single()
      if (data) {
        setPosts((current) => {
          if (current.some((post) => post.id === data.id)) return current
          return [data as Post, ...current]
        })
      }
    }

    const channel = supabase
      .channel(`posts:${selectedFeedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter }, handleInsert)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeFeed, selectedFeedId, feedTagIds, supabase, user])

  const handlePostDeleted = (postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId))
  }

  const handlePostHidden = async (postId: string) => {
    if (!user) return
    setPosts((current) => current.filter((post) => post.id !== postId))
    toast.success("Post hidden.")
    await supabase.from("hidden_posts").insert({ user_id: user.id, post_id: postId })
  }

  if (isFeedLoading && !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
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

  const handleCopyRssLink = () => {
    if (!selectedTag) return
    const rssUrl = `${window.location.origin}/api/rss/${selectedTag.tag}`
    navigator.clipboard.writeText(rssUrl)
    toast.success("RSS feed link copied to clipboard!")
  }

  return (
    <div className="flex h-screen bg-background">
      <Toaster position="bottom-right" />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <ShowTagSidebar
          feedTags={feedTags}
          selectedFeedId={selectedFeedId}
          onSelectFeed={(id) => {
            if (requireUser("view your custom feed")) {
              setActiveFeed("following")
              setSelectedFeedId(id)
              setIsSidebarOpen(false)
            }
          }}
          onOpenManager={() => {
            if (requireUser("manage your feed")) {
              setIsManagerOpen(true)
              setIsSidebarOpen(false)
            }
          }}
        />
      </div>

      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col">
        <header className="border-b bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <span>
                    {!user
                      ? "Welcome"
                      : activeFeed === "following"
                      ? selectedFeedId === "all"
                        ? "All Feeds"
                        : selectedTag
                        ? `#${selectedTag.tag}`
                        : "Select a tag"
                      : "For You"}
                  </span>
                  {selectedTag && (
                    <Button variant="ghost" size="icon-sm" onClick={handleCopyRssLink} title="Copy RSS Feed Link">
                      <Rss className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {!user
                    ? "Discover the latest posts from the community"
                    : activeFeed === "following"
                    ? selectedFeedId === "all"
                      ? `Posts from ${feedTags.length} followed tags`
                      : selectedTag?.name || "Choose a show tag to view posts"
                    : "A curated feed of posts"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
              <Button
                onClick={() => {
                  if (requireUser("create a new post")) setIsComposerOpen(true)
                }}
                size="sm"
                className="gap-2"
                disabled={!user || (activeFeed === "following" && !selectedTag)}
              >
                <PlusCircle className="h-4 w-4" />
                New Post
              </Button>
            </div>
          </div>
          {user && (
            <Tabs value={activeFeed} onValueChange={(value) => setActiveFeed(value as "following" | "for-you")} className="w-full">
              <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2">
                <TabsTrigger value="following">Following</TabsTrigger>
                <TabsTrigger value="for-you">For You</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </header>

        <div className="flex-1 overflow-hidden">
          <PostFeed
            posts={posts}
            isLoading={isLoadingPosts}
            currentUser={user}
            onPostDeleted={handlePostDeleted}
            onPostHidden={handlePostHidden}
            onInteractionAttempt={requireUser}
            loadMorePosts={loadMorePosts}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
          />
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

      {authPrompt.open && (
        <AuthPromptModal
          isOpen={authPrompt.open}
          onClose={() => setAuthPrompt({ open: false, message: "" })}
          message={authPrompt.message}
          onContinueAsGuest={handleContinueAsGuest}
          onSignUp={handleSignUp}
        />
      )}

      {isGuestModalOpen && <GuestHandleModal onSuccess={handleGuestSuccess} />}

      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleAuthSuccess} />}
    </div>
  )
}