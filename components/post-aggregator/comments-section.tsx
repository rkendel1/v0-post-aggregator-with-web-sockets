"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Comment, ReactionCount } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Send } from "lucide-react"
import { ReactionPicker } from "./reaction-picker"

interface CommentsSectionProps {
  postId: string
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [supabase] = useState(() => createClient())

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select(
        `
        *,
        user_profiles (*),
        reaction_counts (*, reaction_types (*))
      `,
      )
      .eq("post_id", postId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })

    if (data) {
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from("comments")
            .select(
              `
              *,
              user_profiles (*),
              reaction_counts (*, reaction_types (*))
            `,
            )
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true })

          return { ...comment, replies: replies || [] } as Comment
        }),
      )
      setComments(commentsWithReplies)
    }
  }, [postId, supabase])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Subscribe to real-time updates
  useEffect(() => {
    const commentsChannel = supabase
      .channel(`public:comments:post_id=eq.${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => {
          fetchComments()
        },
      )
      .subscribe()

    const reactionsChannel = supabase
      .channel(`public:reaction_counts:comments`)
      .on<ReactionCount>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reaction_counts",
        },
        (payload) => {
          const record = payload.new as Partial<ReactionCount>
          if (record.comment_id) {
            fetchComments()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(commentsChannel)
      supabase.removeChannel(reactionsChannel)
    }
  }, [postId, supabase, fetchComments])

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      content: newComment,
      user_id: user.id,
    })

    if (!error) {
      setNewComment("")
    }

    setIsSubmitting(false)
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      parent_comment_id: parentCommentId,
      content: replyContent,
      user_id: user.id,
    })

    if (!error) {
      setReplyContent("")
      setReplyingTo(null)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      {/* New Comment Form */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] resize-none"
        />
        <Button onClick={handleSubmitComment} disabled={isSubmitting || !newComment.trim()} size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            {/* Main Comment */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user_profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {comment.user_profiles?.display_name?.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.user_profiles?.display_name || "Anonymous"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{comment.content}</p>
                <div className="flex items-center gap-2">
                  <ReactionPicker commentId={comment.id} reactionCounts={comment.reaction_counts} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    Reply
                  </Button>
                </div>

                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="flex gap-2 mt-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[50px] resize-none text-sm"
                    />
                    <Button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={isSubmitting || !replyContent.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-6 mt-3 space-y-3 border-l-2 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={reply.user_profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {reply.user_profiles?.display_name?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {reply.user_profiles?.display_name || "Anonymous"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{reply.content}</p>
                          <ReactionPicker commentId={reply.id} reactionCounts={reply.reaction_counts} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}