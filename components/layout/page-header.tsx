"use client"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Menu } from "lucide-react"
import { ReactNode } from "react"

interface PageHeaderProps {
  title: string | ReactNode
  subtitle?: string | ReactNode
  onMenuClick?: () => void
  tabs?: ReactNode
  actions?: ReactNode
  showMenuButton?: boolean
}

/**
 * Reusable page header component that includes:
 * - Hamburger menu button (on mobile when showMenuButton is true)
 * - Page title and optional subtitle
 * - Optional tabs below the title
 * - Logo
 * - Optional action buttons
 */
export function PageHeader({
  title,
  subtitle,
  onMenuClick,
  tabs,
  actions,
  showMenuButton = true,
}: PageHeaderProps) {
  return (
    <header className="border-b bg-card sticky top-0 z-30">
      <div className="p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            {showMenuButton && onMenuClick && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden flex-shrink-0"
                onClick={onMenuClick}
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              {typeof title === "string" ? (
                <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
              ) : (
                title
              )}
              {subtitle && (
                <div className="text-sm text-muted-foreground mt-1">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
            <Logo />
          </div>
        </div>
        {tabs && <div className="mt-2">{tabs}</div>}
      </div>
    </header>
  )
}
