"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface PostFollowButtonProps {
  postId: string
  className?: string
}

export function PostFollowButton({ postId, className }: PostFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkFollowStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("post_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .single()

      setIsFollowing(!!data)
    }

    checkFollowStatus()
  }, [postId, supabase])

  const handleToggleFollow = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    setIsLoading(true)

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase.from("post_follows").delete().eq("user_id", user.id).eq("post_id", postId)

      if (!error) {
        setIsFollowing(false)
      }
    } else {
      // Follow
      const { error } = await supabase.from("post_follows").insert({
        user_id: user.id,
        post_id: postId,
      })

      if (!error) {
        setIsFollowing(true)
      }
    }

    setIsLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={cn("gap-2 h-8", isFollowing && "text-primary", className)}
    >
      {isFollowing ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      <span className="text-xs">{isFollowing ? "Saved" : "Save"}</span>
    </Button>
  )
}
