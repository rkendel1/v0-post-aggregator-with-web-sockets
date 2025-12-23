"use client"

import { useState, useMemo } from "react"
import type { ShowTag, UserProfile } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk"
import { Check, Plus, X, Save, Loader2, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthModal } from "@/components/auth/auth-modal"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface FeedManagementModalProps {
  isOpen: boolean
  onClose: () => void
  feedTags: ShowTag[]
  allAvailableTags: ShowTag[]
  isAnonymous: boolean
  profile: UserProfile | null
  addTagToFeed: (tagId: string) => Promise<void>
  removeTagFromFeed: (tagId: string) => Promise<void>
  migrateAnonymousFeed: () => Promise<void>
  addNewAvailableTag: (tag: ShowTag) => void
}

export function FeedManagementModal({
  isOpen,
  onClose,
  feedTags,
  allAvailableTags,
  isAnonymous,
  profile,
  addTagToFeed,
  removeTagFromFeed,
  migrateAnonymousFeed,
  addNewAvailableTag,
}: FeedManagementModalProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const supabase = createClient()

  const followedTagIds = useMemo(() => new Set(feedTags.map((t) => t.id)), [feedTags])
  const existingTagNames = useMemo(() => new Set(allAvailableTags.map((t) => t.tag.toLowerCase())), [allAvailableTags])

  const categories = useMemo(() => {
    const cats = [...new Set(allAvailableTags.map((t) => t.category || "Uncategorized"))]
    cats.sort((a, b) => {
      if (a === "Uncategorized") return 1
      if (b === "Uncategorized") return -1
      return a.localeCompare(b)
    })
    return ["All", ...cats]
  }, [allAvailableTags])

  const tagsToDisplay = useMemo(() => {
    if (activeTab === "All") {
      return allAvailableTags
    }
    return allAvailableTags.filter((tag) => (tag.category || "Uncategorized") === activeTab)
  }, [allAvailableTags, activeTab])

  const handleToggleTag = async (tag: ShowTag) => {
    if (followedTagIds.has(tag.id)) {
      await removeTagFromFeed(tag.id)
    } else {
      if (isAnonymous && followedTagIds.size >= 10) {
        toast.error("Anonymous feeds are limited to 10 tags. Please sign up to follow more!")
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

  const handleCreateTag = async (newTag: string) => {
    if (isAnonymous) {
      toast.error("Please sign up to create new tags.")
      setIsAuthModalOpen(true)
      return
    }
    if (!profile?.username) {
      toast.error("Please complete your profile setup to create tags.")
      onClose()
      return
    }

    const normalizedTag = newTag.trim()
    if (existingTagNames.has(normalizedTag.toLowerCase())) {
      toast.error(`Tag #${normalizedTag} already exists.`)
      return
    }

    setIsSaving(true)
    const loadingToast = toast.loading(`Creating tag #${normalizedTag}...`)

    try {
      const { data: newTagData, error: tagError } = await supabase
        .from("show_tags")
        .insert({
          tag: normalizedTag,
          name: `User Created Tag: ${normalizedTag}`,
          category: "User Created",
        })
        .select()
        .single()

      if (tagError) throw tagError

      addNewAvailableTag(newTagData as ShowTag)
      await addTagToFeed(newTagData.id)

      toast.success(`Tag #${normalizedTag} created and added to your feed!`)
      setSearch("")
    } catch (error) {
      console.error("Error creating tag:", error)
      toast.error(`Failed to create tag: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      toast.dismiss(loadingToast)
      setIsSaving(false)
    }
  }

  const showCreateOption = search.trim() && !existingTagNames.has(search.trim().toLowerCase())

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

            <Command className="flex-1 overflow-hidden flex flex-col">
              <CommandInput
                placeholder={`Search in ${activeTab}...`}
                value={search}
                onValueChange={setSearch}
              />

              <Tabs defaultValue="All" onValueChange={setActiveTab} className="mt-2">
                <ScrollArea className="w-full whitespace-nowrap">
                  <TabsList>
                    {categories.map((category) => (
                      <TabsTrigger key={category} value={category}>
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </Tabs>

              <CommandList className="flex-1 overflow-y-auto mt-2 border rounded-lg">
                <CommandEmpty>
                  {showCreateOption ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-2"
                      onClick={() => handleCreateTag(search.trim())}
                      disabled={isSaving}
                    >
                      <Hash className="h-4 w-4 mr-2" />
                      Create and follow new tag: <span className="font-bold ml-1">#{search.trim()}</span>
                    </Button>
                  ) : (
                    "No results found."
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {tagsToDisplay.map((tag) => {
                    const isFollowed = followedTagIds.has(tag.id)
                    return (
                      <CommandItem
                        key={tag.id}
                        value={`${tag.tag} ${tag.name}`}
                        onSelect={() => handleToggleTag(tag)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">#{tag.tag}</span>
                          <span className="text-xs text-muted-foreground">{tag.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className={cn(isFollowed ? "text-primary" : "text-muted-foreground")}
                        >
                          {isFollowed ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="mr-2">
              {isAnonymous ? "Continue Anonymously" : "Close"}
            </Button>
            {isAnonymous && (
              <Button onClick={handleSaveFeed} disabled={isSaving || followedTagIds.size === 0}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isSaving ? "Saving..." : "Save Feed & Sign Up"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isAuthModalOpen && (
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleAuthSuccess} />
      )}
    </>
  )
}