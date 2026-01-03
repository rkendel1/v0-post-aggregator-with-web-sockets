"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import toast from "react-hot-toast"

interface SavePostButtonProps {
  postId: string
  className?: string
  onToggle?: (isSaved: boolean) => void
  showText?: boolean
}

export function SavePostButton({ postId, className, onToggle, showText = true }: SavePostButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [supabase] = useState(() => createClient())
  const { user } = useUser()

  useEffect(() => {
    if (!user) {
      setIsSaved(false)
      return
    }

    const checkSaveStatus = async () => {
      const { data } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .eq("is_saved", true)
        .limit(1)

      setIsSaved(!!data && data.length > 0)
    }

    checkSaveStatus()
  }, [postId, supabase, user])

  const handleToggleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save posts")
      return
    }

    setIsLoading(true)

    if (isSaved) {
      // Unsave - check if post is also in queue
      const { data: existingEntry } = await supabase
        .from("saved_posts")
        .select("id, queue_position")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .eq("is_saved", true)
        .limit(1)

      if (existingEntry && existingEntry.length > 0) {
        const entry = existingEntry[0]
        
        if (entry.queue_position !== null) {
          // Post is in queue, so just set is_saved to false
          const { error } = await supabase
            .from("saved_posts")
            .update({ is_saved: false })
            .eq("user_id", user.id)
            .eq("post_id", postId)

          if (!error) {
            setIsSaved(false)
            onToggle?.(false)
          }
        } else {
          // Post is not in queue, so delete the record
          const { error } = await supabase
            .from("saved_posts")
            .delete()
            .eq("user_id", user.id)
            .eq("post_id", postId)

          if (!error) {
            setIsSaved(false)
            onToggle?.(false)
          }
        }
      }
    } else {
      // Save - check if entry already exists (e.g., in queue)
      const { data: existingEntry } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .limit(1)

      if (existingEntry && existingEntry.length > 0) {
        // Entry exists (probably in queue), just set is_saved to true
        const { error } = await supabase
          .from("saved_posts")
          .update({ is_saved: true })
          .eq("user_id", user.id)
          .eq("post_id", postId)

        if (!error) {
          setIsSaved(true)
          onToggle?.(true)
        }
      } else {
        // Create new saved_posts entry
        const { error } = await supabase.from("saved_posts").insert({
          user_id: user.id,
          post_id: postId,
          is_saved: true,
        })

        if (!error) {
          setIsSaved(true)
          onToggle?.(true)
        }
      }
    }

    setIsLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size={showText ? "sm" : "icon-sm"}
      onClick={handleToggleSave}
      disabled={isLoading}
      className={cn(showText && "gap-2 h-8", isSaved && "text-primary", className)}
    >
      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {showText && <span className="text-xs">{isSaved ? "Saved" : "Save"}</span>}
    </Button>
  )
}