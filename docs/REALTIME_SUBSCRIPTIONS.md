# Realtime Subscriptions Best Practices

This document outlines best practices for using Supabase Realtime subscriptions in the PodBridge application to prevent memory leaks and ensure optimal performance.

## Table of Contents

- [Overview](#overview)
- [Common Pitfalls](#common-pitfalls)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

Supabase Realtime allows components to subscribe to database changes via WebSocket connections. Proper management of these subscriptions is critical to prevent:

- **Memory leaks** in long-running sessions
- **Multiple subscriptions** for the same data
- **Increased WebSocket connections** that can degrade performance
- **Stale closures** that reference outdated state

## Common Pitfalls

### 1. Unstable Dependencies in useEffect

**❌ BAD:**
```typescript
const [supabase] = useState(() => createClient())

useEffect(() => {
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, handler)
    .subscribe()
    
  return () => {
    supabase.removeChannel(channel)
  }
}, [supabase]) // ❌ supabase in dependencies causes re-subscriptions
```

**✅ GOOD:**
```typescript
const supabaseRef = useRef(createClient())

useEffect(() => {
  const supabase = supabaseRef.current
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, handler)
    .subscribe()
    
  return () => {
    supabase.removeChannel(channel)
  }
}, []) // ✅ No unstable dependencies
```

### 2. Callback Functions in Dependencies

**❌ BAD:**
```typescript
const fetchData = useCallback(async () => {
  // fetch logic
}, [supabase])

useEffect(() => {
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, () => {
      fetchData() // ❌ Using callback directly
    })
    .subscribe()
    
  return () => supabase.removeChannel(channel)
}, [fetchData]) // ❌ Callback in dependencies causes re-subscriptions
```

**✅ GOOD:**
```typescript
const fetchData = useCallback(async () => {
  const supabase = supabaseRef.current
  // fetch logic
}, [postId]) // Only essential dependencies

const fetchDataRef = useRef(fetchData)
useEffect(() => {
  fetchDataRef.current = fetchData
}, [fetchData])

useEffect(() => {
  const supabase = supabaseRef.current
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, () => {
      fetchDataRef.current() // ✅ Using ref to latest callback
    })
    .subscribe()
    
  return () => supabase.removeChannel(channel)
}, [postId]) // ✅ Only essential dependencies
```

### 3. Missing Cleanup Functions

**❌ BAD:**
```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, handler)
    .subscribe()
  // ❌ No cleanup - subscription never removed!
}, [])
```

**✅ GOOD:**
```typescript
useEffect(() => {
  const supabase = supabaseRef.current
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, handler)
    .subscribe()
    
  return () => {
    supabase.removeChannel(channel) // ✅ Always cleanup
  }
}, [])
```

## Best Practices

### 1. Use `useRef` for Supabase Client

Always create the Supabase client using `useRef` to ensure it remains stable across re-renders:

```typescript
const supabaseRef = useRef(createClient())
```

### 2. Minimize Dependencies

Only include essential dependencies in the `useEffect` dependency array. Avoid including:
- Supabase client instances
- Callback functions (use refs instead)
- Objects or arrays that change on every render

### 3. Always Provide Cleanup

Every subscription **must** have a cleanup function:

```typescript
useEffect(() => {
  const supabase = supabaseRef.current
  const channel = supabase.channel('channel-name').subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}, [dependencies])
```

### 4. Use Unique Channel Names

Ensure each subscription has a unique channel name to avoid conflicts:

```typescript
// ✅ Good - unique per resource
const channel = supabase.channel(`posts:${postId}`)

// ❌ Bad - generic name may conflict
const channel = supabase.channel('posts')
```

### 5. Use the Custom Hook (Recommended)

For consistent subscription management, use the `useRealtimeSubscription` hook:

```typescript
import { useRealtimeSubscription } from '@/lib/hooks/use-realtime-subscription'

useRealtimeSubscription(
  `posts:${postId}`,
  (channel) => {
    return channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      handleInsert
    )
  },
  [postId] // Only essential dependencies
)
```

## Examples

### Example 1: Simple Subscription

```typescript
import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

function MyComponent({ postId }: { postId: string }) {
  const supabaseRef = useRef(createClient())
  
  useEffect(() => {
    const supabase = supabaseRef.current
    
    const channel = supabase
      .channel(`post:${postId}`)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "posts",
          filter: `id=eq.${postId}`
        },
        (payload) => {
          console.log("Post updated:", payload)
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])
  
  return <div>...</div>
}
```

### Example 2: Multiple Subscriptions

```typescript
import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

function MyComponent({ postId }: { postId: string }) {
  const supabaseRef = useRef(createClient())
  
  useEffect(() => {
    const supabase = supabaseRef.current
    
    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel(`reactions:${postId}`)
      .on("postgres_changes", { ... }, handleReactions)
      .subscribe()
    
    // Subscribe to comments
    const commentsChannel = supabase
      .channel(`comments:${postId}`)
      .on("postgres_changes", { ... }, handleComments)
      .subscribe()
    
    // Cleanup both channels
    return () => {
      supabase.removeChannel(reactionsChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [postId])
  
  return <div>...</div>
}
```

### Example 3: Subscription with Data Fetching

```typescript
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

function MyComponent({ postId }: { postId: string }) {
  const [data, setData] = useState([])
  const supabaseRef = useRef(createClient())
  
  const fetchData = useCallback(async () => {
    const supabase = supabaseRef.current
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
    setData(data || [])
  }, [postId])
  
  // Store latest fetchData in a ref
  const fetchDataRef = useRef(fetchData)
  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])
  
  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Subscribe to changes
  useEffect(() => {
    const supabase = supabaseRef.current
    
    const channel = supabase
      .channel(`posts:${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          fetchDataRef.current() // Use ref to call latest version
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])
  
  return <div>...</div>
}
```

### Example 4: Conditional Subscription

```typescript
import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

function MyComponent({ 
  postId, 
  isEnabled 
}: { 
  postId: string
  isEnabled: boolean 
}) {
  const supabaseRef = useRef(createClient())
  
  useEffect(() => {
    if (!isEnabled) return // Don't subscribe if disabled
    
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`post:${postId}`)
      .on("postgres_changes", { ... }, handler)
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, isEnabled]) // Include isEnabled in dependencies
  
  return <div>...</div>
}
```

## Troubleshooting

### Issue: Multiple subscriptions being created

**Symptoms:**
- Multiple WebSocket connections in browser DevTools
- Duplicate real-time updates

**Solution:**
- Check useEffect dependencies - remove unstable dependencies
- Ensure supabase client is created with `useRef`, not `useState`
- Verify cleanup function is removing the channel

### Issue: Stale data in subscription handlers

**Symptoms:**
- Subscription handlers use old state values
- Updates don't reflect current component state

**Solution:**
- Use refs to store and access the latest callbacks
- Don't rely on closure-captured state in subscription handlers

### Issue: Subscriptions not cleaning up

**Symptoms:**
- Memory usage increases over time
- Subscriptions persist after component unmount

**Solution:**
- Always include a cleanup function in useEffect
- Use `supabase.removeChannel(channel)` in cleanup
- Verify the cleanup function is being called (add console.log for debugging)

### Debugging Tips

1. **Check active channels:**
```typescript
console.log('Active channels:', supabase.getChannels())
```

2. **Log subscription lifecycle:**
```typescript
useEffect(() => {
  console.log(`[${componentName}] Subscribing to ${channelName}`)
  const channel = supabase.channel(channelName).subscribe()
  
  return () => {
    console.log(`[${componentName}] Unsubscribing from ${channelName}`)
    supabase.removeChannel(channel)
  }
}, [dependencies])
```

3. **Monitor WebSocket connections:**
- Open Browser DevTools → Network → WS filter
- Look for multiple connections or connections that don't close

## Migration Guide

If you have existing code with subscription issues, follow these steps:

1. **Replace `useState` with `useRef` for Supabase client:**
```typescript
// Before:
const [supabase] = useState(() => createClient())

// After:
const supabaseRef = useRef(createClient())
```

2. **Update useEffect to use the ref:**
```typescript
// Before:
useEffect(() => {
  const channel = supabase.channel(...)
}, [supabase])

// After:
useEffect(() => {
  const supabase = supabaseRef.current
  const channel = supabase.channel(...)
}, []) // Remove supabase from dependencies
```

3. **Extract callbacks and use refs:**
```typescript
// Before:
useEffect(() => {
  const channel = supabase.channel(...).on(..., () => fetchData()).subscribe()
}, [fetchData]) // Causes re-subscriptions

// After:
const fetchDataRef = useRef(fetchData)
useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])

useEffect(() => {
  const supabase = supabaseRef.current
  const channel = supabase.channel(...).on(..., () => fetchDataRef.current()).subscribe()
}, []) // No unstable dependencies
```

## See Also

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
- [React useRef Hook](https://react.dev/reference/react/useRef)

---

*Last Updated: 2026-01-03*
