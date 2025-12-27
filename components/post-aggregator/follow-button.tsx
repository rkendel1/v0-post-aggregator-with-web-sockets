"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserPlus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"

interface FollowButtonProps {
  userId: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function FollowButton({ userId, variant = "outline", size = "sm", className }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [supabase] = useState(() => createClient())
  const { user: currentUser } = useUser()

  useEffect(() => {
    if (!currentUser) {
      setIsFollowing(false)
      return
    }

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", userId)
        .limit(1)

      setIsFollowing(!!data && data.length > 0)
    }

    checkFollowStatus()
  }, [userId, supabase, currentUser])

  const handleToggleFollow = async () => {
    if (!currentUser || currentUser.id === userId) return

    setIsLoading(true)

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", userId)

      if (!error) {
        setIsFollowing(false)
      }
    } else {
      // Follow
      const { error } = await supabase.from("user_follows").insert({
        follower_id: currentUser.id,
        following_id: userId,
      })

      if (!error) {
        setIsFollowing(true)
      }
    }

    setIsLoading(false)
  }

  // Don't show follow button for own profile
  if (currentUser?.id === userId) {
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