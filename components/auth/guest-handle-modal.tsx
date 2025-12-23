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

const handleSchema = z.object({
  username: z.string().min(3, "Handle must be at least 3 characters").max(20, "Handle must be 20 characters or less").regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores"),
})

type HandleFormValues = z.infer<typeof handleSchema>

interface GuestHandleModalProps {
  onSuccess: () => void
}

export function GuestHandleModal({ onSuccess }: GuestHandleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [supabase] = useState(() => createClient())

  const form = useForm<HandleFormValues>({
    resolver: zodResolver(handleSchema),
  })

  const onSubmit = async (values: HandleFormValues) => {
    setIsSubmitting(true)
    const loadingToast = toast.loading("Creating your handle...")

    try {
      // 1. Check if username is unique
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', values.username)
        .single()

      if (existingUser) {
        form.setError("username", { type: "manual", message: "This handle is already taken." })
        toast.dismiss(loadingToast)
        setIsSubmitting(false)
        return
      }
       if (checkError && checkError.code !== 'PGRST116') { // PGRST116: no rows found
        throw new Error("Error checking handle. Please try again.")
      }

      // 2. Sign in anonymously
      const { data: { user }, error: anonError } = await supabase.auth.signInAnonymously()
      if (anonError || !user) throw anonError || new Error("Could not create guest account.")

      // 3. Create the user profile with the handle
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          id: user.id,
          username: values.username,
          display_name: values.username,
        })
      
      if (profileError) throw profileError

      toast.success("Welcome! Your handle is created.")
      onSuccess()

    } catch (error) {
      console.error("Guest setup error:", error)
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.")
      // Clean up failed anonymous user if necessary
      await supabase.auth.signOut()
    } finally {
      toast.dismiss(loadingToast)
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Welcome to PodBridge!</DialogTitle>
          <DialogDescription>
            Create a unique handle to start building your feed. You can create an account later to save it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Choose a Handle</Label>
            <Input id="username" placeholder="your_handle" {...form.register("username")} />
            {form.formState.errors.username && <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Listening
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}