"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Copy } from "lucide-react"
import toast from "react-hot-toast"
import type { ShowTag } from "@/lib/types"
import { User } from "@supabase/supabase-js"

interface ClaimPageModalProps {
  isOpen: boolean
  onClose: () => void
  showTag: ShowTag
  user: User
}

export function ClaimPageModal({ isOpen, onClose, showTag, user }: ClaimPageModalProps) {
  const [isVerifying, setIsVerifying] = useState(false)

  // Generate a stable, unique verification code for the user and tag
  const verificationCode = useMemo(() => {
    return `podbridge-verify:${user.id.slice(0, 8)}-${showTag.id.slice(0, 8)}`
  }, [user.id, showTag.id])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(verificationCode)
    toast.success("Verification code copied to clipboard!")
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    // In a real application, this would trigger a backend process
    // to fetch and check the RSS feed for the verification code.
    // For now, we'll simulate the process.
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    toast.success("Verification request submitted! We'll notify you once it's reviewed.")
    setIsVerifying(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Claim Page for #{showTag.tag}</DialogTitle>
          <DialogDescription>
            Verify your ownership to manage this page and get access to creator tools.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Step 1: Add Verification Code</Label>
            <p className="text-sm text-muted-foreground">
              Copy the code below and add it to the description of your podcast in your podcast hosting platform's RSS feed settings.
            </p>
            <div className="flex items-center gap-2">
              <Input id="verification-code" value={verificationCode} readOnly />
              <Button type="button" variant="outline" size="icon" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Step 2: Verify Ownership</Label>
            <p className="text-sm text-muted-foreground">
              Once you've updated your RSS feed, click the verify button. It may take a few minutes for your feed to update.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleVerify} disabled={isVerifying}>
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}