"use client"

import { useState, ReactNode } from "react"
import { ShowTagSidebar } from "@/components/post-aggregator/show-tag-sidebar"
import { MobileNav } from "@/components/post-aggregator/mobile-nav"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import { useFeedManager } from "@/lib/hooks/use-feed-manager"
import type { ShowTag } from "@/lib/types"
import { FeedManagementModal } from "@/components/post-aggregator/feed-management-modal"
import { PageHeader } from "./page-header"

interface AppLayoutProps {
  children: React.ReactNode
  showTags?: ShowTag[]
  pageTitle?: string | ReactNode
  pageSubtitle?: string | ReactNode
  pageTabs?: ReactNode
  pageActions?: ReactNode
}

/**
 * AppLayout provides consistent navigation across all pages:
 * - Desktop: Sidebar always visible
 * - Mobile: Hamburger menu + bottom navigation
 * - Consistent page header with title, tabs, and actions
 */
export function AppLayout({ 
  children, 
  showTags = [],
  pageTitle,
  pageSubtitle,
  pageTabs,
  pageActions,
}: AppLayoutProps) {
  const { profile } = useUser()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  
  const {
    feedTags,
    allAvailableTags,
    addTagToFeed,
    removeTagFromFeed,
    addNewAvailableTag,
  } = useFeedManager(showTags)

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar - Always visible on md+ screens */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 h-screen transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <ShowTagSidebar
          feedTags={feedTags}
          selectedFeedId={null} // No selection - AppLayout sidebar is for navigation only, not feed filtering
          profile={profile}
          onSelectFeed={() => {
            setIsSidebarOpen(false)
          }}
          onOpenManager={() => {
            setIsManagerOpen(true)
            setIsSidebarOpen(false)
          }}
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header with title, tabs, and actions */}
        {pageTitle && (
          <PageHeader
            title={pageTitle}
            subtitle={pageSubtitle}
            tabs={pageTabs}
            actions={pageActions}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        )}

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* Feed management modal */}
      {isManagerOpen && (
        <FeedManagementModal
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
          feedTags={feedTags}
          allAvailableTags={allAvailableTags}
          isAnonymous={false}
          profile={profile}
          addTagToFeed={addTagToFeed}
          removeTagFromFeed={removeTagFromFeed}
          migrateAnonymousFeed={async () => {
            // No-op: Anonymous feed migration is handled in PostAggregator context.
            // AppLayout is only used for authenticated pages (Queue, Saved, Settings, Show)
            // where users are already logged in and migration is not applicable.
          }}
          addNewAvailableTag={addNewAvailableTag}
        />
      )}
    </div>
  )
}
