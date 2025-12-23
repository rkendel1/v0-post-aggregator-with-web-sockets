"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, LogOut } from "lucide-react"
import toast from "react-hot-toast"

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be 20 characters or less")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(50, "Display name must be 50 characters or less"),
  bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileSettingsProps {
  profile: UserProfile
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile.username || "",
      display_name: profile.display_name || "",
      bio: profile.bio || "",
    },
  })

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true)

    // Check if username is unique if it has changed
    if (values.username !== profile.username) {
      const { data: existingUser, error: checkError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("username", values.username)
        .not("id", "eq", profile.id)
        .single()

      if (existingUser) {
        form.setError("username", { type: "manual", message: "This username is already taken." })
        setIsSubmitting(false)
        return
      }
      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116: no rows found
        toast.error("Error checking username. Please try again.")
        setIsSubmitting(false)
        return
      }
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({
        username: values.username,
        display_name: values.display_name,
        bio: values.bio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)

    if (error) {
      toast.error("Failed to update profile.")
      console.error(error)
    } else {
      toast.success("Profile updated successfully!")
      router.refresh()
    }
    setIsSubmitting(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your public profile and account settings.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username (handle)</Label>
            <Input id="username" {...form.register("username")} />
            {form.formState.errors.username && <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input id="display_name" {...form.register("display_name")} />
            {form.formState.errors.display_name && (
              <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" {...form.register("bio")} placeholder="Tell us a little about yourself" />
            {form.formState.errors.bio && <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}