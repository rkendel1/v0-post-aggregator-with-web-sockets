"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, HashtagMapping } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { Loader2, Pencil, Trash2, PlusCircle } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Add the new type for our global RSS feeds
interface ShowRssFeed {
  rss_url: string
}

// Update ShowTag to include the new feed type
type ShowTagWithFeeds = ShowTag & {
  show_rss_feeds: ShowRssFeed[]
}

interface AdminDashboardProps {
  initialTags: ShowTagWithFeeds[]
  initialMappings: HashtagMapping[]
}

type EditableTag = Partial<ShowTagWithFeeds> & { subdomain?: string | null; rss_urls?: string[] }

export function AdminDashboard({ initialTags, initialMappings }: AdminDashboardProps) {
  const [tags, setTags] = useState<ShowTagWithFeeds[]>(initialTags)
  const [mappings, setMappings] = useState<HashtagMapping[]>(initialMappings)
  const [isEditing, setIsEditing] = useState(false)
  const [currentTag, setCurrentTag] = useState<EditableTag | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [supabase] = useState(() => createClient())

  const canonicalTags = useMemo(() => tags.filter(tag => !tag.parent_tag_id), [tags])

  const tagOptions = useMemo(() => {
    return canonicalTags
      .filter(tag => tag.id !== currentTag?.id)
      .map(tag => ({ value: tag.id, label: `#${tag.tag} (${tag.name})` }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [canonicalTags, currentTag])

  const handleEdit = (tag: ShowTagWithFeeds) => {
    const subdomain = tag.subdomain_mappings && tag.subdomain_mappings.length > 0 ? tag.subdomain_mappings[0].subdomain : ""
    const rss_urls = tag.show_rss_feeds ? tag.show_rss_feeds.map(f => f.rss_url) : []
    setCurrentTag({ ...tag, subdomain, rss_urls })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!currentTag) return
    setIsSaving(true)

    const isNew = !currentTag.id

    try {
      let savedTag: ShowTag;
      if (isNew) {
        const { data, error } = await supabase
          .from("show_tags")
          .insert({
            tag: currentTag.tag!,
            name: currentTag.name!,
            parent_tag_id: currentTag.parent_tag_id || null,
          })
          .select()
          .single()
        if (error) throw error
        savedTag = data
      } else {
        const { data, error } = await supabase
          .from("show_tags")
          .update({
            name: currentTag.name,
            parent_tag_id: currentTag.parent_tag_id || null,
          })
          .eq("id", currentTag.id!)
          .select()
          .single()
        if (error) throw error
        savedTag = data
      }

      // Handle subdomain
      const newSubdomain = currentTag.subdomain?.trim() || null
      await supabase.from('subdomain_mappings').delete().eq('show_tag_id', savedTag.id)
      if (newSubdomain) {
        const { error: subdomainError } = await supabase
          .from('subdomain_mappings')
          .insert({ subdomain: newSubdomain, show_tag_id: savedTag.id })
        if (subdomainError) throw new Error(`Subdomain '${newSubdomain}' is already taken or invalid.`)
      }

      // Handle Official RSS feeds
      const rssUrls = currentTag.rss_urls?.map(url => url.trim()).filter(Boolean) || []
      await supabase.from('show_rss_feeds').delete().eq('show_tag_id', savedTag.id)
      if (rssUrls.length > 0) {
        const newFeeds = rssUrls.map(url => ({ rss_url: url, show_tag_id: savedTag.id }))
        const { error: feedError } = await supabase.from('show_rss_feeds').insert(newFeeds)
        if (feedError) throw new Error(`Failed to save RSS feeds: ${feedError.message}`)
      }

      toast.success(`Tag ${isNew ? 'created' : 'updated'} successfully. The system will poll for new episodes shortly.`)
      await refreshData()
      setIsEditing(false)
      setCurrentTag(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (tagId: string) => {
    const loadingToast = toast.loading("Deleting tag...")
    try {
      const { error } = await supabase.from("show_tags").delete().eq("id", tagId)
      if (error) throw error
      toast.success("Tag deleted.")
      setTags(current => current.filter(t => t.id !== tagId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tag.")
    } finally {
      toast.dismiss(loadingToast)
    }
  }

  const refreshData = async () => {
    const [tagsResult, mappingsResult] = await Promise.all([
      supabase
        .from("show_tags")
        .select("*, show_rss_feeds(rss_url), subdomain_mappings(subdomain)")
        .order("tag", { ascending: true }),
      supabase
        .from("hashtag_mappings")
        .select("*, show_tags(*)")
        .order("hashtag", { ascending: true }),
    ])
    setTags((tagsResult.data as ShowTagWithFeeds[]) || [])
    setMappings((mappingsResult.data as HashtagMapping[]) || [])
  }

  const getParentTag = (parentId: string | null | undefined) => {
    if (!parentId) return null
    return tags.find(t => t.id === parentId)
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <Tabs defaultValue="tags">
        <TabsList>
          <TabsTrigger value="tags">Show Tags</TabsTrigger>
          <TabsTrigger value="mappings">Hashtag Mappings</TabsTrigger>
        </TabsList>
        <TabsContent value="tags" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setCurrentTag({ tag: '', name: '', parent_tag_id: null, subdomain: '', rss_urls: [] }); setIsEditing(true) }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Tag
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type / Parent</TableHead>
                  <TableHead>Subdomain</TableHead>
                  <TableHead>Associated RSS</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => {
                  const parent = getParentTag(tag.parent_tag_id)
                  const rssFeeds = tag.show_rss_feeds || []
                  const subdomain = tag.subdomain_mappings?.[0]?.subdomain || null
                  return (
                    <TableRow key={tag.id}>
                      <TableCell className="font-mono">#{tag.tag}</TableCell>
                      <TableCell>{tag.name}</TableCell>
                      <TableCell>
                        {parent ? (
                          <Badge variant="outline">Alias of #{parent.tag}</Badge>
                        ) : (
                          <Badge variant="secondary">Canonical</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {subdomain ? (
                          <a href={`https://${subdomain}.podbridge.app`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            {subdomain}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rssFeeds.length > 0 ? `${rssFeeds.length} feed(s)` : <span className="text-muted-foreground">None</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(tag)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(tag.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="mappings">
          <p className="text-muted-foreground">Hashtag mappings management coming soon.</p>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="grid grid-rows-[auto_1fr_auto] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{currentTag?.id ? `Edit Tag: #${currentTag.tag}` : 'Create New Tag'}</DialogTitle>
            <DialogDescription>
              Manage tag details, hierarchy, subdomain, and associated RSS feeds.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 overflow-y-auto pr-4">
            {!currentTag?.id && (
              <div className="space-y-2">
                <Label htmlFor="tag">Tag (slug)</Label>
                <Input
                  id="tag"
                  value={currentTag?.tag || ""}
                  onChange={(e) => setCurrentTag(prev => ({ ...prev!, tag: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="e.g., huberman-lab"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={currentTag?.name || ""}
                onChange={(e) => setCurrentTag(prev => ({ ...prev!, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={currentTag?.subdomain || ""}
                onChange={(e) => setCurrentTag(prev => ({ ...prev!, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="e.g., huberman-lab"
                disabled={!!currentTag?.parent_tag_id}
              />
              {!!currentTag?.parent_tag_id && <p className="text-xs text-muted-foreground">Subdomains can only be set on canonical (non-alias) tags.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Canonical Parent (makes this an alias)</Label>
              <Combobox
                options={tagOptions}
                value={currentTag?.parent_tag_id || ""}
                onChange={(value) => setCurrentTag(prev => ({ ...prev!, parent_tag_id: value || null, subdomain: "" }))}
                placeholder="Select a parent tag..."
              />
               {currentTag?.parent_tag_id && (
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setCurrentTag(prev => ({ ...prev!, parent_tag_id: null }))}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear parent (make canonical)
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Associated RSS Feeds</Label>
              {currentTag?.rss_urls?.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => {
                      setCurrentTag(prev => {
                        if (!prev) return null;
                        const newUrls = [...(prev.rss_urls || [])];
                        newUrls[index] = e.target.value;
                        return { ...prev, rss_urls: newUrls };
                      });
                    }}
                    placeholder="https://..."
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => {
                    setCurrentTag(prev => {
                      if (!prev) return null;
                      const newUrls = (prev.rss_urls || []).filter((_, i) => i !== index);
                      return { ...prev, rss_urls: newUrls };
                    });
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                setCurrentTag(prev => {
                  if (!prev) return null;
                  const newUrls = [...(prev.rss_urls || []), ''];
                  return { ...prev, rss_urls: newUrls };
                });
              }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add RSS Feed
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}