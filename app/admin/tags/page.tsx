"use client";

import React, { useState, useEffect } from "react"
import type { ShowTag } from "@/lib/types"
import { Button } from "@/components/ui/button"
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
  const [showAddCanonical, setShowAddCanonical] = useState(false)
  const [showAddAlias, setShowAddAlias] = useState(false)
  const [editingTag, setEditingTag] = useState<ShowTag | null>(null)
  const [newCanonical, setNewCanonical] = useState({ tag: "", name: "" })
  const [newAlias, setNewAlias] = useState({ tag: "", name: "", parentId: "" })
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
    try {
      const { data, error } = await supabase
        .from("show_tags")
        .insert([{ tag: newCanonical.tag.toLowerCase().trim(), name: newCanonical.name.trim() }])
        .select()
        .single()
      if (error) throw error
      setTags([...tags, data])
      setNewCanonical({ tag: "", name: "" })
      setShowAddCanonical(false)
    } catch (error) {
      console.error("Error adding canonical:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAlias = async () => {
    if (!newAlias.tag || !newAlias.name || !newAlias.parentId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("show_tags")
        .insert([{ tag: newAlias.tag.toLowerCase().trim(), name: newAlias.name.trim(), parent_tag_id: newAlias.parentId }])
        .select()
        .single()
      if (error) throw error
      setTags([...tags, data])
      setNewAlias({ tag: "", name: "", parentId: "" })
      setShowAddAlias(false)
    } catch (error) {
      console.error("Error adding alias:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditTag = async (originalTag: ShowTag) => {
    if (!editingTag || !editingTag.tag || !editingTag.name) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from("show_tags")
        .update({ tag: editingTag.tag.toLowerCase().trim(), name: editingTag.name.trim() })
        .eq("id", originalTag.id)
      if (error) throw error
      // Update local state optimistically
      setTags(tags.map(t => t.id === originalTag.id ? { ...t, tag: editingTag.tag.toLowerCase().trim(), name: editingTag.name.trim() } : t))
      setEditingTag(null)
    } catch (error) {
      console.error("Error updating tag:", error)
      fetchTags() // Revert by refetch
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string, hasChildren: boolean) => {
    setLoading(true)
    try {
      if (hasChildren) {
        await supabase.from("show_tags").delete().eq("parent_tag_id", tagId)
      }
      const { error } = await supabase.from("show_tags").delete().eq("id", tagId)
      if (error) throw error
      setTags(tags.filter(t => t.id !== tagId))
    } catch (error) {
      console.error("Error deleting tag:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && tags.length === 0) {
    return <div className="p-4">Loading tags...</div>
  }

  return (
    <div className="p-4">
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCanonical(false)} disabled={loading}>Cancel</Button>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddAlias(false)} disabled={loading}>Cancel</Button>
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
                  <div className="font-medium">{tag.tag}</div>
                  <div className="text-xs text-muted-foreground">
                    {childAliases.length} alias{childAliases.length === 1 ? '' : 'es'}
                  </div>
                </div>
                <div className="space-x-2">
                  <Dialog open={editingTag?.id === tag.id} onOpenChange={() => setEditingTag(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTag(tag)}
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
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTag(null)} disabled={loading}>Cancel</Button>
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

                {childAliases.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Aliases</div>
                    {childAliases.map(alias => (
                      <div key={alias.id} className="pl-4 border-l flex justify-between items-center py-2">
                        <div className="flex-1 mr-2">
                          <Input value={alias.tag} readOnly />
                        </div>
                        <div className="space-x-1">
                          <Dialog open={editingTag?.id === alias.id} onOpenChange={() => setEditingTag(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingTag(alias)}
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
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingTag(null)} disabled={loading}>Cancel</Button>
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
                      </div>
                    ))}
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