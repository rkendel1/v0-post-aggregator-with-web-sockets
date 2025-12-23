"use client"

import { useAudioPlayer } from "@/contexts/audio-player-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Rewind, FastForward, X, Share2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SavePostButton } from "@/components/post-aggregator/save-post-button"
import toast from "react-hot-toast"
import Link from "next/link"

export function AudioPlayer() {
  const { currentTrack, isPlaying, duration, currentTime, togglePlayPause, seek, closePlayer } = useAudioPlayer()

  if (!currentTrack) {
    return null
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`
  }

  const handleSeek = (value: number[]) => {
    seek(value[0])
  }

  const handleRewind = () => {
    seek(Math.max(0, currentTime - 15))
  }

  const handleFastForward = () => {
    seek(Math.min(duration, currentTime + 15))
  }

  const handleShare = () => {
    const postUrl = currentTrack.external_url || `${window.location.origin}/post/${currentTrack.id}`
    navigator.clipboard.writeText(postUrl)
    toast.success("Post link copied to clipboard!")
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="bg-card/95 backdrop-blur-sm">
        <CardContent className="p-3 flex items-center gap-4">
          <Link href={currentTrack.show_tags ? `/show/${currentTrack.show_tags.tag}` : "#"}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={currentTrack.image_url || currentTrack.author_avatar || undefined} />
              <AvatarFallback>{currentTrack.author_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 flex flex-col gap-1 overflow-hidden">
            <Link href={currentTrack.show_tags ? `/show/${currentTrack.show_tags.tag}` : "#"}>
              <p className="font-semibold text-sm truncate hover:underline">{currentTrack.content.split('\n')[0]}</p>
            </Link>
            <p className="text-xs text-muted-foreground">{currentTrack.author_name}</p>
          </div>
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-xs text-muted-foreground w-10 text-center">{formatTime(currentTime)}</span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-center">{formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRewind}>
              <Rewind className="h-5 w-5" />
            </Button>
            <Button variant="default" size="icon" onClick={togglePlayPause}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleFastForward}>
              <FastForward className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 border-l pl-2 ml-2">
            <SavePostButton postId={currentTrack.id} showText={false} />
            <Button variant="ghost" size="icon-sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={closePlayer}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}