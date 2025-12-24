"use client"

import { Home, ListMusic, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/queue", icon: ListMusic, label: "Queue" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm md:hidden z-40">
      <nav className="flex justify-around items-center h-14">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center h-full w-full text-muted-foreground hover:text-primary transition-colors",
              pathname === item.href && "text-primary",
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}