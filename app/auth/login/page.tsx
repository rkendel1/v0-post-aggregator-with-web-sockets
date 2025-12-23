"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { useRouter } from "next/navigation"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-center text-2xl font-bold">Sign In or Sign Up</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Access your account to manage settings and your feed.
          </p>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="light"
            providers={[]}
          />
        </div>
      </div>
    </div>
  )
}