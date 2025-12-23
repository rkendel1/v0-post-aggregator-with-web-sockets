"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be 20 characters or less").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(50, "Display name must be 50 characters or less").optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

interface ProfileSetupModalProps {
  onSave: () => void
}

export function ProfileSetupModal({ onSave }: ProfileSetupModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  })

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("You must be logged in.")
      setIsSubmitting(false)
      return
    }

    // Check if username is unique
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', values.username)
      .not('id', 'eq', user.id)
      .single()

    if (existingUser) {
      form.setError("username", { type: "manual", message: "This username is already taken." })
      setIsSubmitting(false)
      return
    }
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116: no rows found
        toast.error("Error checking username. Please try again.")
        setIsSubmitting(false)
        return
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({
        username: values.username,
        display_name: values.display_name || values.username,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) {
      toast.error("Failed to update profile.")
      console.error(error)
    } else {
      toast.success("Profile updated!")
      onSave()
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Welcome! Set up your profile.</DialogTitle>
          <DialogDescription>
            Choose a unique handle to start participating.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username (handle)</Label>
            <Input id="username" placeholder="your_handle" {...form.register("username")} />
            {form.formState.errors.username && <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name (optional)</Label>
            <Input id="display_name" placeholder="Your Name" {...form.register("display_name")} />
            {form.formState.errors.display_name && <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}