"use client"

import { createContext, useContext, useState, useRef, ReactNode } from "react"
import type { Post } from "@/lib/types"

interface AudioPlayerState {
  currentTrack: Post | null
  isPlaying: boolean
  duration: number
  currentTime: number
  playTrack: (track: Post) => void
  togglePlayPause: () => void
  seek: (time: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerState | undefined>(undefined)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Post | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playTrack = (track: Post) => {
    if (audioRef.current) {
      if (currentTrack?.id === track.id) {
        togglePlayPause()
      } else {
        setCurrentTrack(track)
        audioRef.current.src = track.audio_url || ""
        audioRef.current.play().then(() => setIsPlaying(true))
      }
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    // Future: Implement play next in queue
  }

  return (
    <AudioPlayerContext.Provider value={{ currentTrack, isPlaying, duration, currentTime, playTrack, togglePlayPause, seek }}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider")
  }
  return context
}