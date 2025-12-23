"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ReactionType, ReactionCount } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ReactionPickerProps {
  postId?: string
  commentId?: string
  reactionCounts?: ReactionCount[]
  onReactionChange?: () => void
}

export function ReactionPicker({ postId, commentId, reactionCounts = [], onReactionChange }: ReactionPickerProps) {
  const [reactionTypes, setReactionTypes] = useState<ReactionType[]>([])
  const [userReaction, setUserReaction] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  // Fetch reaction types
  useEffect(() => {
    const fetchReactionTypes = async () => {
      const { data } = await supabase.from("reaction_types").select("*").order("display_order")

      if (data) {
        setReactionTypes(data)
      }
    }

    fetchReactionTypes()
  }, [supabase])

  // Fetch user's current reaction
  useEffect(() => {
    const fetchUserReaction = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const query = supabase.from("reactions").select("reaction_type_id").eq("user_id", user.id)

      if (postId) {
        query.eq("post_id", postId)
      } else if (commentId) {
        query.eq("comment_id", commentId)
      }

      const { data } = await query.single()

      if (data) {
        setUserReaction(data.reaction_type_id)
      }
    }

    fetchUserReaction()
  }, [postId, commentId, supabase])

  const handleReaction = async (reactionTypeId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // If user already has this reaction, remove it
    if (userReaction === reactionTypeId) {
      const deleteQuery = supabase
        .from("reactions")
        .delete()
        .eq("user_id", user.id)
        .eq("reaction_type_id", reactionTypeId)

      if (postId) {
        deleteQuery.eq("post_id", postId)
      } else if (commentId) {
        deleteQuery.eq("comment_id", commentId)
      }

      const { error } = await deleteQuery

      if (!error) {
        setUserReaction(null)
        onReactionChange?.()
      }
    } else {
      // Remove existing reaction if any
      if (userReaction) {
        const deleteQuery = supabase.from("reactions").delete().eq("user_id", user.id)

        if (postId) {
          deleteQuery.eq("post_id", postId)
        } else if (commentId) {
          deleteQuery.eq("comment_id", commentId)
        }

        await deleteQuery
      }

      // Add new reaction
      const insertData: any = {
        user_id: user.id,
        reaction_type_id: reactionTypeId,
      }

      if (postId) {
        insertData.post_id = postId
      } else if (commentId) {
        insertData.comment_id = commentId
      }

      const { error } = await supabase.from("reactions").insert(insertData)

      if (!error) {
        setUserReaction(reactionTypeId)
        onReactionChange?.()
      }
    }

    setIsOpen(false)
  }

  // Get total reaction count
  const totalCount = reactionCounts.reduce((sum, rc) => sum + rc.count, 0)

  // Get the most common reaction
  const topReaction =
    reactionCounts.length > 0 ? reactionCounts.reduce((max, rc) => (rc.count > max.count ? rc : max)) : null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("gap-2 h-8", userReaction && "text-primary")}>
          <span>{topReaction?.reaction_types?.emoji || "👍"}</span>
          <span className="text-xs">{totalCount || 0}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {reactionTypes.map((type) => {
            const count = reactionCounts.find((rc) => rc.reaction_type_id === type.id)?.count || 0
            const isActive = userReaction === type.id

            return (
              <Button
                key={type.id}
                variant="ghost"
                size="sm"
                className={cn("h-10 px-2 hover:scale-125 transition-transform", isActive && "bg-accent")}
                onClick={() => handleReaction(type.id)}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-lg">{type.emoji}</span>
                  {count > 0 && <span className="text-[10px] text-muted-foreground">{count}</span>}
                </div>
              </Button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
