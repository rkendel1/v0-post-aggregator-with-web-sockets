"use client"

import type { Post } from "@/lib/types"
import { useAudioPlayer } from "@/contexts/audio-player-context"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { format } from "date-fns"

interface EpisodeListItemProps {
  episode: Post
  showTagSlug: string
}

export function EpisodeListItem({ episode, showTagSlug }: EpisodeListItemProps) {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer()
  const isCurrentlyPlaying = currentTrack?.id === episode.id

  const handlePlayClick = () => {
    if (isCurrentlyPlaying) {
      togglePlayPause()
    } else {
      playTrack(episode)
    }
  }

  // A simple way to clean up the title from the post content
  const episodeTitle = episode.content.split('\n')[0].replace(`#${showTagSlug}`, '').trim()

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4 overflow-hidden">
        <Button variant="outline" size="icon" onClick={handlePlayClick} disabled={!episode.audio_url} className="flex-shrink-0">
          {isCurrentlyPlaying && isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <div className="overflow-hidden">
          <p className="font-medium truncate" title={episodeTitle}>{episodeTitle}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(episode.created_at), "MMMM d, yyyy")}
          </p>
        </div>
      </div>
    </div>
  )
}