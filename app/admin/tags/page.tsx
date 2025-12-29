"use client";

import React, { useState, useEffect, useMemo } from "react"
import type { ShowTag, HashtagMapping } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

type TagManagerProps = {
  initialTags?: ShowTag[]
}

export default function TagManager({ initialTags = [] }: TagManagerProps) {
  const [tags, setTags] = useState<ShowTag[]>(initialTags)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddCanonical, setShowAddCanonical] = useState(false)
  const [showAddAlias, setShowAddAlias] = useState(false)
  const [editingTag, setEditingTag] = useState<ShowTag | null>(null)
  const [editingRss, setEditingRss] = useState<string[]>([])
  const [newCanonical, setNewCanonical] = useState({ tag: "", name: "" })
  const [newAlias, setNewAlias] = useState({ tag: "", name: "", parentId: "" })
  const [newRssUrls, setNewRssUrls] = useState<string[]>([])
  const [newAliasRssUrls, setNewAliasRssUrls] = useState<string[]>([])
  const [mappings, setMappings] = useState<HashtagMapping[]>([])
  const [editingMapping, setEditingMapping] = useState<HashtagMapping | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof ShowTag | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' })
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null)
  const [showAddMapping, setShowAddMapping] = useState(false)
  const [newMapping, setNewMapping] = useState({ hashtag: '', showTagId: '' })
  const [editingMappingHashtag, setEditingMappingHashtag] = useState('')
  const [editingMappingShowTagId, setEditingMappingShowTagId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchTags()
    fetchMappings()
  }, [])

  const fetchMappings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('hashtag_mappings')
        .select('*, show_tags(*)')
        .order('hashtag', { ascending: true })
      if (error) throw error
      setMappings(data || [])
    } catch (error) {
      console.error('Error fetching mappings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = useMemo(() => {
    return tags.filter(t =>
      t.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [tags, searchTerm])

  const filteredMappings = useMemo(() => {
    return mappings.filter(m =>
      m.hashtag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.show_tags?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [mappings, searchTerm])

  const handleSort = (key: keyof ShowTag) => {
    let dir: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.dir === 'asc') {
      dir = 'desc'
    }
    setSortConfig({ key, dir })
  }

  const sortedTags = useMemo(() => {
    let sortableTags = [...filteredTags]
    if (sortConfig.key) {
      sortableTags.sort((a, b) => {
        let aVal = String(a[sortConfig.key!] ?? '')
        let bVal = String(b[sortConfig.key!] ?? '')
        if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableTags
  }, [filteredTags, sortConfig])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("show_tags")
        .select("*, user_rss_feeds(rss_url)")
        .order("tag", { ascending: true })
      if (error) throw error
      setTags(data || [])
    } catch (error) {
      console.error("Error fetching tags:", error)
    } finally {
      setLoading(false)
    }
  }

  // Separate canonical creators and aliases
  const canonical = tags.filter(t => !t.parent_tag_id)
  const aliases = tags.filter(t => t.parent_tag_id)

  const aliasesByParent = aliases.reduce<Record<string, ShowTag[]>>((acc, tag) => {
    const parentId = tag.parent_tag_id as string
    acc[parentId] = acc[parentId] || []
    acc[parentId].push(tag)
    return acc
  }, {})

  const handleAddCanonical = async () => {
    if (!newCanonical.tag || !newCanonical.name) return
    setLoading(true)
    setError(null)
    try {
      const { data: newTagData, error: insertError } = await supabase
        .from("show_tags")
        .insert([{ tag: newCanonical.tag.toLowerCase().trim(), name: newCanonical.name.trim() }])
        .select()
        .single()
      if (insertError) throw insertError

      // Handle RSS feeds relation
      const rssUrls = newRssUrls.filter(url => url.trim())
      if (rssUrls.length > 0) {
        const newFeeds = rssUrls.map(url => ({ rss_url: url.trim(), show_tag_id: newTagData.id }))
        await supabase.from('user_rss_feeds').insert(newFeeds)
      }

      // Fetch full data with relations
      const { data: fullData } = await supabase
        .from("show_tags")
        .select("*, user_rss_feeds(rss_url)")
        .eq("id", newTagData.id)
        .single()
      setTags([...tags, fullData])
      setNewCanonical({ tag: "", name: "" })
      setNewRssUrls([])
      setShowAddCanonical(false)
    } catch (error: any) {
      console.error("Error adding canonical:", error)
      setError(error.message || "Failed to add canonical tag")
    } finally {
      setLoading(false)
    }
  }

  const handleAddAlias = async () => {
    if (!newAlias.tag || !newAlias.name || !newAlias.parentId) return
    setLoading(true)
    setError(null)
    try {
      const { data: newTagData, error: insertError } = await supabase
        .from("show_tags")
        .insert([{ tag: newAlias.tag.toLowerCase().trim(), name: newAlias.name.trim(), parent_tag_id: newAlias.parentId }])
        .select()
        .single()
      if (insertError) throw insertError

      // Handle RSS feeds relation
      const rssUrls = newAliasRssUrls.filter(url => url.trim())
      if (rssUrls.length > 0) {
        const newFeeds = rssUrls.map(url => ({ rss_url: url.trim(), show_tag_id: newTagData.id }))
        await supabase.from('user_rss_feeds').insert(newFeeds)
      }

      // Fetch full data with relations
      const { data: fullData } = await supabase
        .from("show_tags")
        .select("*, user_rss_feeds(rss_url)")
        .eq("id", newTagData.id)
        .single()
      setTags([...tags, fullData])
      setNewAlias({ tag: "", name: "", parentId: "" })
      setNewAliasRssUrls([])
      setShowAddAlias(false)
    } catch (error: any) {
      console.error("Error adding alias:", error)
      setError(error.message || "Failed to add alias tag")
    } finally {
      setLoading(false)
    }
  }

  const handleEditTag = async (originalTag: ShowTag) => {
    if (!editingTag || !editingTag.tag || !editingTag.name) return
    setLoading(true)
    setError(null)
    try {
      const newTag = editingTag.tag.toLowerCase().trim()
      const newName = editingTag.name.trim()
      const newParentId = editingTag.parent_tag_id || null
      const { error: updateError } = await supabase
        .from("show_tags")
        .update({ tag: newTag, name: newName, parent_tag_id: newParentId })
        .eq("id", originalTag.id)
      if (updateError) throw updateError

      // Handle RSS feeds relation
      await supabase.from('user_rss_feeds').delete().eq('show_tag_id', originalTag.id)
      const rssUrls = editingRss.filter(url => url.trim())
      if (rssUrls.length > 0) {
        const newFeeds = rssUrls.map(url => ({ rss_url: url.trim(), show_tag_id: originalTag.id }))
        const { error: insertError } = await supabase.from('user_rss_feeds').insert(newFeeds)
        if (insertError) throw insertError
      }

      // Update local state optimistically
      const newUserRssFeeds = rssUrls.map(url => ({ rss_url: url.trim() }))
      setTags(tags.map(t => t.id === originalTag.id ? { ...t, tag: newTag, name: newName, parent_tag_id: newParentId, user_rss_feeds: newUserRssFeeds } : t))
      setEditingTag(null)
      setEditingRss([])
    } catch (error: any) {
      console.error("Error updating tag:", error)
      setError(error.message || "Failed to update tag")
      fetchTags() // Revert by refetch
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string, hasChildren: boolean) => {
    setLoading(true)
    setError(null)
    try {
      if (hasChildren) {
        await supabase.from("show_tags").delete().eq("parent_tag_id", tagId)
      }
      const { error } = await supabase.from("show_tags").delete().eq("id", tagId)
      if (error) throw error
      setTags(tags.filter(t => t.id !== tagId))
    } catch (error: any) {
      console.error("Error deleting tag:", error)
      setError(error.message || "Failed to delete tag")
    } finally {
      setLoading(false)
    }
  }

  const handleAddMapping = async () => {
    if (!newMapping.hashtag || !newMapping.showTagId) return
    setLoading(true)
    setError(null)
    try {
      const { data: newMappingData, error: insertError } = await supabase
        .from('hashtag_mappings')
        .insert([{ hashtag: newMapping.hashtag.toLowerCase().trim(), show_tag_id: newMapping.showTagId }])
        .select('*, show_tags(*)')
        .single()
      if (insertError) throw insertError
      setMappings([...mappings, newMappingData])
      setNewMapping({ hashtag: '', showTagId: '' })
      setShowAddMapping(false)
    } catch (error: any) {
      console.error('Error adding mapping:', error)
      setError(error.message || 'Failed to add mapping')
    } finally {
      setLoading(false)
    }
  }

  const handleEditMapping = async (originalMapping: HashtagMapping) => {
    if (!editingMappingHashtag || !editingMappingShowTagId) return
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('hashtag_mappings')
        .update({ hashtag: editingMappingHashtag.toLowerCase().trim(), show_tag_id: editingMappingShowTagId })
        .eq('id', originalMapping.id)
      if (updateError) throw updateError
      setMappings(mappings.map(m => m.id === originalMapping.id ? { ...m, hashtag: editingMappingHashtag.toLowerCase().trim(), show_tag_id: editingMappingShowTagId, show_tags: canonical.find(c => c.id === editingMappingShowTagId) || null } : m))
      setEditingMappingId(null)
      setEditingMappingHashtag('')
      setEditingMappingShowTagId('')
    } catch (error: any) {
      console.error('Error updating mapping:', error)
      setError(error.message || 'Failed to update mapping')
      fetchMappings()
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('hashtag_mappings').delete().eq('id', mappingId)
      if (error) throw error
      setMappings(mappings.filter(m => m.id !== mappingId))
    } catch (error: any) {
      console.error('Error deleting mapping:', error)
      setError(error.message || 'Failed to delete mapping')
    } finally {
      setLoading(false)
    }
  }

  if (loading && tags.length === 0 && mappings.length === 0) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <Tabs defaultValue="tags" className="p-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tags">Tags & RSS</TabsTrigger>
        <TabsTrigger value="mappings">Hashtag Mappings</TabsTrigger>
      </TabsList>
      <TabsContent value="tags" className="mt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {error}
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2 h-4 w-4 p-0">
              ×
            </Button>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <Input
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="space-x-2">
            <Dialog open={showAddCanonical} onOpenChange={setShowAddCanonical}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>Add Canonical</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Canonical Tag</DialogTitle>
                  <DialogDescription>
                    Create a new creator tag that aliases resolve to.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="canonical-tag">Tag (e.g., podbridge)</Label>
                    <Input
                      id="canonical-tag"
                      placeholder="Enter tag"
                      value={newCanonical.tag}
                      onChange={(e) => setNewCanonical({ ...newCanonical, tag: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="canonical-name">Name</Label>
                    <Input
                      id="canonical-name"
                      placeholder="Enter name"
                      value={newCanonical.name}
                      onChange={(e) => setNewCanonical({ ...newCanonical, name: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label>RSS Feeds</Label>
                    <div className="space-y-2">
                      {newRssUrls.map((url, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Enter RSS URL"
                            value={url}
                            onChange={(e) => {
                              const updated = [...newRssUrls]
                              updated[index] = e.target.value
                              setNewRssUrls(updated)
                            }}
                            disabled={loading}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setNewRssUrls(newRssUrls.filter((_, i) => i !== index))}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewRssUrls([...newRssUrls, ""])}
                        disabled={loading}
                      >
                        + Add RSS Feed
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {setShowAddCanonical(false); setNewRssUrls([]);}} disabled={loading}>Cancel</Button>
                  <Button onClick={handleAddCanonical} disabled={loading || !newCanonical.tag || !newCanonical.name}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddAlias} onOpenChange={setShowAddAlias}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>Add Alias</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Alias Tag</DialogTitle>
                  <DialogDescription>
                    Create an alias that resolves to a canonical tag.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="alias-tag">Tag (e.g., podcastname)</Label>
                    <Input
                      id="alias-tag"
                      placeholder="Enter tag"
                      value={newAlias.tag}
                      onChange={(e) => setNewAlias({ ...newAlias, tag: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="alias-name">Name</Label>
                    <Input
                      id="alias-name"
                      placeholder="Enter name"
                      value={newAlias.name}
                      onChange={(e) => setNewAlias({ ...newAlias, name: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="parent-id">Parent Canonical</Label>
                    <select
                      id="parent-id"
                      value={newAlias.parentId}
                      onChange={(e) => setNewAlias({ ...newAlias, parentId: e.target.value })}
                      className="w-full p-2 border rounded-md"
                      disabled={loading}
                    >
                      <option value="">Select Canonical</option>
                      {canonical.map(c => (
                        <option key={c.id} value={c.id}>{c.tag} ({c.name})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>RSS Feeds</Label>
                    <div className="space-y-2">
                      {newAliasRssUrls.map((url, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder="Enter RSS URL"
                            value={url}
                            onChange={(e) => {
                              const updated = [...newAliasRssUrls]
                              updated[index] = e.target.value
                              setNewAliasRssUrls(updated)
                            }}
                            disabled={loading}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setNewAliasRssUrls(newAliasRssUrls.filter((_, i) => i !== index))}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewAliasRssUrls([...newAliasRssUrls, ""])}
                        disabled={loading}
                      >
                        + Add RSS Feed
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {setShowAddAlias(false); setNewAliasRssUrls([]);}} disabled={loading}>Cancel</Button>
                  <Button onClick={handleAddAlias} disabled={loading || !newAlias.tag || !newAlias.name || !newAlias.parentId}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          These define creator subdomains and are the final rendering destination.
        </p>
        {sortedTags.length === 0 && !loading ? (
          <p className="text-muted-foreground">No tags found matching search.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('tag')} className="cursor-pointer">Tag</TableHead>
                <TableHead onClick={() => handleSort('name')} className="cursor-pointer">Name</TableHead>
                <TableHead>RSS Feeds</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTags.map(tag => (
                <TableRow key={tag.id}>
                  <TableCell>
                    {editingRowId === tag.id ? (
                      <Input
                        value={editingTag?.tag || ''}
                        onChange={(e) => setEditingTag({ ...editingTag!, tag: e.target.value })}
                        onBlur={() => setEditingRowId(null)}
                      />
                    ) : (
                      <Badge variant="secondary" onClick={() => setEditingRowId(tag.id)} className="cursor-pointer">{tag.tag}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRowId === tag.id ? (
                      <Input
                        value={editingTag?.name || ''}
                        onChange={(e) => setEditingTag({ ...editingTag!, name: e.target.value })}
                        onBlur={() => setEditingRowId(null)}
                      />
                    ) : (
                      tag.name
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tag.user_rss_feeds?.map(feed => (
                        <Badge key={feed.rss_url} variant="outline" className="max-w-xs truncate">{feed.rss_url}</Badge>
                      )) || 'No RSS'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {aliasesByParent[tag.id]?.length || 0}
                  </TableCell>
                  <TableCell>
                    <div className="space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTag(tag)
                          setEditingRss(tag.user_rss_feeds?.map(f => f.rss_url) || [])
                          setEditingRowId(tag.id)
                        }}
                        disabled={loading}
                      >
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{tag.tag}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTag(tag.id, !!aliasesByParent[tag.id]?.length)} disabled={loading}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>
      <TabsContent value="mappings" className="mt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {error}
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2 h-4 w-4 p-0">
              ×
            </Button>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <Input
            placeholder="Search mappings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Dialog open={showAddMapping} onOpenChange={setShowAddMapping}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>Add Mapping</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Hashtag Mapping</DialogTitle>
                <DialogDescription>
                  Map a hashtag to a canonical tag for RSS categorization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-hashtag">Hashtag (e.g., ai)</Label>
                  <Input
                    id="new-hashtag"
                    placeholder="Enter hashtag without #"
                    value={newMapping.hashtag}
                    onChange={(e) => setNewMapping({ ...newMapping, hashtag: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="new-show-tag">Canonical Tag</Label>
                  <select
                    id="new-show-tag"
                    value={newMapping.showTagId}
                    onChange={(e) => setNewMapping({ ...newMapping, showTagId: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    disabled={loading}
                  >
                    <option value="">Select Canonical</option>
                    {canonical.map(c => (
                      <option key={c.id} value={c.id}>{c.tag} ({c.name})</option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {setShowAddMapping(false); setNewMapping({ hashtag: '', showTagId: '' });}} disabled={loading}>Cancel</Button>
                <Button onClick={handleAddMapping} disabled={loading || !newMapping.hashtag || !newMapping.showTagId}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {filteredMappings.length === 0 && !loading ? (
          <p className="text-muted-foreground">No mappings found. Add one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hashtag</TableHead>
                <TableHead>Mapped To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.map(mapping => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    {editingMappingId === mapping.id ? (
                      <Input
                        value={editingMappingHashtag}
                        onChange={(e) => setEditingMappingHashtag(e.target.value)}
                        onBlur={() => setEditingMappingId(null)}
                      />
                    ) : (
                      <Badge variant="secondary" onClick={() => {
                        setEditingMappingId(mapping.id)
                        setEditingMappingHashtag(mapping.hashtag)
                        setEditingMappingShowTagId(mapping.show_tag_id)
                      }} className="cursor-pointer">#{mapping.hashtag}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingMappingId === mapping.id ? (
                      <select
                        value={editingMappingShowTagId}
                        onChange={(e) => setEditingMappingShowTagId(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select Canonical</option>
                        {canonical.map(c => (
                          <option key={c.id} value={c.id}>{c.tag} ({c.name})</option>
                        ))}
                      </select>
                    ) : (
                      mapping.show_tags?.name || 'Unknown'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingMappingId(mapping.id)
                          setEditingMappingHashtag(mapping.hashtag)
                          setEditingMappingShowTagId(mapping.show_tag_id)
                        }}
                        disabled={loading}
                      >
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Mapping?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the mapping for "#{mapping.hashtag}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMapping(mapping.id)} disabled={loading}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
  )
}