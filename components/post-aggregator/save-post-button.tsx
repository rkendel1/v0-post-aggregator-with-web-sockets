"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"

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
        .limit(1)

      setIsSaved(!!data && data.length > 0)
    }

    checkSaveStatus()
  }, [postId, supabase, user])

  const handleToggleSave = async () => {
    if (!user) return

    setIsLoading(true)

    if (isSaved) {
      // Unsave
      const { error } = await supabase.from("saved_posts").delete().eq("user_id", user.id).eq("post_id", postId)

      if (!error) {
        setIsSaved(false)
        onToggle?.(false)
      }
    } else {
      // Save
      const { error } = await supabase.from("saved_posts").insert({
        user_id: user.id,
        post_id: postId,
      })

      if (!error) {
        setIsSaved(true)
        onToggle?.(true)
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