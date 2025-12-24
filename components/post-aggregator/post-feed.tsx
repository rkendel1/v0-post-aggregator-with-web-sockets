"use client"

import { useRef, useCallback } from "react"
import type { Post } from "@/lib/types"
import { User } from "@supabase/supabase-js"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PostCard } from "./post-card"
import { Loader2 } from "lucide-react"

interface PostFeedProps {
  posts: Post[]
  isLoading: boolean
  currentUser: User | null
  onPostDeleted: (postId: string) => void
  onPostHidden: (postId: string) => void
  onInteractionAttempt: (message: string) => void
  loadMorePosts: () => void
  hasMore: boolean
  isFetchingMore: boolean
}

export function PostFeed({
  posts,
  isLoading,
  currentUser,
  onPostDeleted,
  onPostHidden,
  onInteractionAttempt,
  loadMorePosts,
  hasMore,
  isFetchingMore,
}: PostFeedProps) {
  const observer = useRef<IntersectionObserver | null>(null)
  const lastPostElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingMore) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMorePosts()
        }
      })
      if (node) observer.current.observe(node)
    },
    [isLoading, isFetchingMore, hasMore, loadMorePosts],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No posts yet</p>
          <p className="text-sm text-muted-foreground">Follow some tags to get started!</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {posts.map((post, index) => {
          const isLastElement = posts.length === index + 1
          return (
            <div ref={isLastElement ? lastPostElementRef : null} key={post.id}>
              <PostCard
                post={post}
                currentUser={currentUser}
                onPostDeleted={onPostDeleted}
                onPostHidden={onPostHidden}
                onInteractionAttempt={onInteractionAttempt}
              />
            </div>
          )
        })}
        {isFetchingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">You've reached the end of the feed.</div>
        )}
      </div>
    </ScrollArea>
  )
}