"use client"

import { useState } from "react"
import type { Post } from "@/lib/types"
import { useAudioPlayer } from "@/contexts/audio-player-context"
import { PostCard } from "@/components/post-aggregator/post-card"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

interface QueueFeedProps {
  initialPosts: Post[]
}

export function QueueFeed({ initialPosts }: QueueFeedProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const supabase = createClient()

  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  })

  const handleUnsave = (postId: string) => {
    setPosts((currentPosts) => currentPosts.filter((p) => p.id !== postId))
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Your queue is empty</p>
          <p className="text-sm text-muted-foreground">Save posts from your feed to listen to them later.</p>
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
          onPostDeleted={() => {}} // Deleting is not a primary action on this page
          onPostHidden={() => {}} // Hiding is not a primary action on this page
          onInteractionAttempt={() => {}} // User is already logged in to see this page
          onPostUnsaved={handleUnsave}
        />
      ))}
    </div>
  )
}