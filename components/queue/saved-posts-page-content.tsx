"use client"

import { SavedPostsFeed } from "./saved-posts-feed"
import type { Post } from "@/lib/types"

interface SavedPostsPageContentProps {
  initialPosts: Post[]
}

export function SavedPostsPageContent({ initialPosts }: SavedPostsPageContentProps) {
  return (
    <div className="flex flex-col h-full">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Saved Posts</h1>
        <p className="text-muted-foreground">You have {initialPosts.length} item(s) saved.</p>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
          <div className="max-w-2xl mx-auto">
            <SavedPostsFeed initialPosts={initialPosts} />
          </div>
        </div>
      </div>
    </div>
  )
}
