"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface SavePostButtonProps {
  postId: string
  className?: string
  onToggle?: (isSaved: boolean) => void
}

export function SavePostButton({ postId, className, onToggle }: SavePostButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const checkSaveStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .limit(1)

      setIsSaved(!!data && data.length > 0)
    }

    checkSaveStatus()
  }, [postId, supabase])

  const handleToggleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
      size="sm"
      onClick={handleToggleSave}
      disabled={isLoading}
      className={cn("gap-2 h-8", isSaved && "text-primary", className)}
    >
      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      <span className="text-xs">{isSaved ? "Saved" : "Save"}</span>
    </Button>
  )
}