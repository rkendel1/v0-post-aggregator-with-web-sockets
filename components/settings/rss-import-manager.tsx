"use client"

import { useState, useMemo } from "react"
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

interface RssImportManagerProps {
  initialRssFeeds: UserRssFeed[]
}

// Hardcoded Edge Function URL structure
const EDGE_FUNCTION_URL = `https://bbjlqpsvdjaobcjuvbag.supabase.co/functions/v1/import-rss`

export function RssImportManager({ initialRssFeeds }: RssImportManagerProps) {
  const [rssFeeds, setRssFeeds] = useState(initialRssFeeds)
  const [singleRssUrl, setSingleRssUrl] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleImportRss = async (urls: string[]) => {
    if (urls.length === 0) return

    setIsImporting(true)
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
      const skippedImports = data.results.filter((r: any) => r.status === 'skipped')

      if (successfulImports.length > 0) {
        toast.success(`Successfully imported ${successfulImports.length} feed${successfulImports.length > 1 ? 's' : ''}.`)
      }
      if (failedImports.length > 0) {
        toast.error(`Failed to import ${failedImports.length} feed${failedImports.length > 1 ? 's' : ''}.`)
      }
      if (skippedImports.length > 0) {
        toast(`Skipped ${skippedImports.length} feed${skippedImports.length > 1 ? 's' : ''} (already imported).`, { icon: '⚠️' })
      }

      // Refresh data from server to get newly inserted feeds
      router.refresh()

    } catch (error) {
      console.error("Import error:", error)
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      toast.dismiss(loadingToast)
      setIsImporting(false)
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
      {/* RSS Import Card */}
      <Card>
        <CardHeader>
          <CardTitle>RSS Feed Import</CardTitle>
          <CardDescription>Import your podcast subscriptions via OPML file or a single RSS URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OPML Upload */}
          <div className="space-y-2 border p-4 rounded-lg">
            <Label htmlFor="opml-upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import via OPML File
            </Label>
            <Input 
              id="opml-upload" 
              type="file" 
              accept=".opml" 
              onChange={handleOpmlUpload} 
              disabled={isImporting}
            />
            <p className="text-xs text-muted-foreground">Upload an OPML file exported from your podcast app (e.g., Pocket Casts, Overcast).</p>
          </div>

          {/* Single RSS Paste */}
          <form onSubmit={handleSingleRssSubmit} className="space-y-2 border p-4 rounded-lg">
            <Label htmlFor="single-rss" className="flex items-center gap-2">
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

      {/* Imported Feeds List */}
      <Card>
        <CardHeader>
          <CardTitle>My Imported Feeds ({rssFeeds.length})</CardTitle>
          <CardDescription>These feeds are actively monitored for new episodes and discussions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rssFeeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RSS feeds imported yet.</p>
          ) : (
            rssFeeds.map((feed) => (
              <div key={feed.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex flex-col">
                  <div className="font-medium">{feed.title}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-xs">{feed.rss_url}</div>
                  <Badge variant="outline" className="mt-1 w-fit text-[10px] h-4">
                    Last Synced: {feed.last_fetched_at ? new Date(feed.last_fetched_at).toLocaleDateString() : 'Never'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={isImporting} title="Manually Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteFeed(feed.id)} disabled={isImporting} title="Remove Feed">
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