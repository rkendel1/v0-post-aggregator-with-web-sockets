"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, Post, UserProfile } from "@/lib/types"
import { PostFeed } from "./post-feed"
import { PostComposer } from "./post-composer"
import { Button } from "@/components/ui/button"
import { PlusCircle, Rss, Home, BadgeCheck } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"
import { Toaster, toast } from "react-hot-toast"
import { TagFollowButton } from "./tag-follow-button"
import { User } from "@supabase/supabase-js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EpisodeCatalog } from "./episode-catalog"
import { ClaimPageModal } from "./claim-page-modal"

interface ShowTagFeedProps {
  showTag: ShowTag
}

const POST_SELECT_QUERY = `
  *,
  show_tags (*),
  sources (*),
  comment_counts (*),
  reaction_counts (*, reaction_types (*))
`
const POSTS_PER_PAGE = 20

export function ShowTagFeed({ showTag }: ShowTagFeedProps) {
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [supabase] = useState(() => createClient())
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)

  const platformPosts = useMemo(() => allPosts.filter((p) => p.external_guid === null), [allPosts])
  const officialPosts = useMemo(() => allPosts.filter((p) => p.external_guid !== null), [allPosts])

  useEffect(() => {
    const fetchInitialUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchInitialUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data: profileData } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
        setProfile(profileData as UserProfile)
      } else {
        setProfile(null)
      }
    }
    fetchProfile()
  }, [user, supabase])

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoadingPosts(true)
      setAllPosts([])
      setOffset(0)
      setHasMore(true)
      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("show_tag_id", showTag.id)
        .order("created_at", { ascending: false })
        .range(0, POSTS_PER_PAGE - 1)
      
      if (data) {
        setAllPosts(data as Post[])
        setOffset(data.length)
        if (data.length < POSTS_PER_PAGE) {
          setHasMore(false)
        }
      }
      setIsLoadingPosts(false)
    }
    fetchPosts()
  }, [showTag.id, supabase])

  const loadMorePosts = useCallback(async () => {
    if (isFetchingMore || !hasMore) return

    setIsFetchingMore(true)

    const { data } = await supabase
      .from("posts")
      .select(POST_SELECT_QUERY)
      .eq("show_tag_id", showTag.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1)

    if (data) {
      setAllPosts((prev) => [...prev, ...(data as Post[])])
      setOffset((prev) => prev + data.length)
      if (data.length < POSTS_PER_PAGE) {
        setHasMore(false)
      }
    }
    setIsFetchingMore(false)
  }, [isFetchingMore, hasMore, offset, showTag.id, supabase])

  useEffect(() => {
    const handleInsert = async (payload: any) => {
      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("id", payload.new.id)
        .single()
      if (data) {
        setAllPosts((current) => {
          if (current.some((post) => post.id === data.id)) {
            return current
          }
          return [data as Post, ...current]
        })
      }
    }

    const channel = supabase
      .channel(`posts:${showTag.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `show_tag_id=eq.${showTag.id}` }, handleInsert)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showTag.id, supabase])

  const handlePostDeleted = (postId: string) => {
    setAllPosts((current) => current.filter((post) => post.id !== postId))
  }

  const handlePostHidden = async (postId: string) => {
    if (!user) return
    setAllPosts((current) => current.filter((post) => post.id !== postId))
    toast.success("Post hidden.")
    await supabase.from("hidden_posts").insert({ user_id: user.id, post_id: postId })
  }

  const handleCopyRssLink = () => {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "podbridge.app"
    const siteUrl = `https://${rootDomain}`
    const rssUrl = `${siteUrl}/api/rss/${showTag.tag.toLowerCase()}`
    navigator.clipboard.writeText(rssUrl)
    toast.success("RSS feed link copied to clipboard!")
  }

  return (
    <div className="flex flex-col h-screen">
      <Toaster position="bottom-right" />
      <header className="border-b bg-card p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <span>#{showTag.tag}</span>
              {showTag.claimed_by_user_id && <span title="Verified Page"><BadgeCheck className="h-5 w-5 text-blue-500" /></span>}
              <Button variant="ghost" size="icon-sm" onClick={handleCopyRssLink} title="Copy RSS Feed Link">
                <Rss className="h-4 w-4 text-muted-foreground" />
              </Button>
            </h1>
            <p className="text-sm text-muted-foreground">{showTag.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && !showTag.claimed_by_user_id && (
            <Button variant="outline" size="sm" onClick={() => setIsClaimModalOpen(true)}>
              Claim this page
            </Button>
          )}
          {user && <TagFollowButton showTagId={showTag.id} />}
          <Button asChild variant="outline" size="sm">
            <a href={`https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'}`}>
              <Home className="h-4 w-4 mr-2" />
              Main Feed
            </a>
          </Button>
          <Button
            onClick={() => setIsComposerOpen(true)}
            size="sm"
            className="gap-2"
            disabled={!user}
          >
            <PlusCircle className="h-4 w-4" />
            New Post
          </Button>
        </div>
      </header>

      <Tabs defaultValue="live-feed" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-4 border-b">
          <TabsList>
            <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
            <TabsTrigger value="official-feed">Official Feed</TabsTrigger>
            <TabsTrigger value="catalog">Episode Catalog</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="live-feed" className="flex-1 overflow-hidden">
          <PostFeed
            posts={platformPosts}
            isLoading={isLoadingPosts}
            currentUser={user}
            onPostDeleted={handlePostDeleted}
            onPostHidden={handlePostHidden}
            onInteractionAttempt={() => { /* Not implemented for this view */ }}
            loadMorePosts={loadMorePosts}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
          />
        </TabsContent>
        <TabsContent value="official-feed" className="flex-1 overflow-hidden">
          <PostFeed
            posts={officialPosts}
            isLoading={isLoadingPosts}
            currentUser={user}
            onPostDeleted={handlePostDeleted}
            onPostHidden={handlePostHidden}
            onInteractionAttempt={() => { /* Not implemented for this view */ }}
            loadMorePosts={loadMorePosts}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
          />
        </TabsContent>
        <TabsContent value="catalog" className="flex-1 overflow-hidden">
          <EpisodeCatalog showTagId={showTag.id} showTagSlug={showTag.tag} />
        </TabsContent>
      </Tabs>

      {isComposerOpen && user && profile && (
        <PostComposer showTag={showTag} profile={profile} onClose={() => setIsComposerOpen(false)} onPostCreated={(newPost) => {
          setAllPosts((current) => [newPost, ...current])
          setIsComposerOpen(false)
        }} />
      )}

      {isClaimModalOpen && user && (
        <ClaimPageModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          showTag={showTag}
          user={user}
        />
      )}
    </div>
  )
}