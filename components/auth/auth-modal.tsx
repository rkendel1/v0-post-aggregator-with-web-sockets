"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SignInForm } from "@/components/auth/sign-in-form"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultMode?: "signin" | "signup"
}

export function AuthModal({ isOpen, onClose, onSuccess, defaultMode = "signup" }: AuthModalProps) {
  const [supabase] = useState(() => createClient())
  const [activeTab, setActiveTab] = useState(defaultMode)

  // Listen for auth state changes to close the modal on successful sign-in
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        onSuccess()
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, onSuccess])

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultMode)
    }
  }, [isOpen, defaultMode])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {activeTab === "signin" ? "Welcome back" : "Save Your Feed"}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to access your saved feed and settings
            </p>
            <SignInForm 
              onSuccess={onSuccess}
              onSwitchToSignUp={() => setActiveTab("signup")}
              redirectTo={window.location.origin}
            />
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Create a free account in seconds to save your custom feed, sync across devices, and unlock sharing features.
            </p>
            <SignUpForm 
              onSuccess={onSuccess}
              onSwitchToSignIn={() => setActiveTab("signin")}
              redirectTo={window.location.origin}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}