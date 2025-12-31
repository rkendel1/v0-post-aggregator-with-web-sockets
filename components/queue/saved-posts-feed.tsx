"use client"

import { useState, useEffect } from "react"
import type { Post } from "@/lib/types"
import { PostCard } from "@/components/post-aggregator/post-card"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

interface SavedPostsFeedProps {
  initialPosts: Post[]
}

export function SavedPostsFeed({ initialPosts }: SavedPostsFeedProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [supabase])

  const handleUnsave = (postId: string) => {
    setPosts((currentPosts) => currentPosts.filter((p) => p.id !== postId))
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">You have no saved posts</p>
          <p className="text-sm text-muted-foreground">Click the bookmark icon on a post to save it for later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          onPostDeleted={() => {}}
          onPostHidden={() => {}}
          onInteractionAttempt={() => {}}
          onPostUnsaved={handleUnsave}
        />
      ))}
    </div>
  )
}