"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { FederatedPost } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ExternalLink, CheckCircle2, Clock, XCircle } from "lucide-react"

interface FederatedPostStatusProps {
  postId: string
}

export function FederatedPostStatus({ postId }: FederatedPostStatusProps) {
  const [federatedPosts, setFederatedPosts] = useState<FederatedPost[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchFederatedPosts = async () => {
      const { data } = await supabase
        .from("federated_posts")
        .select(`
          *,
          connected_accounts (
            *,
            platforms (*)
          )
        `)
        .eq("local_post_id", postId)

      if (data) {
        setFederatedPosts(data as FederatedPost[])
      }
    }

    fetchFederatedPosts()

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`federated_posts:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "federated_posts",
          filter: `local_post_id=eq.${postId}`,
        },
        () => {
          fetchFederatedPosts()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, supabase])

  if (federatedPosts.length === 0) return null

  const publishedCount = federatedPosts.filter((fp) => fp.status === "published").length
  const pendingCount = federatedPosts.filter((fp) => fp.status === "pending").length
  const failedCount = federatedPosts.filter((fp) => fp.status === "failed").length

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
          <ExternalLink className="h-3 w-3" />
          {publishedCount > 0 && <span>Posted to {publishedCount}</span>}
          {pendingCount > 0 && <Clock className="h-3 w-3 text-muted-foreground" />}
          {failedCount > 0 && <XCircle className="h-3 w-3 text-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Federation Status</h4>
          <div className="space-y-2">
            {federatedPosts.map((fp) => (
              <div key={fp.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span>{fp.connected_accounts?.platforms?.icon}</span>
                  <span className="text-sm">{fp.connected_accounts?.platforms?.display_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {fp.status === "published" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {fp.external_url && (
                        <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                          <a href={fp.external_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </>
                  )}
                  {fp.status === "pending" && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {fp.status === "failed" && (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
