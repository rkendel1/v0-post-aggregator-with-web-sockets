"use client"

import { SavedPostsFeed } from "./saved-posts-feed"
import { AppLayoutClient } from "@/components/layout/app-layout-client"
import type { Post, ShowTag } from "@/lib/types"

interface SavedPostsPageContentProps {
  initialPosts: Post[]
  showTags: ShowTag[]
}

export function SavedPostsPageContent({ initialPosts, showTags }: SavedPostsPageContentProps) {
  return (
    <AppLayoutClient
      showTags={showTags}
      pageTitle="Saved Posts"
      pageSubtitle={`You have ${initialPosts.length} item(s) saved.`}
    >
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
          <div className="max-w-2xl mx-auto">
            <SavedPostsFeed initialPosts={initialPosts} />
          </div>
        </div>
      </div>
    </AppLayoutClient>
  )
}
