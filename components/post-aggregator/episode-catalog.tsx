"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Post } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { EpisodeListItem } from "./episode-list-item"

interface EpisodeCatalogProps {
  showTagId: string
  showTagSlug: string
}

const EPISODES_PER_PAGE = 25

export function EpisodeCatalog({ showTagId, showTagSlug }: EpisodeCatalogProps) {
  const [episodes, setEpisodes] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [supabase] = useState(() => createClient())

  const fetchEpisodes = useCallback(async (currentOffset: number) => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("show_tag_id", showTagId)
      .not("audio_url", "is", null)
      .order("created_at", { ascending: false })
      .range(currentOffset, currentOffset + EPISODES_PER_PAGE - 1)

    if (error) {
      console.error("Error fetching episodes:", error)
      setHasMore(false)
    } else if (data) {
      setEpisodes((prev) => (currentOffset === 0 ? data : [...prev, ...data]))
      setOffset(currentOffset + data.length)
      if (data.length < EPISODES_PER_PAGE) {
        setHasMore(false)
      }
    }
    setIsLoading(false)
  }, [showTagId, supabase])

  useEffect(() => {
    setEpisodes([])
    setOffset(0)
    setHasMore(true)
    fetchEpisodes(0)
  }, [fetchEpisodes])

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchEpisodes(offset)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {episodes.map((episode) => (
          <EpisodeListItem key={episode.id} episode={episode} showTagSlug={showTagSlug} />
        ))}
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && hasMore && (
          <div className="flex justify-center py-4">
            <Button onClick={loadMore} variant="outline">Load More Episodes</Button>
          </div>
        )}
        {!isLoading && episodes.length === 0 && (
            <div className="text-center py-10">
                <p className="text-muted-foreground">No playable episodes found for this show yet.</p>
            </div>
        )}
      </div>
    </ScrollArea>
  )
}