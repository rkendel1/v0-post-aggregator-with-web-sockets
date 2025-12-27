import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { TagManager } from "@/components/admin/tag-manager"
import type { ShowTag } from "@/lib/types"
import { Toaster } from "react-hot-toast"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function AdminTagsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // In a real app, you'd protect this route for admins only.
  // For now, we'll assume the user is authorized.

  const { data: tags, error } = await supabase
    .from("show_tags")
    .select("*")
    .order("tag", { ascending: true })

  if (error) {
    console.error("Error fetching tags for admin:", error)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to feed</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tag Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage show tags and their canonical/alias relationships for subdomains.
            </p>
          </div>
        </div>
        <TagManager initialTags={(tags as ShowTag[]) || []} />
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}