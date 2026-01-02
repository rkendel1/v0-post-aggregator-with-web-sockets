"use client"

import { ReactNode } from "react"
import { AppLayout } from "./app-layout"
import type { ShowTag } from "@/lib/types"

interface AppLayoutClientProps {
  children: React.ReactNode
  showTags?: ShowTag[]
  pageTitle?: string | ReactNode
  pageSubtitle?: string | ReactNode
  pageTabs?: ReactNode
  pageActions?: ReactNode
}

/**
 * Client-side wrapper for AppLayout that can accept ReactNode props
 * Use this when you need to pass client-side components as header props
 */
export function AppLayoutClient({
  children,
  showTags,
  pageTitle,
  pageSubtitle,
  pageTabs,
  pageActions,
}: AppLayoutClientProps) {
  return (
    <AppLayout
      showTags={showTags}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      pageTabs={pageTabs}
      pageActions={pageActions}
    >
      {children}
    </AppLayout>
  )
}
