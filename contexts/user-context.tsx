"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/types"
import { User } from "@supabase/supabase-js"

interface UserContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  isGuest: boolean
  isProfileSetupNeeded: boolean
  reloadProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileSetupNeeded, setIsProfileSetupNeeded] = useState(false)

  const isGuest = user?.is_anonymous ?? false

  const loadDataForUser = useCallback(
    async (currentUser: User | null) => {
      setIsLoading(true)
      setIsProfileSetupNeeded(false)

      if (currentUser) {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()
        
        setProfile((profileData as UserProfile) || null)

        if (profileData) {
          if (!currentUser.is_anonymous && !profileData.username) {
            setIsProfileSetupNeeded(true)
          }
        } else {
          if (!currentUser.is_anonymous) {
            setIsProfileSetupNeeded(true)
          }
        }
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    },
    [supabase],
  )

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      loadDataForUser(currentUser)
    })

    return () => subscription.unsubscribe()
  }, [supabase, loadDataForUser])

  const reloadProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser)
    await loadDataForUser(currentUser)
  }, [supabase, loadDataForUser])

  const value = { user, profile, isLoading, isGuest, isProfileSetupNeeded, reloadProfile }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}