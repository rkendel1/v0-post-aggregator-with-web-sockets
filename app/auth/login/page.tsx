"use client"

import { Suspense, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Logo } from "@/components/logo"
import { SignInForm } from "@/components/auth/sign-in-form"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function LoginPageContent() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("mode") === "signup" ? "signup" : "signin")

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Redirect to home page after successful login
        router.push("/")
        router.refresh() // Refresh the page to ensure server components re-render
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const handleSuccess = () => {
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to access your account and feed
                </p>
              </div>
              <SignInForm 
                onSuccess={handleSuccess}
                onSwitchToSignUp={() => setActiveTab("signup")}
              />
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold">Create an account</h1>
                <p className="text-sm text-muted-foreground">
                  Join to save your feed and sync across devices
                </p>
              </div>
              <SignUpForm 
                onSuccess={handleSuccess}
                onSwitchToSignIn={() => setActiveTab("signin")}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}