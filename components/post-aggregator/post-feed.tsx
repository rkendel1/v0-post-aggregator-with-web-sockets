"use client"

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
}

export function PostFeed({ posts, isLoading, currentUser, onPostDeleted, onPostHidden, onInteractionAttempt }: PostFeedProps) {
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
          <p className="text-sm text-muted-foreground">Be the first to post in this community!</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            onPostDeleted={onPostDeleted}
            onPostHidden={onPostHidden}
            onInteractionAttempt={onInteractionAttempt}
          />
        ))}
      </div>
    </ScrollArea>
  )
}