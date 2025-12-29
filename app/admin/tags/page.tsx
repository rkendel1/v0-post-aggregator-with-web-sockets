"use client";

import React, { useState, useEffect } from "react"
import type { ShowTag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const supabase = createClient()

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("show_tags")
        .select("*")
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
      const rssFeeds = newRssUrls.filter(url => url.trim()).map(url => ({ rss_url: url.trim() }))
      const { data, error } = await supabase
        .from("show_tags")
        .insert([{ tag: newCanonical.tag.toLowerCase().trim(), name: newCanonical.name.trim(), user_rss_feeds: rssFeeds.length > 0 ? rssFeeds : null }])
        .select()
        .single()
      if (error) throw error
      setTags([...tags, data])
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
      const rssFeeds = newAliasRssUrls.filter(url => url.trim()).map(url => ({ rss_url: url.trim() }))
      const { data, error } = await supabase
        .from("show_tags")
        .insert([{ tag: newAlias.tag.toLowerCase().trim(), name: newAlias.name.trim(), parent_tag_id: newAlias.parentId, user_rss_feeds: rssFeeds.length > 0 ? rssFeeds : null }])
        .select()
        .single()
      if (error) throw error
      setTags([...tags, data])
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
      const rssFeeds = editingRss.filter(url => url.trim()).map(url => ({ rss_url: url.trim() }))
      const { error } = await supabase
        .from("show_tags")
        .update({ tag: editingTag.tag.toLowerCase().trim(), name: editingTag.name.trim(), user_rss_feeds: rssFeeds.length > 0 ? rssFeeds : null })
        .eq("id", originalTag.id)
      if (error) throw error
      // Update local state optimistically
      setTags(tags.map(t => t.id === originalTag.id ? { ...t, tag: editingTag.tag.toLowerCase().trim(), name: editingTag.name.trim(), user_rss_feeds: rssFeeds.length > 0 ? rssFeeds : null } : t))
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

  if (loading && tags.length === 0) {
    return <div className="p-4">Loading tags...</div>
  }

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2 h-4 w-4 p-0">
            ×
          </Button>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Canonical Creators</h2>
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
      {canonical.length === 0 && !loading ? (
        <p className="text-muted-foreground">No canonical tags found. Add one to get started.</p>
      ) : (
        canonical.map(tag => {
          const childAliases = aliasesByParent[tag.id] || []
          return (
            <div key={tag.id} className="mb-4 border rounded-lg">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium"><Badge variant="secondary">{tag.tag}</Badge></div>
                  <div className="text-xs text-muted-foreground">
                    {childAliases.length} alias{childAliases.length === 1 ? '' : 'es'}
                  </div>
                </div>
                <div className="space-x-2">
                  <Dialog open={editingTag?.id === tag.id} onOpenChange={() => {setEditingTag(null); setEditingRss([]);}}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTag(tag)
                          setEditingRss(tag.user_rss_feeds?.map(f => f.rss_url) || [])
                        }}
                        disabled={loading}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit {tag.tag}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit-tag">Tag</Label>
                          <Input
                            id="edit-tag"
                            placeholder="Enter tag"
                            value={editingTag?.tag || ""}
                            onChange={(e) => setEditingTag(editingTag ? { ...editingTag, tag: e.target.value } : null)}
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-name">Name</Label>
                          <Input
                            id="edit-name"
                            placeholder="Enter name"
                            value={editingTag?.name || ""}
                            onChange={(e) => setEditingTag(editingTag ? { ...editingTag, name: e.target.value } : null)}
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <Label>RSS Feeds</Label>
                          <div className="space-y-2">
                            {editingRss.map((url, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Input
                                  placeholder="Enter RSS URL"
                                  value={url}
                                  onChange={(e) => {
                                    const updated = [...editingRss]
                                    updated[index] = e.target.value
                                    setEditingRss(updated)
                                  }}
                                  disabled={loading}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setEditingRss(editingRss.filter((_, i) => i !== index))}
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
                              onClick={() => setEditingRss([...editingRss, ""])}
                              disabled={loading}
                            >
                              + Add RSS Feed
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {setEditingTag(null); setEditingRss([]);}} disabled={loading}>Cancel</Button>
                        <Button onClick={() => handleEditTag(tag)} disabled={loading || !editingTag?.tag || !editingTag?.name}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Canonical Tag?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {childAliases.length > 0
                            ? `This will delete "${tag.tag}" and all ${childAliases.length} associated aliases. This action cannot be undone.`
                            : `This will permanently delete "${tag.tag}". This action cannot be undone.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteTag(tag.id, childAliases.length > 0)} disabled={loading}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="p-4 border-t space-y-3">
                <Label>Canonical Tag</Label>
                <Input value={tag.tag} readOnly className="mb-4" />

                <div className="space-y-2">
                  <Label>RSS Feeds</Label>
                  {tag.user_rss_feeds && tag.user_rss_feeds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tag.user_rss_feeds.map((feed) => (
                        <Badge key={feed.rss_url} variant="outline">{feed.rss_url}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No RSS feeds</p>
                  )}
                </div>

                {childAliases.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Aliases</div>
                    {childAliases.map(alias => {
                      const childRss = alias.user_rss_feeds || []
                      return (
                        <div key={alias.id} className="pl-4 border-l flex justify-between items-center py-2">
                          <div className="flex-1 mr-2">
                            <Badge variant="secondary">{alias.tag}</Badge>
                          </div>
                          <div className="space-x-1">
                            <Dialog open={editingTag?.id === alias.id} onOpenChange={() => {setEditingTag(null); setEditingRss([]);}}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTag(alias)
                                    setEditingRss(alias.user_rss_feeds?.map(f => f.rss_url) || [])
                                  }}
                                  disabled={loading}
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit {alias.tag}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="edit-alias-tag">Tag</Label>
                                    <Input
                                      id="edit-alias-tag"
                                      placeholder="Enter tag"
                                      value={editingTag?.tag || ""}
                                      onChange={(e) => setEditingTag(editingTag ? { ...editingTag, tag: e.target.value } : null)}
                                      disabled={loading}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-alias-name">Name</Label>
                                    <Input
                                      id="edit-alias-name"
                                      placeholder="Enter name"
                                      value={editingTag?.name || ""}
                                      onChange={(e) => setEditingTag(editingTag ? { ...editingTag, name: e.target.value } : null)}
                                      disabled={loading}
                                    />
                                  </div>
                                  <div>
                                    <Label>RSS Feeds</Label>
                                    <div className="space-y-2">
                                      {editingRss.map((url, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                          <Input
                                            placeholder="Enter RSS URL"
                                            value={url}
                                            onChange={(e) => {
                                              const updated = [...editingRss]
                                              updated[index] = e.target.value
                                              setEditingRss(updated)
                                            }}
                                            disabled={loading}
                                          />
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setEditingRss(editingRss.filter((_, i) => i !== index))}
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
                                        onClick={() => setEditingRss([...editingRss, ""])}
                                        disabled={loading}
                                      >
                                        + Add RSS Feed
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => {setEditingTag(null); setEditingRss([]);}} disabled={loading}>Cancel</Button>
                                  <Button onClick={() => handleEditTag(alias)} disabled={loading || !editingTag?.tag || !editingTag?.name}>Save</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Alias?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the alias "{alias.tag}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTag(alias.id, false)} disabled={loading}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          {childRss.length > 0 && (
                            <div className="pl-4 space-y-2 mt-2 w-full">
                              <Label className="text-sm">RSS Feeds for {alias.tag}</Label>
                              <div className="flex flex-wrap gap-1">
                                {childRss.map((feed: { rss_url: string }) => (
                                  <Badge key={feed.rss_url} variant="outline">{feed.rss_url}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}