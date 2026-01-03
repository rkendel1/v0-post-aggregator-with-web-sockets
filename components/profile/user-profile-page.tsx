"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile, Post, ShowTag, Comment, TagFollow, Reaction } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PostFeed } from "@/components/post-aggregator/post-feed"
import { FollowButton } from "@/components/post-aggregator/follow-button"
import { useUser } from "@/contexts/user-context"
import { Toaster } from "react-hot-toast"
import { AuthPromptModal } from "@/components/auth/auth-prompt-modal"
import { GuestHandleModal } from "@/components/auth/guest-handle-modal"
import { AuthModal } from "@/components/auth/auth-modal"
import { AppLayoutClient } from "@/components/layout/app-layout-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Hash } from "lucide-react"

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
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [offset, setOffset] = useState(initialPosts.length)
  const [hasMore, setHasMore] = useState(initialPosts.length === POSTS_PER_PAGE)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [supabase] = useState(() => createClient())

  // Activity states
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [reactionsLoading, setReactionsLoading] = useState(false)
  const [followedTags, setFollowedTags] = useState<TagFollow[]>([])
  const [followedTagsLoading, setFollowedTagsLoading] = useState(false)

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

  // Fetch user comments
  const fetchComments = useCallback(async () => {
    setCommentsLoading(true)
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        user_profiles (*),
        posts (
          id,
          content,
          show_tag_id,
          show_tags (*)
        )
      `)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setComments(data as Comment[])
    }
    setCommentsLoading(false)
  }, [profile.id, supabase])

  // Fetch user reactions
  const fetchReactions = useCallback(async () => {
    setReactionsLoading(true)
    const { data } = await supabase
      .from("reactions")
      .select(`
        *,
        reaction_types (*),
        posts (
          id,
          content,
          author_name,
          show_tag_id,
          show_tags (*)
        )
      `)
      .eq("user_id", profile.id)
      .not("post_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      setReactions(data as Reaction[])
    }
    setReactionsLoading(false)
  }, [profile.id, supabase])

  // Fetch followed tags
  const fetchFollowedTags = useCallback(async () => {
    setFollowedTagsLoading(true)
    const { data } = await supabase
      .from("tag_follows")
      .select(`
        *,
        show_tags (*)
      `)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })

    if (data) {
      setFollowedTags(data as TagFollow[])
    }
    setFollowedTagsLoading(false)
  }, [profile.id, supabase])

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
        
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full sm:w-auto mb-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments" onClick={() => !comments.length && fetchComments()}>
              Comments
            </TabsTrigger>
            <TabsTrigger value="reactions" onClick={() => !reactions.length && fetchReactions()}>
              Reactions
            </TabsTrigger>
            <TabsTrigger value="tags" onClick={() => !followedTags.length && fetchFollowedTags()}>
              Followed Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
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
          </TabsContent>

          <TabsContent value="comments">
            <div className="max-w-2xl mx-auto space-y-4">
              {commentsLoading ? (
                <p className="text-center text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <Card key={comment.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => router.push(`/post/${comment.post_id}`)}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <MessageSquare className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">
                              Commented on {(comment as any).posts?.show_tags?.name || "a post"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reactions">
            <div className="max-w-2xl mx-auto space-y-4">
              {reactionsLoading ? (
                <p className="text-center text-muted-foreground">Loading reactions...</p>
              ) : reactions.length === 0 ? (
                <p className="text-center text-muted-foreground">No reactions yet.</p>
              ) : (
                reactions.map((reaction) => (
                  <Card key={reaction.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => reaction.post_id && router.push(`/post/${reaction.post_id}`)}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <span className="text-2xl flex-shrink-0">{reaction.reaction_types?.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">
                              Reacted to {(reaction as any).posts?.show_tags?.name || "a post"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reaction.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{(reaction as any).posts?.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tags">
            <div className="max-w-2xl mx-auto">
              {followedTagsLoading ? (
                <p className="text-center text-muted-foreground">Loading followed tags...</p>
              ) : followedTags.length === 0 ? (
                <p className="text-center text-muted-foreground">Not following any tags yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {followedTags.map((tagFollow) => (
                    <Card key={tagFollow.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => router.push(`/show/${tagFollow.show_tags?.tag}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Hash className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{tagFollow.show_tags?.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              Followed {formatDistanceToNow(new Date(tagFollow.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
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