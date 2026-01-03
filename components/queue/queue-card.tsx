"use client"

import { useState } from "react"
import type { Post } from "@/lib/types"
import { User } from "@supabase/supabase-js"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Play, Pause, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAudioPlayer } from "@/contexts/audio-player-context"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"

interface QueueCardProps {
  post: Post
  currentUser: User | null
  onRemove: (postId: string) => void
}

export function QueueCard({ post, currentUser, onRemove }: QueueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer()
  const router = useRouter()
  const isCurrentlyPlaying = currentTrack?.id === post.id && isPlaying

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  })

  const handleRemoveFromQueue = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const supabase = createClient()
    
    if (!currentUser) return

    const { error } = await supabase
      .from("saved_posts")
      .update({ queue_position: null })
      .eq("post_id", post.id)
      .eq("user_id", currentUser.id)

    if (error) {
      toast.error("Failed to remove from queue")
    } else {
      toast.success("Removed from queue")
      onRemove(post.id)
    }
  }

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    playTrack(post)
  }

  const handleCardClick = () => {
    router.push(`/post/${post.id}`)
  }

  return (
    <Card className="rounded-lg border overflow-hidden">
      {/* Compact view - always visible */}
      <div 
        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Thumbnail - smaller on mobile */}
        <div className="flex-shrink-0">
          {post.image_url ? (
            <img
              src={post.image_url}
              alt={post.content.substring(0, 50)}
              className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded"
              onError={(e) => {
                e.currentTarget.style.display = "none"
                const avatar = e.currentTarget.nextElementSibling as HTMLElement
                if (avatar) avatar.style.display = "flex"
              }}
            />
          ) : (
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
              <AvatarImage src={post.author_avatar || undefined} />
              <AvatarFallback>{post.author_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Title and metadata */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-1 sm:line-clamp-2">
            {post.content}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {post.author_name} • {timeAgo}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-0.5">
          {post.audio_url && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePlayPause}
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              {isCurrentlyPlaying ? (
                <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="h-7 w-7 sm:h-8 sm:w-8"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded view - only visible when expanded */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Full content */}
          <div className="text-sm whitespace-pre-wrap">
            {post.content}
          </div>

          {/* Full image if available */}
          {post.image_url && (
            <div className="rounded-lg border overflow-hidden">
              <img
                src={post.image_url}
                alt={post.content.substring(0, 50)}
                className="w-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCardClick}
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveFromQueue}
              className="flex-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
