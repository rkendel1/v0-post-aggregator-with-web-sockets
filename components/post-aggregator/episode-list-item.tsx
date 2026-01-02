"use client"

import { useState } from "react"
import type { Post } from "@/lib/types"
import { useAudioPlayer } from "@/contexts/audio-player-context"
import { Button } from "@/components/ui/button"
import { Play, Pause, ExternalLink, MessageCircle } from "lucide-react"
import { format } from "date-fns"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SavePostButton } from "./save-post-button"
import { AddToQueueButton } from "./add-to-queue-button"
import { generateDiscordThreadName } from "@/lib/utils/slugs"
import { DiscordEmbedModal } from "./discord-embed-modal"

interface EpisodeListItemProps {
  episode: Post
  showTagSlug: string
  discordServerUrl?: string | null
}

export function EpisodeListItem({ episode, showTagSlug, discordServerUrl }: EpisodeListItemProps) {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer()
  const isCurrentlyPlaying = currentTrack?.id === episode.id
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false)

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent accordion from toggling
    if (isCurrentlyPlaying) {
      togglePlayPause()
    } else {
      playTrack(episode)
    }
  }

  // The title is the first line of the content, cleaned up.
  const title = episode.content.split('\n')[0].replace(`#${showTagSlug}`, '').trim()
  // The description is the rest of the content.
  const description = episode.content.split('\n').slice(1).join('\n').trim()

  // Generate Discord thread name for this episode
  const discordThreadName = generateDiscordThreadName(episode.created_at, title)
  
  // Generate Discord URL if we have a server URL and an episode slug
  const discordUrl = discordServerUrl && episode.episode_slug 
    ? `${discordServerUrl}?episode=${episode.episode_slug}`
    : discordServerUrl

  return (
    <AccordionItem value={episode.id} className="border rounded-lg overflow-hidden">
      <AccordionTrigger className="p-3 hover:bg-accent/50 transition-colors hover:no-underline data-[state=open]:bg-accent/50">
        <div className="flex items-center gap-4 overflow-hidden w-full">
          <Button variant="outline" size="icon" onClick={handlePlayClick} disabled={!episode.audio_url} className="flex-shrink-0">
            {isCurrentlyPlaying && isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Avatar className="h-12 w-12 rounded-md flex-shrink-0 hidden sm:flex">
            <AvatarImage src={episode.image_url || episode.author_avatar || undefined} />
            <AvatarFallback>{episode.author_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden text-left">
            <p className="font-medium truncate" title={title}>{title}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(episode.created_at), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 bg-accent/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <SavePostButton postId={episode.id} />
            {episode.audio_url && (
              <AddToQueueButton postId={episode.id} />
            )}
            {episode.external_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={episode.external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </a>
              </Button>
            )}
            {discordUrl && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDiscordModalOpen(true)}
                title={`Discuss: ${discordThreadName}`}
              >
                <MessageCircle className="h-4 w-4 mr-2 text-[#5865F2]" />
                Discord Discussion
              </Button>
            )}
          </div>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {description || "No description available for this episode."}
          </p>
        </div>
      </AccordionContent>

      {isDiscordModalOpen && discordUrl && (
        <DiscordEmbedModal
          isOpen={isDiscordModalOpen}
          onClose={() => setIsDiscordModalOpen(false)}
          discordUrl={discordUrl}
          serverName={`${title} Discussion`}
        />
      )}
    </AccordionItem>
  )
}