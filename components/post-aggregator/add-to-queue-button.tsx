"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ListPlus, ListCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import toast from "react-hot-toast"

interface AddToQueueButtonProps {
  postId: string
  className?: string
  onToggle?: (isInQueue: boolean) => void
  showText?: boolean
}

export function AddToQueueButton({ postId, className, onToggle, showText = true }: AddToQueueButtonProps) {
  const [isInQueue, setIsInQueue] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [supabase] = useState(() => createClient())
  const { user } = useUser()

  useEffect(() => {
    if (!user) {
      setIsInQueue(false)
      return
    }

    const checkQueueStatus = async () => {
      const { data } = await supabase
        .from("saved_posts")
        .select("id, queue_position")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .not("queue_position", "is", null)
        .limit(1)

      setIsInQueue(!!data && data.length > 0)
    }

    checkQueueStatus()
  }, [postId, supabase, user])

  const handleToggleQueue = async () => {
    if (!user) return

    setIsLoading(true)

    if (isInQueue) {
      // Remove from queue - check if post is also saved
      const { data: existingEntry } = await supabase
        .from("saved_posts")
        .select("id, is_saved")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .not("queue_position", "is", null)
        .limit(1)

      if (existingEntry && existingEntry.length > 0) {
        const entry = existingEntry[0]
        
        if (entry.is_saved) {
          // Post is saved, so just set queue_position to null
          const { error } = await supabase
            .from("saved_posts")
            .update({ queue_position: null })
            .eq("user_id", user.id)
            .eq("post_id", postId)

          if (!error) {
            setIsInQueue(false)
            onToggle?.(false)
            toast.success("Removed from queue")
          } else {
            toast.error("Failed to remove from queue")
          }
        } else {
          // Post is not saved, so delete the record
          const { error } = await supabase
            .from("saved_posts")
            .delete()
            .eq("user_id", user.id)
            .eq("post_id", postId)

          if (!error) {
            setIsInQueue(false)
            onToggle?.(false)
            toast.success("Removed from queue")
          } else {
            toast.error("Failed to remove from queue")
          }
        }
      }
    } else {
      // Helper function to get next queue position
      const getNextQueuePosition = async () => {
        const { data: maxPosition } = await supabase
          .from("saved_posts")
          .select("queue_position")
          .eq("user_id", user.id)
          .not("queue_position", "is", null)
          .order("queue_position", { ascending: false })
          .limit(1)

        return (maxPosition?.[0]?.queue_position || 0) + 1
      }

      // Check if post is already saved
      const { data: existingSave } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .limit(1)

      if (existingSave && existingSave.length > 0) {
        // Update existing saved post with queue position
        const newPosition = await getNextQueuePosition()

        const { error } = await supabase
          .from("saved_posts")
          .update({ queue_position: newPosition })
          .eq("user_id", user.id)
          .eq("post_id", postId)

        if (!error) {
          setIsInQueue(true)
          onToggle?.(true)
          toast.success("Added to queue")
        } else {
          toast.error("Failed to add to queue")
        }
      } else {
        // Create new saved post with queue position (not explicitly saved)
        const newPosition = await getNextQueuePosition()

        const { error } = await supabase.from("saved_posts").insert({
          user_id: user.id,
          post_id: postId,
          queue_position: newPosition,
          is_saved: false,
        })

        if (!error) {
          setIsInQueue(true)
          onToggle?.(true)
          toast.success("Added to queue")
        } else {
          toast.error("Failed to add to queue")
        }
      }
    }

    setIsLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size={showText ? "sm" : "icon-sm"}
      onClick={handleToggleQueue}
      disabled={isLoading}
      className={cn(showText && "gap-2 h-8", isInQueue && "text-primary", className)}
    >
      {isInQueue ? <ListCheck className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
      {showText && <span className="text-xs">{isInQueue ? "In Queue" : "Add to Queue"}</span>}
    </Button>
  )
}
