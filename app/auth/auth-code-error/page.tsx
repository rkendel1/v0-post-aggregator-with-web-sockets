import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm text-center space-y-4">
          <h1 className="text-2xl font-bold">Authentication Error</h1>
          <p className="text-muted-foreground">
            There was an error during authentication. This could be due to an expired or invalid authentication code.
          </p>
          <p className="text-sm text-muted-foreground">
            Please try signing in again.
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/login">Return to Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
