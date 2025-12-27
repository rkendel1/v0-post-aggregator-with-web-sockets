"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ShowTag } from "@/lib/types"
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
import { Loader2, Pencil, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { Badge } from "../ui/badge"

interface TagManagerProps {
  initialTags: ShowTag[]
}

type EditableTag = Partial<ShowTag> & { subdomain?: string | null }

export function TagManager({ initialTags }: TagManagerProps) {
  const [tags, setTags] = useState<ShowTag[]>(initialTags)
  const [isEditing, setIsEditing] = useState(false)
  const [currentTag, setCurrentTag] = useState<EditableTag | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [supabase] = useState(() => createClient())

  const tagOptions = useMemo(() => {
    return tags
      .filter(tag => !tag.parent_tag_id && tag.id !== currentTag?.id) // Only show canonical tags, and not the tag being edited
      .map(tag => ({ value: tag.id, label: `#${tag.tag} (${tag.name})` }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [tags, currentTag])

  const handleEdit = (tag: ShowTag) => {
    const subdomain = tag.subdomain_mappings && tag.subdomain_mappings.length > 0 ? tag.subdomain_mappings[0].subdomain : ""
    setCurrentTag({ ...tag, subdomain })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!currentTag || !currentTag.id) return
    setIsSaving(true)

    // 1. Update the show_tags table (name, parent_id)
    const { error: tagUpdateError } = await supabase
      .from("show_tags")
      .update({
        name: currentTag.name,
        parent_tag_id: currentTag.parent_tag_id || null,
      })
      .eq("id", currentTag.id)

    if (tagUpdateError) {
      toast.error("Failed to update tag details.")
      console.error(tagUpdateError)
      setIsSaving(false)
      return
    }

    // 2. Update the subdomain_mappings table
    const newSubdomain = currentTag.subdomain?.trim() || null
    const originalTag = tags.find(t => t.id === currentTag.id)
    const oldSubdomain = originalTag?.subdomain_mappings?.[0]?.subdomain || null

    if (newSubdomain !== oldSubdomain) {
      await supabase.from('subdomain_mappings').delete().eq('show_tag_id', currentTag.id)

      if (newSubdomain) {
        const { error: subdomainError } = await supabase
          .from('subdomain_mappings')
          .insert({ subdomain: newSubdomain, show_tag_id: currentTag.id })
        
        if (subdomainError) {
          toast.error(`Subdomain '${newSubdomain}' is already taken or invalid. Tag details saved, but subdomain was not.`)
          setIsSaving(false)
          return // Keep modal open for user to fix
        }
      }
    }

    toast.success("Tag updated successfully.")
    
    // Refresh data from server to get latest state
    const { data: updatedTags } = await supabase
      .from("show_tags")
      .select("*, user_rss_feeds(rss_url), subdomain_mappings(subdomain)")
      .order("tag", { ascending: true })
    if (updatedTags) {
      setTags(updatedTags as ShowTag[])
    }
    
    setIsEditing(false)
    setCurrentTag(null)
    setIsSaving(false)
  }

  const getParentTag = (parentId: string | null | undefined) => {
    if (!parentId) return null
    return tags.find(t => t.id === parentId)
  }

  return (
    <>
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
              const rssFeed = tag.user_rss_feeds && tag.user_rss_feeds.length > 0 ? tag.user_rss_feeds[0].rss_url : null
              const subdomain = tag.subdomain_mappings && tag.subdomain_mappings.length > 0 ? tag.subdomain_mappings[0].subdomain : null
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
                    {rssFeed ? (
                      <a href={rssFeed} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block max-w-xs" title={rssFeed}>
                        {rssFeed}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(tag)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag: #{currentTag?.tag}</DialogTitle>
            <DialogDescription>
              Update the tag's details and set its canonical parent if it's an alias.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={currentTag?.name || ""}
                onChange={(e) => setCurrentTag({ ...currentTag, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={currentTag?.subdomain || ""}
                onChange={(e) => setCurrentTag({ ...currentTag, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="e.g., huberman-lab"
                disabled={!!currentTag?.parent_tag_id}
              />
              {!!currentTag?.parent_tag_id && <p className="text-xs text-muted-foreground">Subdomains can only be set on canonical (non-alias) tags.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Canonical Parent (Alias of)</Label>
              <Combobox
                options={tagOptions}
                value={currentTag?.parent_tag_id || ""}
                onChange={(value) => setCurrentTag({ ...currentTag, parent_tag_id: value || null, subdomain: "" })}
                placeholder="Select a parent tag..."
                searchPlaceholder="Search for a tag..."
                emptyText="No canonical tags found."
              />
               {currentTag?.parent_tag_id && (
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setCurrentTag({ ...currentTag, parent_tag_id: null })}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear parent (make canonical)
                </Button>
              )}
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