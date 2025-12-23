"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ConnectedAccount, Platform } from "@/lib/types"
import { Check, X, RefreshCw, Link2, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ConnectedAccountsManagerProps {
  connectedAccounts: ConnectedAccount[]
  availablePlatforms: Platform[]
}

export function ConnectedAccountsManager({
  connectedAccounts: initialAccounts,
  availablePlatforms,
}: ConnectedAccountsManagerProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const handleConnect = async (platform: Platform) => {
    setIsConnecting(platform.id)
    // TODO: Implement OAuth flow for each platform
    // For now, we'll create a mock connection
    const mockUsername = `user_${Math.random().toString(36).substring(7)}`

    const { data, error } = await supabase
      .from("connected_accounts")
      .insert({
        platform_id: platform.id,
        platform_user_id: mockUsername,
        platform_username: mockUsername,
        is_active: true,
      })
      .select(`
        *,
        platforms (*)
      `)
      .single()

    if (!error && data) {
      setAccounts([...accounts, data as ConnectedAccount])
    }

    setIsConnecting(null)
    router.refresh()
  }

  const handleDisconnect = async (accountId: string) => {
    const { error } = await supabase.from("connected_accounts").delete().eq("id", accountId)

    if (!error) {
      setAccounts(accounts.filter((acc) => acc.id !== accountId))
    }

    router.refresh()
  }

  const handleToggleActive = async (account: ConnectedAccount) => {
    const { error } = await supabase
      .from("connected_accounts")
      .update({ is_active: !account.is_active })
      .eq("id", account.id)

    if (!error) {
      setAccounts(accounts.map((acc) => (acc.id === account.id ? { ...acc, is_active: !acc.is_active } : acc)))
    }

    router.refresh()
  }

  const isConnected = (platformId: string) => {
    return accounts.some((acc) => acc.platform_id === platformId)
  }

  return (
    <div className="space-y-6">
      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your social media connections for aggregating and posting content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts connected yet</p>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{account.platforms?.icon}</div>
                  <div>
                    <div className="font-medium">{account.platforms?.display_name}</div>
                    <div className="text-sm text-muted-foreground">@{account.platform_username}</div>
                  </div>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(account)}>
                    {account.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect(account.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Available Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Connect New Account</CardTitle>
          <CardDescription>Connect additional platforms to aggregate content from multiple sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePlatforms.map((platform) => {
              const connected = isConnected(platform.id)
              return (
                <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{platform.icon}</div>
                    <div>
                      <div className="font-medium">{platform.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {platform.supports_read && "Read"} {platform.supports_read && platform.supports_write && "•"}{" "}
                        {platform.supports_write && "Write"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={connected || isConnecting === platform.id}
                    onClick={() => handleConnect(platform)}
                  >
                    {isConnecting === platform.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : connected ? (
                      "Connected"
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}