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

type EditableTag = Partial<ShowTag>

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
    setCurrentTag(tag)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!currentTag || !currentTag.id) return

    setIsSaving(true)
    const { error } = await supabase
      .from("show_tags")
      .update({
        name: currentTag.name,
        parent_tag_id: currentTag.parent_tag_id || null,
      })
      .eq("id", currentTag.id)

    if (error) {
      toast.error("Failed to update tag.")
      console.error(error)
    } else {
      toast.success("Tag updated successfully.")
      // Update local state
      setTags(tags.map(t => t.id === currentTag.id ? { ...t, ...currentTag } as ShowTag : t))
      setIsEditing(false)
      setCurrentTag(null)
    }
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
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => {
              const parent = getParentTag(tag.parent_tag_id)
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
              <Label htmlFor="parent">Canonical Parent (Alias of)</Label>
              <Combobox
                options={tagOptions}
                value={currentTag?.parent_tag_id || ""}
                onChange={(value) => setCurrentTag({ ...currentTag, parent_tag_id: value || null })}
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