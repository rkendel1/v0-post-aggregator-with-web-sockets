"use client"

import { useState, useEffect } from "react"
import type { Post } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { QueueCard } from "./queue-card"
import { GripVertical } from "lucide-react"
import toast from "react-hot-toast"

function SortablePostItem({ post, currentUser, onUnsave }: { post: Post; currentUser: User | null; onUnsave: (postId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: post.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <div {...attributes} {...listeners} className="cursor-grab touch-none p-1 hover:bg-accent/50 rounded">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <QueueCard
          post={post}
          currentUser={currentUser}
          onRemove={onUnsave}
        />
      </div>
    </div>
  )
}

interface QueueFeedProps {
  initialPosts: Post[]
}

export function QueueFeed({ initialPosts }: QueueFeedProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [supabase] = useState(() => createClient())
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [supabase])

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = posts.findIndex((p) => p.id === active.id)
      const newIndex = posts.findIndex((p) => p.id === over.id)
      const newOrder = arrayMove(posts, oldIndex, newIndex)
      setPosts(newOrder)

      const postIds = newOrder.map((p) => p.id)
      const { error } = await supabase.rpc("reorder_user_queue", { post_ids: postIds })

      if (error) {
        toast.error("Failed to reorder queue. Please try again.")
        // Revert to old order on failure
        setPosts(posts)
      } else {
        toast.success("Queue reordered!")
      }
    }
  }

  const handleUnsave = (postId: string) => {
    const newPosts = posts.filter((p) => p.id !== postId)
    setPosts(newPosts)
    // The reorder RPC will handle removing it from the queue on the next drag
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Your queue is empty</p>
          <p className="text-sm text-muted-foreground">Add posts to your queue to listen to them later.</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={posts} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {posts.map((post) => (
            <SortablePostItem key={post.id} post={post} currentUser={currentUser} onUnsave={handleUnsave} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}