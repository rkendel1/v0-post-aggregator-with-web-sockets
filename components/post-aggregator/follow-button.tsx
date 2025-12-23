"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserPlus, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  userId: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function FollowButton({ userId, variant = "outline", size = "sm", className }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const checkFollowStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .limit(1)

      setIsFollowing(!!data && data.length > 0)
    }

    checkFollowStatus()
  }, [userId, supabase])

  const handleToggleFollow = async () => {
    if (!currentUserId || currentUserId === userId) return

    setIsLoading(true)

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)

      if (!error) {
        setIsFollowing(false)
      }
    } else {
      // Follow
      const { error } = await supabase.from("user_follows").insert({
        follower_id: currentUserId,
        following_id: userId,
      })

      if (!error) {
        setIsFollowing(true)
      }
    }

    setIsLoading(false)
  }

  // Don't show follow button for own profile
  if (currentUserId === userId) {
    return null
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
          <UserPlus className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  )
}