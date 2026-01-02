"use client"

import type { UserProfile } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserProfileViewProps {
  profile: UserProfile
}

export function UserProfileView({ profile }: UserProfileViewProps) {
  // Placeholder values for stats that will be implemented in the future
  const PLACEHOLDER_COUNT = 0
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = profile.display_name || profile.username || "User"
  const username = profile.username || "username"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            Your public profile shows your posts, reactions, comments, and social connections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{displayName}</h2>
              <p className="text-muted-foreground">@{username}</p>
            </div>
          </div>

          {profile.bio && (
            <div>
              <h3 className="font-semibold mb-2">Bio</h3>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{PLACEHOLDER_COUNT}</div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{PLACEHOLDER_COUNT}</div>
              <div className="text-sm text-muted-foreground">Reactions</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{PLACEHOLDER_COUNT}</div>
              <div className="text-sm text-muted-foreground">Following</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{PLACEHOLDER_COUNT}</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Full profile page with posts, reactions, and social features coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
