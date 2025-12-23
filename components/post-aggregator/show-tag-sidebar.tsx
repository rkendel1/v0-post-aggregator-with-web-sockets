"use client"

import type { ShowTag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { TrendingUp, ListPlus, Rss, LayoutGrid, ListMusic, ExternalLink } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

interface ShowTagSidebarProps {
  feedTags: ShowTag[]
  selectedFeedId: string | "all" | null
  onSelectFeed: (id: string | "all") => void
  onOpenManager: () => void
}

export function ShowTagSidebar({
  feedTags,
  selectedFeedId,
  onSelectFeed,
  onOpenManager,
}: ShowTagSidebarProps) {
  const groupedTags = feedTags.reduce(
    (acc, tag) => {
      const category = tag.category || "Uncategorized"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(tag)
      return acc
    },
    {} as Record<string, ShowTag[]>,
  )

  const categories = Object.keys(groupedTags).sort((a, b) => {
    if (a === "RSS Imports") return 1
    if (b === "RSS Imports") return -1
    if (a === "Uncategorized") return 1
    if (b === "Uncategorized") return -1
    return a.localeCompare(b)
  })

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "podbridge.app"

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
          <div className="flex items-center">
            <Button asChild variant="ghost" size="icon-sm" title="Import & Manage Sources">
              <Link href="/settings">
                <Rss className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onOpenManager} title="Manage Feed">
              <ListPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Followed shows and episodes</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/queue">
              <ListMusic className="h-4 w-4 mr-2" />
              My Queue
            </Link>
          </Button>

          {feedTags.length === 0 ? (
            <div className="p-2 text-center text-xs text-muted-foreground">
              No tags in your feed. Click the icon above to add some!
            </div>
          ) : (
            <>
              <Button
                variant={selectedFeedId === "all" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => onSelectFeed("all")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                All Feeds
              </Button>
              <div className="pt-2">
                {categories.map((category) => (
                  <div key={category} className="space-y-1">
                    <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      {category}
                    </h3>
                    {groupedTags[category].map((tag) => (
                      <div key={tag.id} className="flex items-center w-full group pr-2">
                        <Button
                          variant={selectedFeedId === tag.id ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start font-mono h-auto py-1.5 text-left",
                            selectedFeedId === tag.id && "bg-secondary",
                          )}
                          onClick={() => onSelectFeed(tag.id)}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-bold">#{tag.tag}</span>
                            <span className="text-xs text-muted-foreground font-sans whitespace-normal text-left">
                              {tag.name}
                            </span>
                          </div>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <a href={`https://${tag.tag.toLowerCase()}.${rootDomain}`} target="_blank" rel="noopener noreferrer" title={`Go to #${tag.tag} page`}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}