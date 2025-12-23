"use client"

import { useState } from "react"
import type { Post } from "@/lib/types"
import { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageCircle, Share2, ExternalLink, Play, Pause } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { CommentsSection } from "./comments-section"
import { ReactionPicker } from "./reaction-picker"
import { SavePostButton } from "./save-post-button"
import { FederatedPostStatus } from "./federated-post-status"
import { PostActions } from "./post-actions"
import toast from "react-hot-toast"
import { useAudioPlayer } from "@/contexts/audio-player-context"

interface PostCardProps {
  post: Post
  currentUser: User | null
  onPostDeleted: (postId: string) => void
  onPostHidden: (postId: string) => void
  onInteractionAttempt: (message: string) => void
}

export function PostCard({ post, currentUser, onPostDeleted, onPostHidden, onInteractionAttempt }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer()
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  })

  const commentCount = post.comment_counts?.count || 0
  const isAuthor = currentUser?.id === post.user_id
  const isCurrentlyPlaying = currentTrack?.id === post.id && isPlaying

  const handleShare = () => {
    const postUrl = post.external_url || `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(postUrl)
    toast.success("Post link copied to clipboard!")
  }

  const handleInteraction = (message: string, e: React.MouseEvent) => {
    if (!currentUser) {
      e.preventDefault()
      e.stopPropagation()
      onInteractionAttempt(message)
    }
  }

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
                {currentUser && <FederatedPostStatus postId={post.id} />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {post.sources && (
              <Badge variant="outline" className="text-xs">
                {post.sources.icon} {post.sources.name}
              </Badge>
            )}
            {currentUser && (
              <PostActions
                post={post}
                isAuthor={isAuthor}
                onPostDeleted={onPostDeleted}
                onPostHidden={onPostHidden}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {post.image_url && (
            <div className="sm:w-40 flex-shrink-0">
              <img
                src={post.image_url}
                alt={post.content.substring(0, 50)}
                className="aspect-square w-full rounded-lg object-cover border"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
            {post.external_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={post.external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {post.audio_url && (
             <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-8"
              onClick={(e) => {
                if (!currentUser) {
                  handleInteraction("play audio", e)
                } else {
                  playTrack(post)
                }
              }}
            >
              {isCurrentlyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="text-xs">{isCurrentlyPlaying ? "Pause" : "Play"}</span>
            </Button>
          )}
          <div onClick={(e) => handleInteraction("react to a post", e)}>
            <ReactionPicker postId={post.id} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-8"
            onClick={(e) => {
              if (!currentUser) {
                handleInteraction("comment on a post", e)
              } else {
                setShowComments(!showComments)
              }
            }}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{commentCount}</span>
          </Button>
          <div onClick={(e) => handleInteraction("save this post", e)}>
            <SavePostButton postId={post.id} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-8"
            onClick={() => {
              handleShare()
            }}
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        </div>

        {showComments && currentUser && <CommentsSection postId={post.id} />}
      </CardContent>
    </Card>
  )
}