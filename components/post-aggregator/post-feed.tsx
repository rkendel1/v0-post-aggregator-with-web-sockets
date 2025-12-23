"use client"

import type { Post } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PostCard } from "./post-card"
import { Loader2 } from "lucide-react"

interface PostFeedProps {
  posts: Post[]
  isLoading: boolean
}

export function PostFeed({ posts, isLoading }: PostFeedProps) {
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
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </ScrollArea>
  )
}
