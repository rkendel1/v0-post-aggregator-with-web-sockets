"use client"

import { useState, useMemo } from "react"
import type { ShowTag } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk"
import { Check, Plus, X, Save, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthModal } from "@/components/auth/auth-modal"
import { Badge } from "@/components/ui/badge"

interface FeedManagementModalProps {
  isOpen: boolean
  onClose: () => void
  feedTags: ShowTag[]
  allAvailableTags: ShowTag[]
  isAnonymous: boolean
  addTagToFeed: (tagId: string) => Promise<void>
  removeTagFromFeed: (tagId: string) => Promise<void>
  migrateAnonymousFeed: () => Promise<void>
}

export function FeedManagementModal({
  isOpen,
  onClose,
  feedTags,
  allAvailableTags,
  isAnonymous,
  addTagToFeed,
  removeTagFromFeed,
  migrateAnonymousFeed,
}: FeedManagementModalProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const followedTagIds = useMemo(() => new Set(feedTags.map(t => t.id)), [feedTags])

  const handleToggleTag = async (tag: ShowTag) => {
    if (followedTagIds.has(tag.id)) {
      await removeTagFromFeed(tag.id)
    } else {
      // Limit anonymous users to 10 tags
      if (isAnonymous && followedTagIds.size >= 10) {
        alert("Anonymous feeds are limited to 10 tags. Please sign up to follow more!")
        return
      }
      await addTagToFeed(tag.id)
    }
  }

  const handleSaveFeed = async () => {
    if (isAnonymous) {
      setIsAuthModalOpen(true)
    } else {
      onClose()
    }
  }

  const handleAuthSuccess = async () => {
    setIsAuthModalOpen(false)
    setIsSaving(true)
    await migrateAnonymousFeed()
    setIsSaving(false)
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Your Feed</DialogTitle>
            <DialogDescription>
              {isAnonymous
                ? `You are currently browsing anonymously. Your feed has ${followedTagIds.size} tags (max 10).`
                : `Your saved feed has ${followedTagIds.size} tags.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Current Feed Preview */}
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">Current Feed Tags ({followedTagIds.size})</h4>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {feedTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Start searching below to add tags.</p>
                ) : (
                  feedTags.map((tag) => (
                    <Badge 
                      key={tag.id} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-destructive/20 transition-colors" 
                      onClick={() => handleToggleTag(tag)}
                    >
                      #{tag.tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Tag Search */}
            <Command className="flex-1 overflow-hidden border rounded-lg">
              <CommandInput placeholder="Search for shows or episode tags..." />
              <CommandList className="flex-1 overflow-y-auto">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Available Show Tags">
                  {allAvailableTags.map((tag) => {
                    const isFollowed = followedTagIds.has(tag.id)
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.tag}
                        onSelect={() => handleToggleTag(tag)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">#{tag.tag}</span>
                          <span className="text-xs text-muted-foreground">{tag.name}</span>
                        </div>
                        <Button variant="ghost" size="icon-sm" className={cn(isFollowed ? "text-primary" : "text-muted-foreground")}>
                          {isFollowed ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {/* Footer / Save Button */}
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="mr-2">
              {isAnonymous ? "Continue Anonymously" : "Close"}
            </Button>
            {isAnonymous && (
              <Button onClick={handleSaveFeed} disabled={isSaving || followedTagIds.size === 0}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? "Saving..." : "Save Feed & Sign Up"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Auth Modal for Anonymous Save */}
      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleAuthSuccess} />}
    </>
  )
}