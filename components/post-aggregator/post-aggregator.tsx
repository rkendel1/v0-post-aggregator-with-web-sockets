"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CashTag, Post } from "@/lib/types"
import { CashTagSidebar } from "./cash-tag-sidebar"
import { PostFeed } from "./post-feed"
import { PostComposer } from "./post-composer"
import { Button } from "@/components/ui/button"
import { PlusCircle, Settings } from "lucide-react"
import Link from "next/link"

interface PostAggregatorProps {
  initialCashTags: CashTag[]
}

export function PostAggregator({ initialCashTags }: PostAggregatorProps) {
  const [selectedTag, setSelectedTag] = useState<CashTag | null>(initialCashTags[0] || null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  // Fetch posts for selected tag
  useEffect(() => {
    if (!selectedTag) return

    const fetchPosts = async () => {
      setIsLoading(true)
      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          cash_tags (*),
          sources (*),
          comment_counts (*)
        `)
        .eq("cash_tag_id", selectedTag.id)
        .order("created_at", { ascending: false })

      if (data) {
        setPosts(data as Post[])
      }
      setIsLoading(false)
    }

    fetchPosts()
  }, [selectedTag, supabase])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!selectedTag) return

    const channel = supabase
      .channel(`posts:cash_tag_id=eq.${selectedTag.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `cash_tag_id=eq.${selectedTag.id}`,
        },
        async (payload) => {
          // Fetch the complete post with relations
          const { data } = await supabase
            .from("posts")
            .select(`
              *,
              cash_tags (*),
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
          filter: `cash_tag_id=eq.${selectedTag.id}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("posts")
            .select(`
              *,
              cash_tags (*),
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

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <CashTagSidebar cashTags={initialCashTags} selectedTag={selectedTag} onSelectTag={setSelectedTag} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedTag ? `$${selectedTag.tag}` : "Select a tag"}
              </h1>
              <p className="text-sm text-muted-foreground">{selectedTag?.name || "Choose a cash tag to view posts"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button onClick={() => setIsComposerOpen(true)} size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                New Post
              </Button>
            </div>
          </div>
        </header>

        {/* Feed */}
        <div className="flex-1 overflow-hidden">
          {selectedTag ? (
            <PostFeed posts={posts} isLoading={isLoading} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a cash tag to see posts</p>
            </div>
          )}
        </div>
      </div>

      {/* Post Composer Modal */}
      {isComposerOpen && selectedTag && (
        <PostComposer
          cashTag={selectedTag}
          onClose={() => setIsComposerOpen(false)}
          onPostCreated={(newPost) => {
            setPosts((current) => [newPost, ...current])
            setIsComposerOpen(false)
          }}
        />
      )}
    </div>
  )
}
