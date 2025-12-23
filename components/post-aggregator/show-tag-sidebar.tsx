"use client"

import type { ShowTag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { TrendingUp, ListPlus } from "lucide-react"
import { Logo } from "@/components/logo"

interface ShowTagSidebarProps {
  feedTags: ShowTag[]
  selectedTag: ShowTag | null
  onSelectTag: (tag: ShowTag) => void
  onOpenManager: () => void
}

export function ShowTagSidebar({ feedTags, selectedTag, onSelectTag, onOpenManager }: ShowTagSidebarProps) {
  return (
    <div className="w-64 border-r bg-card flex flex-col">
      {/* Logo Header */}
      <div className="p-4 border-b">
        <Logo />
      </div>
      
      {/* Feed Management Section */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">My Feed</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onOpenManager} title="Manage Feed">
            <ListPlus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Followed shows and episodes</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {feedTags.length === 0 ? (
            <div className="p-2 text-center text-xs text-muted-foreground">
              No tags in your feed. Click the icon above to add some!
            </div>
          ) : (
            feedTags.map((tag) => (
              <Button
                key={tag.id}
                variant={selectedTag?.id === tag.id ? "secondary" : "ghost"}
                className={cn("w-full justify-start font-mono", selectedTag?.id === tag.id && "bg-secondary")}
                onClick={() => onSelectTag(tag)}
              >
                <span className="font-bold mr-2">#{tag.tag}</span>
                <span className="text-xs text-muted-foreground truncate">{tag.name}</span>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}