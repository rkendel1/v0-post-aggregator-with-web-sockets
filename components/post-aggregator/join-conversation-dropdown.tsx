"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageCircle, Users, ExternalLink } from "lucide-react"
import type { ShowCommunityLink } from "@/lib/types"
import { DiscordEmbedModal } from "./discord-embed-modal"

interface JoinConversationDropdownProps {
  communityLinks: ShowCommunityLink[]
  showName?: string
}

export function JoinConversationDropdown({ communityLinks, showName }: JoinConversationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDiscord, setSelectedDiscord] = useState<ShowCommunityLink | null>(null)

  // Filter for Discord links
  const discordLinks = communityLinks.filter(
    link => link.platform.toLowerCase() === 'discord' || link.is_discord
  )

  // Other community links
  const otherLinks = communityLinks.filter(
    link => link.platform.toLowerCase() !== 'discord' && !link.is_discord
  )

  if (communityLinks.length === 0) {
    return null
  }

  return (
    <>
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Join the conversation
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {discordLinks.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Discord Communities
            </DropdownMenuLabel>
            {discordLinks.map((link) => (
              <DropdownMenuItem 
                key={link.id}
                onClick={() => {
                  setSelectedDiscord(link)
                  setIsOpen(false)
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users className="h-4 w-4 text-[#5865F2]" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{link.name}</div>
                  {link.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {link.description}
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {otherLinks.length > 0 && (
          <>
            {discordLinks.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Other Communities
            </DropdownMenuLabel>
            {otherLinks.map((link) => (
              <DropdownMenuItem key={link.id} asChild>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Users className="h-4 w-4" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{link.name}</div>
                    {link.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {link.description}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </a>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    
    {selectedDiscord && (
      <DiscordEmbedModal
        isOpen={true}
        onClose={() => setSelectedDiscord(null)}
        discordUrl={selectedDiscord.url}
        serverName={selectedDiscord.name}
      />
    )}
  </>
  )
}
