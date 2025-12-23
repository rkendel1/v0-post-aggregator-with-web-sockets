"use client"

import { useAudioPlayer } from "@/contexts/audio-player-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Rewind, FastForward } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AudioPlayer() {
  const { currentTrack, isPlaying, duration, currentTime, togglePlayPause, seek } = useAudioPlayer()

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="bg-card/95 backdrop-blur-sm">
        <CardContent className="p-3 flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={currentTrack.image_url || currentTrack.author_avatar || undefined} />
            <AvatarFallback>{currentTrack.author_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex flex-col gap-1">
            <p className="font-semibold text-sm truncate">{currentTrack.content.split('\n')[0]}</p>
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
        </CardContent>
      </Card>
    </div>
  )
}