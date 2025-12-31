"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag, ShowCommunityLink } from "@/lib/types"
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
import { Textarea } from "@/components/ui/textarea"

interface ShowRssFeed {
  rss_url: string
}

type ShowTagWithDetails = ShowTag & {
  show_rss_feeds: ShowRssFeed[]
  show_community_links: ShowCommunityLink[]
}

interface AdminDashboardProps {
  initialTags: ShowTagWithDetails[]
}

type EditableTag = Partial<ShowTagWithDetails> & { subdomain?: string | null; rss_urls?: string[] }

export function AdminDashboard({ initialTags }: AdminDashboardProps) {
  const [tags, setTags] = useState<ShowTagWithDetails[]>(initialTags)
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

  const handleEdit = (tag: ShowTagWithDetails) => {
    const subdomain = tag.subdomain_mappings && tag.subdomain_mappings.length > 0 ? tag.subdomain_mappings[0].subdomain : ""
    const rss_urls = tag.show_rss_feeds ? tag.show_rss_feeds.map(f => f.rss_url) : []
    const community_links = tag.show_community_links || []
    setCurrentTag({ ...tag, subdomain, rss_urls, show_community_links: community_links })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!currentTag) return

    // Add uniqueness check for new tags
    if (!currentTag.id) {
      if (!currentTag.tag || currentTag.tag.trim() === '') {
        toast.error("Tag slug cannot be empty.");
        return;
      }
      const { data: existingTag } = await supabase
        .from('show_tags')
        .select('id')
        .eq('tag', currentTag.tag.trim())
        .single();

      if (existingTag) {
        toast.error(`Tag #${currentTag.tag.trim()} already exists.`);
        return;
      }
    }

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

      // Handle Community Links
      const communityLinks = currentTag.show_community_links?.filter(l => l.name && l.url) || []
      await supabase.from('show_community_links').delete().eq('show_tag_id', savedTag.id)
      if (communityLinks.length > 0) {
        const linksToInsert = communityLinks.map(({ id, ...rest }) => ({ ...rest, show_tag_id: savedTag.id }))
        const { error: linkError } = await supabase.from('show_community_links').insert(linksToInsert)
        if (linkError) throw new Error(`Failed to save community links: ${linkError.message}`)
      }

      toast.success(`Tag ${isNew ? 'created' : 'updated'} successfully.`)
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
    const { data: tagsResult } = await supabase
      .from("show_tags")
      .select("*, show_rss_feeds(rss_url), subdomain_mappings(subdomain), show_community_links(*)")
      .order("tag", { ascending: true })
    
    setTags((tagsResult as ShowTagWithDetails[]) || [])
  }

  const getParentTag = (parentId: string | null | undefined) => {
    if (!parentId) return null
    return tags.find(t => t.id === parentId)
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setCurrentTag({ tag: '', name: '', parent_tag_id: null, subdomain: '', rss_urls: [], show_community_links: [] }); setIsEditing(true) }}>
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
              <TableHead>RSS</TableHead>
              <TableHead>Links</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => {
              const parent = getParentTag(tag.parent_tag_id)
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
                  <TableCell>{tag.show_rss_feeds.length > 0 ? `${tag.show_rss_feeds.length}` : <span className="text-muted-foreground">0</span>}</TableCell>
                  <TableCell>{tag.show_community_links.length > 0 ? `${tag.show_community_links.length}` : <span className="text-muted-foreground">0</span>}</TableCell>
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

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="grid grid-rows-[auto_1fr_auto] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{currentTag?.id ? `Edit Tag: #${currentTag.tag}` : 'Create New Tag'}</DialogTitle>
            <DialogDescription>
              Manage tag details, hierarchy, subdomain, and associated RSS feeds.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 overflow-y-auto pr-4">
            {/* Tag and Name Inputs */}
            {!currentTag?.id && (
              <div className="space-y-2">
                <Label htmlFor="tag">Tag (slug)</Label>
                <Input id="tag" value={currentTag?.tag || ""} onChange={(e) => setCurrentTag(prev => ({ ...prev!, tag: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="e.g., huberman-lab" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={currentTag?.name || ""} onChange={(e) => setCurrentTag(prev => ({ ...prev!, name: e.target.value }))} />
            </div>
            {/* Subdomain and Parent Inputs */}
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input id="subdomain" value={currentTag?.subdomain || ""} onChange={(e) => setCurrentTag(prev => ({ ...prev!, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="e.g., huberman-lab" disabled={!!currentTag?.parent_tag_id} />
              {!!currentTag?.parent_tag_id && <p className="text-xs text-muted-foreground">Subdomains can only be set on canonical (non-alias) tags.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Canonical Parent (makes this an alias)</Label>
              <Combobox options={tagOptions} value={currentTag?.parent_tag_id || ""} onChange={(value) => setCurrentTag(prev => ({ ...prev!, parent_tag_id: value || null, subdomain: "" }))} placeholder="Select a parent tag..." />
              {currentTag?.parent_tag_id && (<Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setCurrentTag(prev => ({ ...prev!, parent_tag_id: null }))}><Trash2 className="h-3 w-3 mr-1" />Clear parent (make canonical)</Button>)}
            </div>
            {/* RSS Feeds */}
            <div className="space-y-2">
              <Label>Associated RSS Feeds</Label>
              {currentTag?.rss_urls?.map((url, index) => (<div key={index} className="flex items-center gap-2"><Input value={url} onChange={(e) => {setCurrentTag(prev => {if (!prev) return null; const newUrls = [...(prev.rss_urls || [])]; newUrls[index] = e.target.value; return { ...prev, rss_urls: newUrls };});}} placeholder="https://..." /><Button variant="ghost" size="icon-sm" onClick={() => {setCurrentTag(prev => {if (!prev) return null; const newUrls = (prev.rss_urls || []).filter((_, i) => i !== index); return { ...prev, rss_urls: newUrls };});}}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>))}
              <Button variant="outline" size="sm" onClick={() => {setCurrentTag(prev => {if (!prev) return null; const newUrls = [...(prev.rss_urls || []), '']; return { ...prev, rss_urls: newUrls };});}}><PlusCircle className="h-4 w-4 mr-2" />Add RSS Feed</Button>
            </div>
            {/* Community Links */}
            <div className="space-y-2">
              <Label>Community Links (e.g., Discord)</Label>
              {currentTag?.show_community_links?.map((link, index) => (
                <div key={index} className="flex items-end gap-2 border p-2 rounded-md">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="space-y-1 col-span-2"><Label htmlFor={`link-name-${index}`} className="text-xs">Name</Label><Input id={`link-name-${index}`} value={link.name} onChange={(e) => setCurrentTag(prev => { const newLinks = [...(prev!.show_community_links || [])]; newLinks[index].name = e.target.value; return { ...prev!, show_community_links: newLinks } })} /></div>
                    <div className="space-y-1 col-span-2"><Label htmlFor={`link-url-${index}`} className="text-xs">URL</Label><Input id={`link-url-${index}`} value={link.url} onChange={(e) => setCurrentTag(prev => { const newLinks = [...(prev!.show_community_links || [])]; newLinks[index].url = e.target.value; return { ...prev!, show_community_links: newLinks } })} /></div>
                    <div className="space-y-1 col-span-2"><Label htmlFor={`link-desc-${index}`} className="text-xs">Description</Label><Textarea id={`link-desc-${index}`} value={link.description || ""} onChange={(e) => setCurrentTag(prev => { const newLinks = [...(prev!.show_community_links || [])]; newLinks[index].description = e.target.value; return { ...prev!, show_community_links: newLinks } })} rows={2} /></div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setCurrentTag(prev => ({ ...prev!, show_community_links: prev!.show_community_links!.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCurrentTag(prev => ({ ...prev!, show_community_links: [...(prev!.show_community_links || []), { id: `new-${Date.now()}`, show_tag_id: prev!.id || 'temp', created_at: new Date().toISOString(), platform: 'discord', name: '', url: '', description: '' }] }))}><PlusCircle className="h-4 w-4 mr-2" />Add Link</Button>
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