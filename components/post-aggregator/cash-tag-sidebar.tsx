"use client"

import type { CashTag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { TrendingUp } from "lucide-react"

interface CashTagSidebarProps {
  cashTags: CashTag[]
  selectedTag: CashTag | null
  onSelectTag: (tag: CashTag) => void
}

export function CashTagSidebar({ cashTags, selectedTag, onSelectTag }: CashTagSidebarProps) {
  return (
    <div className="w-64 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Cash Tags</h2>
        </div>
        <p className="text-xs text-muted-foreground">Follow communities by tag</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {cashTags.map((tag) => (
            <Button
              key={tag.id}
              variant={selectedTag?.id === tag.id ? "secondary" : "ghost"}
              className={cn("w-full justify-start font-mono", selectedTag?.id === tag.id && "bg-secondary")}
              onClick={() => onSelectTag(tag)}
            >
              <span className="font-bold mr-2">${tag.tag}</span>
              <span className="text-xs text-muted-foreground truncate">{tag.name}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
