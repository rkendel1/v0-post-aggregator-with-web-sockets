"use client";

import React, { useState } from "react"
import type { ShowTag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type TagManagerProps = {
  initialTags?: ShowTag[]
}

export default function TagManager({ initialTags = [] }: TagManagerProps) {
  const [tags, setTags] = useState<ShowTag[]>(initialTags)

  // Separate canonical creators and aliases
  const canonical = tags.filter(t => !t.parent_tag_id)
  const aliases = tags.filter(t => t.parent_tag_id)

  const aliasesByParent = aliases.reduce<Record<string, ShowTag[]>>((acc, tag) => {
    const parentId = tag.parent_tag_id as string
    acc[parentId] = acc[parentId] || []
    acc[parentId].push(tag)
    return acc
  }, {})

  return (
    <div>
      <h2 className="text-lg font-semibold mt-6 mb-2">Canonical Creators</h2>
      <p className="text-sm text-muted-foreground mb-4">
        These define creator subdomains and are the final rendering destination.
      </p>
      {canonical.map(tag => {
        const childAliases = aliasesByParent[tag.id] || []
        return (
          <details key={tag.id} className="mb-4 border rounded">
            <summary className="cursor-pointer p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{tag.tag}</div>
                <div className="text-xs text-muted-foreground">
                  {childAliases.length} alias{childAliases.length === 1 ? '' : 'es'}
                </div>
              </div>
            </summary>

            <div className="p-4 border-t space-y-3">
              <Label>Canonical Tag</Label>
              <Input value={tag.tag} readOnly />

              {childAliases.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">Aliases</div>
                  {childAliases.map(alias => (
                    <div key={alias.id} className="pl-4 border-l">
                      <Input value={alias.tag} readOnly />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}