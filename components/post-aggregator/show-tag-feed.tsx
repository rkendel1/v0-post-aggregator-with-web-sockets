"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, Post, UserProfile } from "@/lib/types"
import { PostFeed } from "./post-feed"
import { PostComposer } from "./post-composer"
import { Button } from "@/components/ui/button"
import { PlusCircle, Rss, BadgeCheck } from "lucide-react"
import { Toaster, toast } from "react-hot-toast"
import { TagFollowButton } from "./tag-follow-button"
import { User } from "@supabase/supabase-js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EpisodeCatalog } from "./episode-catalog"
import { ClaimPageModal } from "./claim-page-modal"
import { JoinConversationDropdown } from "./join-conversation-dropdown"
import { AppLayoutClient } from "@/components/layout/app-layout-client"

interface ShowTagFeedProps {
  showTag: ShowTag
  initialPlatformPosts: Post[]
  showTags: ShowTag[]
}

const POST_SELECT_QUERY = `
  *,
  show_tags (*),
  sources (*),
  comment_counts (*),
  reaction_counts (*, reaction_types (*)),
  user_profiles (*)
`
const POSTS_PER_PAGE = 20

export function ShowTagFeed({ showTag, initialPlatformPosts, showTags }: ShowTagFeedProps) {
  const [platformPosts, setPlatformPosts] = useState<Post[]>(initialPlatformPosts)
  const [officialPosts, setOfficialPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState("live-feed")

  const [platformOffset, setPlatformOffset] = useState(initialPlatformPosts.length)
  const [platformHasMore, setPlatformHasMore] = useState(initialPlatformPosts.length === POSTS_PER_PAGE)
  const [isFetchingPlatform, setIsFetchingPlatform] = useState(false)

  const [officialOffset, setOfficialOffset] = useState(0)
  const [officialHasMore, setOfficialHasMore] = useState(true)
  const [isFetchingOfficial, setIsFetchingOfficial] = useState(false)

  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [supabase] = useState(() => createClient())

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

  const fetchPosts = useCallback(async (type: 'platform' | 'official') => {
    const isPlatform = type === 'platform'
    const offset = isPlatform ? platformOffset : officialOffset
    const setFetching = isPlatform ? setIsFetchingPlatform : setIsFetchingOfficial
    
    setFetching(true)

    const query = supabase
      .from("posts")
      .select(POST_SELECT_QUERY)
      .eq("show_tag_id", showTag.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1)

    if (isPlatform) {
      query.is("external_guid", null)
    } else {
      query.not("external_guid", "is", null)
    }

    const { data } = await query

    if (data) {
      if (isPlatform) {
        setPlatformPosts(prev => [...prev, ...data as Post[]])
        setPlatformOffset(prev => prev + data.length)
        if (data.length < POSTS_PER_PAGE) setPlatformHasMore(false)
      } else {
        setOfficialPosts(prev => [...prev, ...data as Post[]])
        setOfficialOffset(prev => prev + data.length)
        if (data.length < POSTS_PER_PAGE) setOfficialHasMore(false)
      }
    }
    setFetching(false)
  }, [showTag.id, supabase, platformOffset, officialOffset])

  useEffect(() => {
    if (activeTab === 'official-feed' && officialPosts.length === 0) {
      fetchPosts('official')
    }
  }, [activeTab, officialPosts.length, fetchPosts])

  useEffect(() => {
    const handleInsert = async (payload: any) => {
      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("id", payload.new.id)
        .single()
      if (data) {
        const post = data as Post
        const isPlatformPost = post.external_guid === null
        const setPosts = isPlatformPost ? setPlatformPosts : setOfficialPosts
        
        setPosts((current) => {
          if (current.some((p) => p.id === post.id)) return current
          return [post, ...current]
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

  const handlePostDeleted = (postId: string, isPlatformPost: boolean) => {
    const setPosts = isPlatformPost ? setPlatformPosts : setOfficialPosts
    setPosts((current) => current.filter((post) => post.id !== postId))
  }

  const handlePostHidden = async (postId: string, isPlatformPost: boolean) => {
    if (!user) return
    const setPosts = isPlatformPost ? setPlatformPosts : setOfficialPosts
    setPosts((current) => current.filter((post) => post.id !== postId))
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

  // Build the title element with hashtag, badge, and RSS button
  const titleElement = (
    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
      <span>#{showTag.tag}</span>
      {showTag.claimed_by_user_id && <span title="Verified Page"><BadgeCheck className="h-5 w-5 text-blue-500" /></span>}
      <Button variant="ghost" size="icon-sm" onClick={handleCopyRssLink} title="Copy RSS Feed Link">
        <Rss className="h-4 w-4 text-muted-foreground" />
      </Button>
    </h1>
  )

  // Build the actions for the header
  const headerActions = (
    <>
      {user && !showTag.claimed_by_user_id && (
        <Button variant="outline" size="sm" onClick={() => setIsClaimModalOpen(true)} className="hidden md:flex">
          Claim this page
        </Button>
      )}
      {user && <TagFollowButton showTagId={showTag.id} />}
    </>
  )

  // Build the tabs with join conversation dropdown
  const tabsElement = (
    <div className="flex items-center justify-between gap-2 w-full">
      <TabsList>
        <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
        <TabsTrigger value="official-feed">Official Feed</TabsTrigger>
        <TabsTrigger value="catalog">Episode Catalog</TabsTrigger>
      </TabsList>
      {showTag.show_community_links && showTag.show_community_links.length > 0 && (
        <JoinConversationDropdown 
          communityLinks={showTag.show_community_links} 
          showName={showTag.name}
        />
      )}
    </div>
  )

  return (
    <AppLayoutClient
      showTags={showTags}
      pageTitle={titleElement}
      pageSubtitle={showTag.name}
      pageTabs={tabsElement}
      pageActions={headerActions}
    >
      <Toaster position="bottom-right" />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsContent value="live-feed" className="flex-1 overflow-hidden mt-0">
          <PostFeed
            posts={platformPosts}
            isLoading={false} // Initial load is handled by server
            currentUser={user}
            onPostDeleted={(postId) => handlePostDeleted(postId, true)}
            onPostHidden={(postId) => handlePostHidden(postId, true)}
            onInteractionAttempt={() => { /* Not implemented for this view */ }}
            loadMorePosts={() => fetchPosts('platform')}
            hasMore={platformHasMore}
            isFetchingMore={isFetchingPlatform}
          />
        </TabsContent>
        <TabsContent value="official-feed" className="flex-1 overflow-hidden mt-0">
          <PostFeed
            posts={officialPosts}
            isLoading={officialPosts.length === 0 && isFetchingOfficial}
            currentUser={user}
            onPostDeleted={(postId) => handlePostDeleted(postId, false)}
            onPostHidden={(postId) => handlePostHidden(postId, false)}
            onInteractionAttempt={() => { /* Not implemented for this view */ }}
            loadMorePosts={() => fetchPosts('official')}
            hasMore={officialHasMore}
            isFetchingMore={isFetchingOfficial}
          />
        </TabsContent>
        <TabsContent value="catalog" className="flex-1 overflow-hidden mt-0">
          <EpisodeCatalog 
            showTagId={showTag.id} 
            showTagSlug={showTag.tag}
            communityLinks={showTag.show_community_links}
          />
        </TabsContent>
      </Tabs>

      {isComposerOpen && user && profile && (
        <PostComposer showTag={showTag} profile={profile} onClose={() => setIsComposerOpen(false)} onPostCreated={(newPost) => {
          setPlatformPosts((current) => [newPost, ...current])
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

      {user && (
        <Button
          onClick={() => setIsComposerOpen(true)}
          size="icon"
          className="rounded-full h-14 w-14 fixed right-4 z-40 bottom-20 md:bottom-6"
        >
          <PlusCircle className="h-6 w-6" />
        </Button>
      )}
    </AppLayoutClient>
  )
}