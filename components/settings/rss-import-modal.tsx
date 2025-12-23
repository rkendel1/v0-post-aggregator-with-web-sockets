"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RssImportManager } from "@/components/settings/rss-import-manager"
import { UserRssFeed } from "@/lib/types"

interface RssImportModalProps {
  isOpen: boolean
  onClose: () => void
  initialRssFeeds: UserRssFeed[]
  onImportSuccess: () => void
}

export function RssImportModal({ isOpen, onClose, initialRssFeeds, onImportSuccess }: RssImportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import & Manage RSS Feeds</DialogTitle>
          <DialogDescription>
            Import your podcast subscriptions via OPML file or a single RSS URL.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <RssImportManager initialRssFeeds={initialRssFeeds} onImportSuccess={onImportSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  )
}