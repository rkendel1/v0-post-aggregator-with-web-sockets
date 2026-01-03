# AI Editor Rules for PodBridge

This document outlines the technical stack, core concepts, and mandatory library usage rules for maintaining consistency and quality in the PodBridge application.

**For complete documentation, see:**
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)** - Known issues

## Application Overview

PodBridge is a Twitter-like community platform designed to organize podcasts and creators. It allows users to follow specific shows, creators, or topics through a system of "Show Tags". The platform aggregates content from various sources and provides a centralized community hub for each tag.

A key feature is providing each creator/show with a dedicated subdomain (e.g., `https://huberman-lab.podbridge.app`), creating a branded space for their community and content.

## Core Concepts

### 1. Show Tags

- **Central Organizing Principle**: Everything in the app revolves around `show_tags`. A show tag represents a podcast, creator, or specific topic (e.g., `#JoeRogan`, `#HubermanLab`).
- **Database Link**: All content, such as posts, episodes, and comments, is associated with a `show_tag_id` in the database.
- **Tag-based Feeds**: The primary user experience is consuming feeds based on the `show_tags` they follow.

### 2. Creator Subdomains & Routing

- **Platform**: The application is deployed on Vercel, which handles wildcard subdomains.
- **Subdomain Structure**: Each `show_tag` can have a corresponding subdomain. For a tag like `huberman-lab`, the URL is `https://huberman-lab.podbridge.app`.
- **Routing Middleware**: The `middleware.ts` file is responsible for routing. It rewrites requests from a subdomain like `creator-slug.podbridge.app` to the internal Next.js route `/show/creator-slug`.
- **Canonical Page**: The single source of truth for a creator's page is `app/show/[showTag]/page.tsx`. The `[showTag]` slug from the URL is used to fetch the corresponding record from the `show_tags` table.
- **Consistent Linking**: When creating links to a show's page, always use the path `/show/[tag-slug]`. This ensures routing works correctly both on the main domain and on subdomains.

## Technical Stack Overview

1. **Framework**: Next.js 16, utilizing the App Router.
2. **Deployment**: Vercel, for seamless deployment and wildcard subdomain management.
3. **Language**: TypeScript is mandatory for all application code.
4. **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Realtime subscriptions via WebSockets, Supabase Auth).
5. **Styling**: Tailwind CSS v4 is the sole styling utility. All components must be styled using Tailwind classes.
6. **UI Library**: shadcn/ui components (built on Radix UI primitives) are used for all standard UI elements.
7. **Icons**: All icons must be sourced from the `lucide-react` package.
8. **Date Management**: The `date-fns` library is used for all date and time manipulation and formatting.
9. **Data Access**: Supabase client wrappers (`@/lib/supabase/client` and `@/lib/supabase/server`) must be used for all database interactions.
10. **Forms**: `react-hook-form` with `zod` for validation.

## Mandatory Library Usage Rules

| Purpose | Mandatory Library/Tool | Notes |
| :--- | :--- | :--- |
| **UI Components** | `shadcn/ui` (Radix UI) | Always prioritize existing shadcn components. Add new components via CLI: `npx shadcn-ui@latest add <component>` |
| **Styling** | Tailwind CSS v4 | Use Tailwind classes exclusively for all styling. Ensure designs are responsive. No custom CSS files. |
| **Icons** | `lucide-react` | Do not use external icon libraries. Import from lucide-react only. |
| **Date/Time** | `date-fns` | Use for formatting and distance calculations (e.g., `formatDistanceToNow`, `format`). |
| **Client-side DB Access** | `@/lib/supabase/client` | Use this wrapper for all client-side Supabase interactions (React components, client hooks, real-time subscriptions). |
| **Server-side DB Access** | `@/lib/supabase/server` | Use this wrapper for all server-side Supabase interactions (Server Components, API routes, server actions). |
| **Forms** | `react-hook-form` & `zod` | Use for complex form validation and state management. Zod for schema validation. |
| **Edge Functions Auth** | `supabase/functions/_shared/auth.ts` | Use the shared utility for JWT verification in Deno Edge Functions. |

## Development Guidelines

### Database Access Pattern

**Client-side (React Components):**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data, error } = await supabase.from('posts').select('*')
```

**Server-side (Server Components, API Routes):**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase.from('posts').select('*')
```

### Real-time Subscriptions

Always clean up subscriptions:
```typescript
useEffect(() => {
  const supabase = createClient()
  const channel = supabase.channel('posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, 
      (payload) => { /* handle */ }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

### TypeScript

- Use explicit types, avoid `any`
- Define interfaces in `lib/types.ts` for shared types
- Use `type` for unions/intersections, `interface` for objects

### Component Structure

- Functional components only
- Use hooks for state and side effects
- Keep components focused and small
- Extract reusable logic to custom hooks in `lib/hooks/`

## Important Notes

### Database Schema Legacy

⚠️ **Known Issue**: The database still uses `cash_tags` as the table name (from original design), but the application refers to them as `show_tags`. This is documented in [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md).

When querying:
- Table name: `cash_tags` in Supabase queries
- Foreign key columns: `cash_tag_id` in database
- Application references: Use "show tag" in UI and variable names
- TypeScript types: Use `ShowTag` interface

### Row Level Security

All database tables use RLS policies:
- Public read for browsing (show_tags, posts, etc.)
- Authenticated write for user actions
- User-scoped for personal data (saved_posts, user_follows, etc.)

Always rely on RLS for security, never client-side checks alone.

## File Structure Rules

```
/app                    # Next.js App Router pages
  /[username]          # User profile pages
  /admin               # Admin tools
  /api                 # API routes
  /auth                # Auth pages
  /post/[postId]       # Post detail pages
  /queue               # User queue
  /saved               # Saved posts
  /settings            # User settings
  /show/[showTag]      # Show pages (main content)
  layout.tsx           # Root layout
  page.tsx             # Home page

/components            # React components
  /audio               # Audio player
  /auth                # Auth UI
  /layout              # Header, sidebar, footer
  /post-aggregator     # Feed and post components
  /profile             # User profiles
  /queue               # Queue management
  /settings            # Settings UI
  /ui                  # shadcn/ui components

/lib                   # Utilities
  /hooks               # Custom React hooks
  /supabase            # Supabase clients
  /utils               # Utility functions
  types.ts             # TypeScript types
  utils.ts             # General utils

/scripts               # Database migrations (run in order)
/docs                  # Documentation
  /guides              # Feature guides
  /archive             # Historical docs
```

## Migration Scripts

Database changes must be done through numbered migration scripts in `/scripts/`:

- Run in numerical order: 001, 002, 003, etc.
- Each script should be idempotent where possible
- Include RLS policies with table creation
- Document breaking changes in migration README files

Current latest: `014_fix_user_profiles_foreign_keys.sql`

## See Also

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development setup guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation  
- **[TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)** - Known issues and gaps
- **[docs/guides/](./docs/guides/)** - Feature-specific implementation guides