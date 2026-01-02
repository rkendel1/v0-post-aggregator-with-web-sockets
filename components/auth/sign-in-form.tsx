"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { GoogleIcon, AppleIcon, DiscordIcon } from "@/components/auth/oauth-icons"

interface SignInFormProps {
  onSuccess?: () => void
  onSwitchToSignUp?: () => void
  redirectTo?: string
}

export function SignInForm({ onSuccess, onSwitchToSignUp, redirectTo }: SignInFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [supabase] = useState(() => createClient())

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Signed in successfully!")
        onSuccess?.()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address")
      return
    }

    setIsResettingPassword(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Password reset email sent! Check your inbox.")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleOAuthSignIn = async (provider: "google" | "apple" | "discord") => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast.error(error.message)
        setIsLoading(false)
      }
      // Don't set loading to false here as the page will redirect
    } catch (error) {
      toast.error("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn("apple")}
          disabled={isLoading}
        >
          <AppleIcon className="mr-2 h-4 w-4" />
          Continue with Apple
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn("discord")}
          disabled={isLoading}
        >
          <DiscordIcon className="mr-2 h-4 w-4" />
          Continue with Discord
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="text-center space-y-2">
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={isResettingPassword}
          className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          {isResettingPassword ? "Sending..." : "Forgot your password?"}
        </button>
      </div>

      {onSwitchToSignUp && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Don't have an account?{" "}
            <span className="underline-offset-4 hover:underline font-medium">Sign up</span>
          </button>
        </div>
      )}
    </div>
  )
}
