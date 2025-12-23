"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagFollowButtonProps {
  tagId: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function TagFollowButton({ tagId, variant = "outline", size = "sm", className }: TagFollowButtonProps) {
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
        .from("tag_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("cash_tag_id", tagId)
        .single()

      setIsFollowing(!!data)
    }

    checkFollowStatus()
  }, [tagId, supabase])

  const handleToggleFollow = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    setIsLoading(true)

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase.from("tag_follows").delete().eq("user_id", user.id).eq("cash_tag_id", tagId)

      if (!error) {
        setIsFollowing(false)
      }
    } else {
      // Follow
      const { error } = await supabase.from("tag_follows").insert({
        user_id: user.id,
        cash_tag_id: tagId,
      })

      if (!error) {
        setIsFollowing(true)
      }
    }

    setIsLoading(false)
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={cn("gap-2", className)}
    >
      {isFollowing ? (
        <>
          <Check className="h-4 w-4" />
          Following
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  )
}
