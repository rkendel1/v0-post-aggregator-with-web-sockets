"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UserPlus, LogIn } from "lucide-react"

interface AuthPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onContinueAsGuest: () => void
  onSignUp: () => void
  message: string
}

export function AuthPromptModal({ isOpen, onClose, onContinueAsGuest, onSignUp, message }: AuthPromptModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join the Conversation</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Button onClick={onSignUp} className="w-full">
            <LogIn className="mr-2 h-4 w-4" />
            Sign Up or Log In
          </Button>
          <Button onClick={onContinueAsGuest} variant="secondary" className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            Continue as Guest
          </Button>
        </div>
        <DialogFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Signing up lets you save your feed and settings across devices.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}