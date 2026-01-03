"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

/**
 * Custom hook for managing Supabase Realtime subscriptions with automatic cleanup.
 * This hook ensures that subscriptions are properly unsubscribed when the component
 * unmounts or when dependencies change, preventing memory leaks.
 * 
 * @param channelName - Unique name for the channel
 * @param callback - Function to set up the subscription on the channel
 * @param deps - Dependencies array that triggers re-subscription when changed
 * @param enabled - Optional flag to enable/disable the subscription (default: true)
 * 
 * @example
 * useRealtimeSubscription(
 *   `posts:${postId}`,
 *   (channel) => {
 *     return channel.on(
 *       "postgres_changes",
 *       { event: "INSERT", schema: "public", table: "posts" },
 *       handleInsert
 *     )
 *   },
 *   [postId]
 * )
 */
export function useRealtimeSubscription(
  channelName: string,
  callback: (channel: RealtimeChannel) => RealtimeChannel,
  deps: React.DependencyList = [],
  enabled: boolean = true
) {
  const supabaseRef = useRef(createClient())
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = supabaseRef.current

    // Create and subscribe to channel
    const channel = callback(supabase.channel(channelName))
    channel.subscribe()
    channelRef.current = channel

    // Cleanup function to remove channel
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, ...deps])
}
