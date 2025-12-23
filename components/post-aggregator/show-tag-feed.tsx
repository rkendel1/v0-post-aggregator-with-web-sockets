"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, Post, UserProfile } from "@/lib/types"
import { PostFeed } from "./post-feed"
import { PostComposer } from "./post-composer"
import { Button } from "@/components/ui/button"
import { PlusCircle, Rss, Home } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"
import { Toaster, toast } from "react-hot-toast"
import { TagFollowButton } from "./tag-follow-button"
import { User } from "@supabase/supabase-js"

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

export function ShowTagFeed({ showTag }: ShowTagFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profileData } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
        setProfile(profileData as UserProfile)
      }
    }
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoadingPosts(true)
      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("show_tag_id", showTag.id)
        .order("created_at", { ascending: false })
        .limit(50)
      
      if (data) {
        setPosts(data as Post[])
      }
      setIsLoadingPosts(false)
    }
    fetchPosts()
  }, [showTag.id, supabase])

  useEffect(() => {
    const handleInsert = async (payload: any) => {
      const { data } = await supabase
        .from("posts")
        .select(POST_SELECT_QUERY)
        .eq("id", payload.new.id)
        .single()
      if (data) {
        setPosts((current) => {
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
    setPosts((current) => current.filter((post) => post.id !== postId))
  }

  const handlePostHidden = async (postId: string) => {
    if (!user) return
    setPosts((current) => current.filter((post) => post.id !== postId))
    toast.success("Post hidden.")
    await supabase.from("hidden_posts").insert({ user_id: user.id, post_id: postId })
  }

  const handleCopyRssLink = () => {
    const rssUrl = `${window.location.origin}/api/rss/${showTag.tag}`
    navigator.clipboard.writeText(rssUrl)
    toast.success("RSS feed link copied to clipboard!")
  }

  return (
    <div className="flex flex-col h-screen">
      <Toaster position="bottom-right" />
      <header className="border-b bg-card p-4 space-y-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span>#{showTag.tag}</span>
                <Button variant="ghost" size="icon-sm" onClick={handleCopyRssLink} title="Copy RSS Feed Link">
                  <Rss className="h-4 w-4 text-muted-foreground" />
                </Button>
              </h1>
              <p className="text-sm text-muted-foreground">{showTag.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && <TagFollowButton showTagId={showTag.id} />}
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Main Feed
              </Link>
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
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <PostFeed
          posts={posts}
          isLoading={isLoadingPosts}
          currentUser={user}
          onPostDeleted={handlePostDeleted}
          onPostHidden={handlePostHidden}
          onInteractionAttempt={() => { /* Not implemented for this view */ }}
        />
      </div>

      {isComposerOpen && user && profile && (
        <PostComposer showTag={showTag} profile={profile} onClose={() => setIsComposerOpen(false)} onPostCreated={(newPost) => {
          setPosts((current) => [newPost, ...current])
          setIsComposerOpen(false)
        }} />
      )}
    </div>
  )
}