"use client"

import { useState } from "react"
import { QueueFeed } from "./queue-feed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Post } from "@/lib/types"

interface QueuePageContentProps {
  initialPosts: Post[]
}

export function QueuePageContent({ initialPosts }: QueuePageContentProps) {
  const [activeTab, setActiveTab] = useState("queue")

  return (
    <div className="flex flex-col h-full">
      <header className="border-b bg-card p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-foreground">My Queue</h1>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-4 border-b">
          <TabsList>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="queue" className="flex-1 overflow-auto mt-0">
          <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
            <p className="text-muted-foreground mb-4">
              You have {initialPosts.length} item(s) in your queue. Drag to reorder.
            </p>
            <div className="max-w-2xl mx-auto">
              <QueueFeed initialPosts={initialPosts} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="completed" className="flex-1 overflow-auto mt-0">
          <div className="max-w-4xl mx-auto p-6 pb-14 md:pb-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Completed episodes will appear here.</p>
              <p className="text-sm text-muted-foreground mt-2">This feature will be implemented soon.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
