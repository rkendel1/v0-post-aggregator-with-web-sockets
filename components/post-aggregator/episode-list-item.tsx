"use client"

import type { Post } from "@/lib/types"
import { useAudioPlayer } from "@/contexts/audio-player-context"
import { Button } from "@/components/ui/button"
import { Play, Pause, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SavePostButton } from "./save-post-button"

interface EpisodeListItemProps {
  episode: Post
  showTagSlug: string
}

export function EpisodeListItem({ episode, showTagSlug }: EpisodeListItemProps) {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer()
  const isCurrentlyPlaying = currentTrack?.id === episode.id

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
          <div className="flex items-center gap-2">
            <SavePostButton postId={episode.id} />
            {episode.external_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={episode.external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </a>
              </Button>
            )}
          </div>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {description || "No description available for this episode."}
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}