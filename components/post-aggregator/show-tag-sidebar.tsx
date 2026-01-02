"use client"

import type { ShowTag, UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { TrendingUp, ListPlus, LayoutGrid, ListMusic, Bookmark, ExternalLink } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface ShowTagSidebarProps {
  feedTags: ShowTag[]
  selectedFeedId: string | "all" | null
  profile: UserProfile | null
  onSelectFeed: (id: string | "all") => void
  onOpenManager: () => void
}

export function ShowTagSidebar({
  feedTags,
  selectedFeedId,
  profile,
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
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        {profile ? (
          <Link href="/settings" className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>{profile.display_name?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{profile.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
            </div>
          </Link>
        ) : (
          <Logo />
        )}
      </div>

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
          {feedTags.length > 0 && (
            <Button
              variant={selectedFeedId === "all" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onSelectFeed("all")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              All Feeds
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/queue">
              <ListMusic className="h-4 w-4 mr-2" />
              My Queue
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/saved">
              <Bookmark className="h-4 w-4 mr-2" />
              Saved Posts
            </Link>
          </Button>

          {feedTags.length === 0 ? (
            <div className="p-2 text-center text-xs text-muted-foreground">
              No tags in your feed. Click the icon above to add some!
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={["Comedy"]} className="w-full">
              {categories.map((category) => (
                <AccordionItem value={category} key={category}>
                  <AccordionTrigger className="px-2 py-1 text-xs font-semibold text-muted-foreground tracking-wider uppercase hover:no-underline">
                    {category}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      {groupedTags[category].map((tag) => {
                        const subdomain = tag.subdomain_mappings?.[0]?.subdomain || tag.tag.toLowerCase()
                        const href = `https://${subdomain}.${rootDomain}`
                        return (
                          <Button
                            asChild
                            key={tag.id}
                            variant="ghost"
                            className="w-full justify-start font-mono h-auto py-1.5 text-left min-w-0"
                          >
                            <Link href={href}>
                              <div className="flex flex-col items-start overflow-hidden">
                                <span className="font-bold truncate">#{tag.tag}</span>
                                <span className="text-xs text-muted-foreground font-sans whitespace-normal text-left">
                                  {tag.name}
                                </span>
                              </div>
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}