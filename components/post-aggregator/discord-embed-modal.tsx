"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users } from "lucide-react"

interface DiscordEmbedModalProps {
  isOpen: boolean
  onClose: () => void
  discordUrl: string
  serverName?: string
}

/**
 * Extracts Discord server ID from various Discord URL formats
 * Supports: discord.gg/invite, discord.com/invite/code, discord.com/channels/serverid
 */
function extractDiscordServerId(url: string): string | null {
  try {
    // Handle discord.gg/invite-code format
    const inviteMatch = url.match(/discord\.gg\/([a-zA-Z0-9-]+)/)
    if (inviteMatch) {
      // For invite links, we can't extract server ID directly
      // We'll return the invite code to use with Discord's widget
      return inviteMatch[1]
    }

    // Handle discord.com/invite/code format
    const inviteMatch2 = url.match(/discord\.com\/invite\/([a-zA-Z0-9-]+)/)
    if (inviteMatch2) {
      return inviteMatch2[1]
    }

    // Handle discord.com/channels/server-id format
    const channelMatch = url.match(/discord\.com\/channels\/(\d+)/)
    if (channelMatch) {
      return channelMatch[1]
    }

    return null
  } catch (e) {
    console.error("Error parsing Discord URL:", e)
    return null
  }
}

export function DiscordEmbedModal({ isOpen, onClose, discordUrl, serverName }: DiscordEmbedModalProps) {
  const serverId = extractDiscordServerId(discordUrl)
  
  // Construct the Discord widget URL
  // Discord provides an embeddable widget at https://discord.com/widget
  const widgetUrl = serverId 
    ? `https://discord.com/widget?id=${serverId}&theme=dark`
    : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#5865F2]" />
            {serverName || "Discord Community"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg">
          {widgetUrl ? (
            <iframe
              src={widgetUrl}
              width="100%"
              height="100%"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              className="border-0 rounded-lg"
              title="Discord Widget"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Join the Discord Community</h3>
                <p className="text-muted-foreground mb-4">
                  Click the button below to join the Discord server in a new window.
                </p>
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-[#5865F2] text-white hover:bg-[#4752C4] h-10 py-2 px-4"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Open Discord
                </a>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
