"use client"

import { Home, ListMusic, Bookmark, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'podbridge.app'
  const baseUrl = `https://${rootDomain}`

  const navItems = [
    { href: baseUrl, icon: Home, label: "Home" },
    { href: "/queue", icon: ListMusic, label: "Queue" },
    { href: "/saved", icon: Bookmark, label: "Saved" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm md:hidden z-40">
      <nav className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === baseUrl && pathname === '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center h-full w-full transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary",
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "fill-current")} />
              <span className={cn("text-[10px] mt-0.5", isActive && "font-semibold")}>{item.label}</span>
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-b-full" />}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}