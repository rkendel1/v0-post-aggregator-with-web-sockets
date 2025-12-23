"use client"

import { useState } from "react"
import type { Post } from "@/lib/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageCircle, Share2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { CommentsSection } from "./comments-section"
import { ReactionPicker } from "./reaction-picker"
import { PostFollowButton } from "./post-follow-button"
import { FederatedPostStatus } from "./federated-post-status"

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  })

  const commentCount = post.comment_counts?.count || 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author_avatar || undefined} />
              <AvatarFallback>{post.author_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{post.author_name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
                <FederatedPostStatus postId={post.id} />
              </div>
            </div>
          </div>
          {post.sources && (
            <Badge variant="outline" className="text-xs">
              {post.sources.icon} {post.sources.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{post.content}</p>

        <div className="flex items-center gap-4 pt-2">
          <ReactionPicker postId={post.id} />
          <Button variant="ghost" size="sm" className="gap-2 h-8" onClick={() => setShowComments(!showComments)}>
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{commentCount}</span>
          </Button>
          <PostFollowButton postId={post.id} />
          <Button variant="ghost" size="sm" className="gap-2 h-8">
            <Share2 className="h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        </div>

        {showComments && <CommentsSection postId={post.id} />}
      </CardContent>
    </Card>
  )
}
