"use client"

import { useState, useEffect, useRef } from "react"
import type { Post, ReactionCount, CommentCount } from "@/lib/types"
import { User } from "@supabase/supabase-js"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageCircle, Share2, ExternalLink, Play, Pause, ChevronDown, ChevronUp } from "lucide-react"
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
import { FormattedEpisodeContent } from "./formatted-episode-content"

// Interactive elements that should not trigger card navigation
const INTERACTIVE_ELEMENTS = 'button, a, input, textarea'

// Mobile card optimization constants
const MOBILE_MAX_LINES = 6
const LINE_HEIGHT_PX = 24
const MOBILE_MAX_HEIGHT_PX = LINE_HEIGHT_PX * MOBILE_MAX_LINES // 144px

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
  const [isExpanded, setIsExpanded] = useState(false)
  const [showExpandButton, setShowExpandButton] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer()
  const supabaseRef = useRef(createClient())
  const router = useRouter()

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
  })

  const isAuthor = currentUser?.id === post.user_id
  const isCurrentlyPlaying = currentTrack?.id === post.id && isPlaying

  // Check if content should show expand button
  useEffect(() => {
    if (contentRef.current) {
      const actualHeight = contentRef.current.scrollHeight
      setShowExpandButton(actualHeight > MOBILE_MAX_HEIGHT_PX)
    }
  }, [post.content])

  useEffect(() => {
    const supabase = supabaseRef.current
    
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
  }, [post.id])

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
      className="rounded-none border-x-0 border-t-0 sm:rounded-xl sm:border-t cursor-pointer py-2.5 sm:py-3 gap-0 overflow-hidden"
      onClick={(e) => {
        // Only navigate if we're not clicking on an interactive element
        if (!e.target || !(e.target instanceof Element)) {
          return
        }
        
        // Don't navigate if clicking on or inside interactive elements
        if (e.target.closest(INTERACTIVE_ELEMENTS)) {
          return
        }
        
        router.push(`/post/${post.id}`)
      }}
    >
      <div className="flex gap-2.5 sm:gap-3 px-2.5 sm:px-3 min-w-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleAvatarClick()
          }}
          className={isAvatarClickable ? "cursor-pointer" : "cursor-default"}
          disabled={!isAvatarClickable}
        >
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
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

          <div className="space-y-2 sm:space-y-3 mt-1">
            <div>
              {/* Use FormattedEpisodeContent for podcast episodes, regular rendering for other posts */}
              {post.audio_url || post.external_guid ? (
                <>
                  <div 
                    ref={contentRef}
                    className={cn(
                      "transition-all duration-200 overflow-hidden",
                      !isExpanded && showExpandButton && "sm:max-h-none"
                    )}
                    style={{
                      maxHeight: !isExpanded && showExpandButton ? `${MOBILE_MAX_HEIGHT_PX}px` : undefined
                    }}
                  >
                    <FormattedEpisodeContent 
                      content={post.content}
                      isExpanded={isExpanded}
                    />
                  </div>
                  {showExpandButton && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(!isExpanded)
                      }}
                      className="sm:hidden text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          Show less <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div 
                    ref={contentRef}
                    className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap transition-all duration-200 break-words"
                    )}
                    style={{
                      maxHeight: !isExpanded && showExpandButton ? `${MOBILE_MAX_HEIGHT_PX}px` : undefined,
                      overflow: !isExpanded && showExpandButton ? 'hidden' : 'visible',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {renderContentWithHashtags(post.content)}
                  </div>
                  {showExpandButton && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(!isExpanded)
                      }}
                      className="sm:hidden text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          Show less <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              {post.image_url && (
                <div className="rounded-lg border overflow-hidden mt-2">
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