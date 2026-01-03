"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    
    const fetchInitialUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchInitialUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current
    
    const fetchProfile = async () => {
      if (user) {
        const { data: profileData } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
        setProfile(profileData as UserProfile)
      } else {
        setProfile(null)
      }
    }
    fetchProfile()
  }, [user])

  const fetchPosts = useCallback(async (type: 'platform' | 'official') => {
    const supabase = supabaseRef.current
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
  }, [showTag.id, platformOffset, officialOffset])

  useEffect(() => {
    if (activeTab === 'official-feed' && officialPosts.length === 0) {
      fetchPosts('official')
    }
  }, [activeTab, officialPosts.length, fetchPosts])

  useEffect(() => {
    const supabase = supabaseRef.current
    
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
  }, [showTag.id])

  const handlePostDeleted = (postId: string, isPlatformPost: boolean) => {
    const setPosts = isPlatformPost ? setPlatformPosts : setOfficialPosts
    setPosts((current) => current.filter((post) => post.id !== postId))
  }

  const handlePostHidden = async (postId: string, isPlatformPost: boolean) => {
    const supabase = supabaseRef.current
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

  return (
    <AppLayoutClient
      showTags={showTags}
      pageTitle={titleElement}
      pageSubtitle={showTag.name}
      pageActions={headerActions}
    >
      <Toaster position="bottom-right" />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
            <TabsTrigger value="official-feed">Official Feed</TabsTrigger>
            <TabsTrigger value="catalog">Episode Catalog</TabsTrigger>
            {showTag.show_community_links && showTag.show_community_links.length > 0 && (
              <TabsTrigger value="discussion">Join Discussion</TabsTrigger>
            )}
          </TabsList>
        </div>
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
        {showTag.show_community_links && showTag.show_community_links.length > 0 && (
          <TabsContent value="discussion" className="flex-1 overflow-auto mt-0">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Join the Discussion</h2>
                <p className="text-muted-foreground mb-6">
                  Connect with other fans and discuss {showTag.name}
                </p>
              </div>
              
              <div className="space-y-4">
                {showTag.show_community_links
                  .filter(link => link.platform.toLowerCase() === 'discord' || link.is_discord)
                  .map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg">{link.name}</h3>
                          {link.description && (
                            <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                          )}
                          <p className="text-sm text-primary mt-2">Click to join on Discord →</p>
                        </div>
                      </div>
                    </a>
                  ))}
                
                {showTag.show_community_links
                  .filter(link => link.platform.toLowerCase() !== 'discord' && !link.is_discord)
                  .map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg">{link.name}</h3>
                          {link.description && (
                            <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                          )}
                          <p className="text-sm text-primary mt-2">Visit {link.platform} →</p>
                        </div>
                      </div>
                    </a>
                  ))}
              </div>
            </div>
          </TabsContent>
        )}
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