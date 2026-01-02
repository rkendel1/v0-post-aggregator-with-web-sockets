"use client"

import { useState, useEffect } from "react"
import type { Post, ReactionCount, CommentCount } from "@/lib/types"
import { User } from "@supabase/supabase-js"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageCircle, Share2, ExternalLink, Play, Pause } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ReactionPicker } from "./reaction-picker"
import { SavePostButton } from "./save-post-button"
import { AddToQueueButton } from "./add-to-queue-button"
import { FederatedPostStatus } from "./federated-post-status"
import { PostActions } from "./post-actions"
import toast from "react-hot-toast"
import { useAudioPlayer } from "@/contexts/audio-player-context"
import { createClient } from "@/lib/supabase/client"
import { cn, getPostNavigationPath } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface PostCardProps {
  post: Post
  currentUser: User | null
  onPostDeleted: (postId: string) => void
  onPostHidden: (postId: string) => void
  onInteractionAttempt: (message: string) => void
  onPostUnsaved?: (postId: string) => void
}

export function PostCard({ post, currentUser, onPostDeleted, onPostHidden, onInteractionAttempt, onPostUnsaved }: PostCardProps) {
  const [reactionCounts, setReactionCounts] = useState<ReactionCount[]>(post.reaction_counts || [])
  const [commentCount, setCommentCount] = useState<number>(post.comment_counts?.count || 0)
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer()
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  })

  const isAuthor = currentUser?.id === post.user_id
  const isCurrentlyPlaying = currentTrack?.id === post.id && isPlaying

  useEffect(() => {
    const reactionChannel = supabase
      .channel(`reaction_counts:post_id=eq.${post.id}`)
      .on<ReactionCount>(
        "postgres_changes",
        { event: "*", schema: "public", table: "reaction_counts", filter: `post_id=eq.${post.id}` },
        async () => {
          const { data } = await supabase
            .from("reaction_counts")
            .select("*, reaction_types(*)")
            .eq("post_id", post.id)
          setReactionCounts(data || [])
        },
      )
      .subscribe()

    const commentChannel = supabase
      .channel(`comment_counts:post_id=eq.${post.id}`)
      .on<CommentCount>(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_counts", filter: `post_id=eq.${post.id}` },
        (payload) => {
          const newRecord = payload.new as Partial<CommentCount>
          setCommentCount(newRecord.count ?? 0)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(reactionChannel)
      supabase.removeChannel(commentChannel)
    }
  }, [post.id, supabase])

  const handleShare = () => {
    const postUrl = post.external_url || `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(postUrl)
    toast.success("Post link copied to clipboard!")
  }

  const handleInteraction = (message: string, e: React.MouseEvent) => {
    if (!currentUser) {
      e.preventDefault()
      onInteractionAttempt(message)
    }
  }

  const renderContentWithHashtags = (content: string) => {
    const parts = content.split(/(#[\w-]+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1).toLowerCase()
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/show/${tag}`)
            }}
            className="text-primary hover:underline cursor-pointer"
          >
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const handleAvatarClick = () => {
    const path = getPostNavigationPath(post)
    if (path) {
      router.push(path)
    }
  }

  const isAvatarClickable = getPostNavigationPath(post) !== null

  return (
    <Card 
      className="rounded-none border-x-0 border-t-0 sm:rounded-xl sm:border-t cursor-pointer"
      onClick={(e) => {
        // Only navigate if we're not clicking on an interactive element
        const target = e.target
        
        // Type guard to ensure target is an Element
        if (!(target instanceof Element)) {
          return
        }
        
        // Don't navigate if clicking on buttons or links
        if (
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('button') ||
          target.closest('a')
        ) {
          return
        }
        
        router.push(`/post/${post.id}`)
      }}
    >
      <div className="p-3 flex gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleAvatarClick()
          }}
          className={isAvatarClickable ? "cursor-pointer" : "cursor-default"}
          disabled={!isAvatarClickable}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author_avatar || undefined} />
            <AvatarFallback>{post.author_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAvatarClick()
                  }}
                  className={`font-semibold text-sm ${isAvatarClickable ? "hover:underline cursor-pointer" : "cursor-default"}`}
                  disabled={!isAvatarClickable}
                >
                  {post.author_name}
                </button>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
              {currentUser && <FederatedPostStatus postId={post.id} />}
            </div>
            {currentUser && (
              <PostActions
                post={post}
                isAuthor={isAuthor}
                onPostDeleted={onPostDeleted}
                onPostHidden={onPostHidden}
              />
            )}
          </div>

          <div className="space-y-3 mt-1">
            <div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {renderContentWithHashtags(post.content)}
              </p>
              {post.image_url && (
                <div className="rounded-lg border overflow-hidden">
                  <img
                    src={post.image_url}
                    alt={post.content.substring(0, 50)}
                    className="aspect-video w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>
            {post.external_url && (
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={post.external_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </a>
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 -ml-2">
            <div className="flex items-center">
              <div onClick={(e) => {
                e.stopPropagation()
                handleInteraction("react to a post", e)
              }}>
                <ReactionPicker postId={post.id} reactionCounts={reactionCounts} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!currentUser) {
                    handleInteraction("comment on a post", e)
                  } else {
                    router.push(`/post/${post.id}`)
                  }
                }}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{commentCount}</span>
              </Button>
              {post.audio_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 h-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!currentUser) {
                      handleInteraction("play audio", e)
                    } else {
                      playTrack(post)
                    }
                  }}
                >
                  {isCurrentlyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <div className="flex items-center">
              <div onClick={(e) => {
                e.stopPropagation()
                handleInteraction("save this post", e)
              }}>
                <SavePostButton
                  postId={post.id}
                  showText={false}
                  onToggle={(isSaved) => {
                    if (!isSaved) {
                      onPostUnsaved?.(post.id)
                    }
                  }}
                />
              </div>
              {post.audio_url && (
                <div onClick={(e) => {
                  e.stopPropagation()
                  handleInteraction("add to queue", e)
                }}>
                  <AddToQueueButton postId={post.id} showText={false} />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShare()
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}