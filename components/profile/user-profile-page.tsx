"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile, Post, ShowTag } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostFeed } from "@/components/post-aggregator/post-feed"
import { FollowButton } from "@/components/post-aggregator/follow-button"
import { useUser } from "@/contexts/user-context"
import { Toaster } from "react-hot-toast"
import { AuthPromptModal } from "@/components/auth/auth-prompt-modal"
import { GuestHandleModal } from "@/components/auth/guest-handle-modal"
import { AuthModal } from "@/components/auth/auth-modal"
import { AppLayoutClient } from "@/components/layout/app-layout-client"

const POST_SELECT_QUERY = `
  *,
  show_tags (*),
  sources (*),
  comment_counts (*),
  reaction_counts (*, reaction_types (*))
`
const POSTS_PER_PAGE = 20

interface UserProfilePageProps {
  profile: UserProfile
  initialPosts: Post[]
  showTags: ShowTag[]
}

export function UserProfilePage({ profile, initialPosts, showTags }: UserProfilePageProps) {
  const { user: currentUser, reloadProfile } = useUser()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [offset, setOffset] = useState(initialPosts.length)
  const [hasMore, setHasMore] = useState(initialPosts.length === POSTS_PER_PAGE)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [supabase] = useState(() => createClient())

  const [authPrompt, setAuthPrompt] = useState({ open: false, message: "" })
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const requireUser = (actionMessage: string) => {
    if (!currentUser) {
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

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMore) return
    setIsFetchingMore(true)

    const { data } = await supabase
      .from("posts")
      .select(POST_SELECT_QUERY)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1)

    if (data) {
      setPosts((prev) => [...prev, ...(data as Post[])])
      setOffset((prev) => prev + data.length)
      if (data.length < POSTS_PER_PAGE) setHasMore(false)
    }
    setIsFetchingMore(false)
  }, [isFetchingMore, hasMore, offset, profile.id, supabase])

  const handlePostDeleted = (postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId))
  }

  const titleElement = (
    <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{profile.display_name}</h1>
  )

  return (
    <AppLayoutClient
      showTags={showTags}
      pageTitle={titleElement}
      pageSubtitle={<span className="hidden md:inline">@{profile.username}</span>}
    >
      <Toaster position="bottom-right" />
      <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback>{profile.display_name?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{profile.display_name}</h2>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>
              {currentUser && currentUser.id !== profile.id && <FollowButton userId={profile.id} />}
            </div>
            <p className="text-sm">{profile.bio || "No bio yet."}</p>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="font-bold">{profile.user_follow_counts?.following_count || 0}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
              <div>
                <span className="font-bold">{profile.user_follow_counts?.followers_count || 0}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Posts</h3>
        <div className="max-w-2xl mx-auto">
          <PostFeed
            posts={posts}
            isLoading={false}
            currentUser={currentUser}
            onPostDeleted={handlePostDeleted}
            onPostHidden={() => {}}
            onInteractionAttempt={requireUser}
            loadMorePosts={loadMorePosts}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
          />
        </div>
      </div>
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
    </AppLayoutClient>
  )
}