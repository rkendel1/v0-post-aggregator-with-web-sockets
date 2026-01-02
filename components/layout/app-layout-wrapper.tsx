import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { ShowTag } from "@/lib/types"
import { AppLayout } from "./app-layout"

interface AppLayoutWrapperProps {
  children: React.ReactNode
}

/**
 * Server component that fetches show tags and wraps content with AppLayout
 */
export async function AppLayoutWrapper({ children }: AppLayoutWrapperProps) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch all available show tags
  const { data: showTags } = await supabase
    .from("show_tags")
    .select("*")
    .order("name")

  return (
    <AppLayout showTags={(showTags as ShowTag[]) || []}>
      {children}
    </AppLayout>
  )
}
