"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Link2, Loader2, Trash2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { parseOpml } from "@/lib/utils/opml-parser"
import { UserRssFeed } from "@/lib/types"
import toast from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface RssImportManagerProps {
  initialRssFeeds: UserRssFeed[]
}

// Hardcoded Edge Function URL structure
const EDGE_FUNCTION_URL = `https://bbjlqpsvdjaobcjuvbag.supabase.co/functions/v1/import-rss`

export function RssImportManager({ initialRssFeeds }: RssImportManagerProps) {
  const [rssFeeds, setRssFeeds] = useState(initialRssFeeds)
  const [singleRssUrl, setSingleRssUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [refreshingFeedId, setRefreshingFeedId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setRssFeeds(initialRssFeeds)
  }, [initialRssFeeds])

  const handleImportRss = async (urls: string[], feedIdToRefresh?: string) => {
    if (urls.length === 0) return

    if (feedIdToRefresh) {
      setRefreshingFeedId(feedIdToRefresh)
    } else {
      setIsImporting(true)
    }
    
    const loadingToast = toast.loading(`Importing ${urls.length} feed${urls.length > 1 ? 's' : ''}...`)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("You must be logged in to import feeds.")
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ rssUrls: urls }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to process feeds.")
      }

      const successfulImports = data.results.filter((r: any) => r.status === 'success')
      const failedImports = data.results.filter((r: any) => r.status === 'failed')
      
      if (successfulImports.length > 0) {
        toast.success(`Successfully imported ${successfulImports.length} feed${successfulImports.length > 1 ? 's' : ''}.`)
        router.refresh() // Refresh the page to show new feeds
      }
      if (failedImports.length > 0) {
        toast.error(`Failed to import ${failedImports.length} feed${failedImports.length > 1 ? 's' : ''}.`)
      }

    } catch (error) {
      console.error("Import error:", error)
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      toast.dismiss(loadingToast)
      setIsImporting(false)
      setRefreshingFeedId(null)
      setSingleRssUrl("")
    }
  }

  const handleOpmlUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const xmlContent = e.target?.result as string
      try {
        const feeds = parseOpml(xmlContent)
        const urls = feeds.map(f => f.url)
        handleImportRss(urls)
      } catch (error) {
        toast.error("Failed to parse OPML file.")
        console.error("OPML parsing error:", error)
      }
    }
    reader.readAsText(file)
  }

  const handleSingleRssSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (singleRssUrl.trim()) {
      handleImportRss([singleRssUrl.trim()])
    }
  }

  const handleDeleteFeed = async (feedId: string) => {
    const loadingToast = toast.loading("Removing feed...")
    const { error } = await supabase.from("user_rss_feeds").delete().eq("id", feedId)

    if (!error) {
      setRssFeeds(rssFeeds.filter(feed => feed.id !== feedId))
      toast.success("Feed removed.")
    } else {
      toast.error("Failed to remove feed.")
    }
    toast.dismiss(loadingToast)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Sources</CardTitle>
          <CardDescription>Import and manage your podcast subscriptions via RSS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OPML Upload */}
          <div className="space-y-2 border p-4 rounded-lg">
            <Label htmlFor="opml-upload" className="flex items-center gap-2 font-medium">
              <Upload className="h-4 w-4" /> Import via OPML File
            </Label>
            <Input 
              id="opml-upload" 
              type="file" 
              accept=".opml" 
              onChange={handleOpmlUpload} 
              disabled={isImporting}
            />
            <p className="text-xs text-muted-foreground">Upload an OPML file from your podcast app (e.g., Pocket Casts, Overcast).</p>
          </div>

          {/* Single RSS Paste */}
          <form onSubmit={handleSingleRssSubmit} className="space-y-2 border p-4 rounded-lg">
            <Label htmlFor="single-rss" className="flex items-center gap-2 font-medium">
              <Link2 className="h-4 w-4" /> Import Single RSS URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="single-rss"
                placeholder="Paste RSS feed URL here"
                value={singleRssUrl}
                onChange={(e) => setSingleRssUrl(e.target.value)}
                disabled={isImporting}
              />
              <Button type="submit" disabled={isImporting || !singleRssUrl.trim()}>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Imported Feeds ({rssFeeds.length})</CardTitle>
          <CardDescription>This is the list of all your connected podcast feeds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rssFeeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RSS feeds imported yet.</p>
          ) : (
            rssFeeds.map((feed) => (
              <div key={feed.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex flex-col overflow-hidden">
                  <div className="font-medium truncate">{feed.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{feed.rss_url}</div>
                  <Badge variant="outline" className="mt-1 w-fit text-[10px] h-4">
                    Last Synced: {feed.last_fetched_at ? `${formatDistanceToNow(new Date(feed.last_fetched_at))} ago` : 'Never'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={isImporting || !!refreshingFeedId} 
                    title="Manually Refresh"
                    onClick={() => handleImportRss([feed.rss_url], feed.id)}
                  >
                    {refreshingFeedId === feed.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteFeed(feed.id)} disabled={isImporting || !!refreshingFeedId} title="Remove Feed">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}