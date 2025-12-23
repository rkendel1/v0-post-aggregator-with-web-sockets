"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, Post, Source, ConnectedAccount, UserProfile } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import toast from "react-hot-toast"

interface PostComposerProps {
  showTag: ShowTag
  profile: UserProfile | null
  onClose: () => void
  onPostCreated: (post: Post) => void
}

export function PostComposer({ showTag, profile, onClose, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [sourceId, setSourceId] = useState<string>("")
  const [sources, setSources] = useState<Source[]>([])
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const fetchData = async () => {
      // Fetch sources
      const { data: sourcesData } = await supabase.from("sources").select("*")
      if (sourcesData) {
        setSources(sourcesData as Source[])
      }

      // Fetch user's connected accounts that support writing
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: accountsData } = await supabase
          .from("connected_accounts")
          .select(`
            *,
            platforms (*)
          `)
          .eq("user_id", user.id)
          .eq("is_active", true)

        if (accountsData) {
          const writeableAccounts = (accountsData as ConnectedAccount[]).filter(
            (acc) => acc.platforms?.supports_write === true,
          )
          setConnectedAccounts(writeableAccounts)
        }
      }
    }
    fetchData()
  }, [supabase])

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || !profile) {
      toast.error("Please sign in to create a post.")
      setIsSubmitting(false)
      return
    }

    try {
      // Create the post
      const { data, error } = await supabase
        .from("posts")
        .insert({
          content: `#${showTag.tag} ${content.trim()}`,
          author_name: profile.display_name || profile.username || "Anonymous",
          author_avatar: profile.avatar_url || null,
          show_tag_id: showTag.id,
          source_id: sourceId || null,
          user_id: user.id,
          likes_count: 0,
        })
        .select(`
          *,
          show_tags (*),
          sources (*),
          comment_counts (*)
        `)
        .single()

      if (error) throw error

      // Create federated post records for selected accounts
      if (data && selectedAccounts.length > 0) {
        const federatedPosts = selectedAccounts.map((accountId) => ({
          local_post_id: data.id,
          connected_account_id: accountId,
          status: "pending",
        }))

        await supabase.from("federated_posts").insert(federatedPosts)

        // In a real implementation, you would trigger backend jobs to actually post to each platform
        // For now, we'll just mark them as published after a delay
        setTimeout(async () => {
          await supabase
            .from("federated_posts")
            .update({
              status: "published",
              published_at: new Date().toISOString(),
              external_post_id: `mock_${Math.random().toString(36).substring(7)}`,
            })
            .eq("local_post_id", data.id)
        }, 2000)
      }

      if (data) {
        onPostCreated(data as Post)
        toast.success("Post published successfully!")
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Post for #{showTag.tag}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source">Source (optional)</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger id="source">
                <SelectValue placeholder="Select a source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.icon} {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder={`What are your thoughts? Your post will start with #${showTag.tag}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
            />
          </div>

          {connectedAccounts.length > 0 && (
            <div className="space-y-2">
              <Label>Also post to (Federation)</Label>
              <div className="border rounded-lg p-3 space-y-2">
                {connectedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={account.id}
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => toggleAccount(account.id)}
                    />
                    <label
                      htmlFor={account.id}
                      className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <span>{account.platforms?.icon}</span>
                      <span>{account.platforms?.display_name}</span>
                      <Badge variant="outline" className="text-xs">
                        @{account.platform_username}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
              {selectedAccounts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Your post will be published to {selectedAccounts.length} platform
                  {selectedAccounts.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post{" "}
                  {selectedAccounts.length > 0 &&
                    `to ${selectedAccounts.length + 1} platform${selectedAccounts.length > 0 ? "s" : ""}`}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}