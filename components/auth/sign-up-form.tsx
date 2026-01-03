"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { GoogleIcon, DiscordIcon } from "@/components/auth/oauth-icons"
import { getOAuthCallbackUrl, getAuthRedirectUrl } from "@/lib/auth-helpers"

interface SignUpFormProps {
  onSuccess?: () => void
  onSwitchToSignIn?: () => void
  redirectTo?: string
}

export function SignUpForm({ onSuccess, onSwitchToSignIn, redirectTo }: SignUpFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [supabase] = useState(() => createClient())

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      // Get the subdomain URL to redirect back to after email verification
      const originUrl = getAuthRedirectUrl()
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Always use main domain for email confirmation callback
          emailRedirectTo: redirectTo || `${getOAuthCallbackUrl()}?next=${encodeURIComponent(originUrl)}`,
        },
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Account created! Please check your email to verify your account.")
        onSuccess?.()
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignUp = async (provider: "google" | "discord") => {
    setIsLoading(true)
    try {
      // Get the subdomain URL to redirect back to after auth
      const originUrl = getAuthRedirectUrl()
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Always use main domain for OAuth callback to avoid redirect URI mismatch
          redirectTo: redirectTo || `${getOAuthCallbackUrl()}?next=${encodeURIComponent(originUrl)}`,
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
          onClick={() => handleOAuthSignUp("google")}
          disabled={isLoading}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Sign up with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignUp("discord")}
          disabled={isLoading}
        >
          <DiscordIcon className="mr-2 h-4 w-4" />
          Sign up with Discord
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

      <form onSubmit={handleSignUp} className="space-y-4">
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
          <Label htmlFor="password">Create a Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign up
        </Button>
      </form>

      {onSwitchToSignIn && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Already have an account?{" "}
            <span className="underline-offset-4 hover:underline font-medium">Sign in</span>
          </button>
        </div>
      )}
    </div>
  )
}
