# PodBridge Architecture

## Overview

PodBridge is a real-time podcast aggregator platform that allows users to follow show and episode tags, aggregate posts from multiple podcast platforms, and engage in social discussions. Built with Next.js, Supabase, and WebSockets for instant updates.

## Core Concepts

### Show Tags

Show Tags are the central organizing principle of PodBridge. Everything revolves around `show_tags`:

- **Definition**: A show tag represents a podcast, creator, or specific topic (e.g., `#JoeRogan`, `#HubermanLab`)
- **Database Link**: All content (posts, episodes, comments) is associated with a `show_tag_id`
- **Tag-based Feeds**: Primary user experience is consuming feeds based on followed tags
- **Naming Convention**: Tags prefixed with # (e.g., #JoeRogan, #Episode2000)

### Subdomain Architecture

Each show tag can have a dedicated branded subdomain:

- **Platform**: Deployed on Vercel with wildcard subdomain support
- **URL Structure**: `https://<tag-slug>.podbridge.app` (e.g., `https://huberman-lab.podbridge.app`)
- **Routing**: `middleware.ts` rewrites `<creator-slug>.podbridge.app` to `/show/<creator-slug>`
- **Canonical Page**: `app/show/[showTag]/page.tsx` is the single source of truth
- **Linking**: Always use `/show/[tag-slug]` for internal links to ensure proper routing

## Technical Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (mandatory)
- **Styling**: Tailwind CSS v4 (exclusive)
- **UI Library**: shadcn/ui (built on Radix UI primitives)
- **Icons**: lucide-react (exclusive)
- **Date Handling**: date-fns

### Backend
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime (WebSocket subscriptions)
- **Authentication**: Supabase Auth
- **Data Access**: 
  - Client-side: `@/lib/supabase/client`
  - Server-side: `@/lib/supabase/server`

### Deployment
- **Platform**: Vercel
- **Features**: Wildcard subdomain support, edge functions

## Database Schema

### Core Tables

#### show_tags (formerly cash_tags)
Primary organizing entity for all content.

```sql
- id: uuid (PK)
- tag: text (unique) - slug format
- name: text - display name
- category: text (nullable)
- claimed_by_user_id: uuid (nullable)
- parent_tag_id: uuid (nullable) - for hierarchical tags
- created_at: timestamp
```

#### posts
User-generated and aggregated content.

```sql
- id: uuid (PK)
- content: text
- author_name: text
- author_avatar: text (nullable)
- user_id: uuid (nullable) - for authenticated posts
- show_tag_id: uuid (FK to show_tags)
- source_id: uuid (FK to sources)
- audio_url: text (nullable) - for podcast episodes
- episode_slug: text (nullable) - auto-generated for episodes
- external_guid: text (nullable) - from RSS feeds
- external_url: text (nullable)
- image_url: text (nullable)
- likes_count: int (default 0)
- created_at: timestamp
```

#### sources
Content source definitions.

```sql
- id: uuid (PK)
- name: text - e.g., 'Twitter', 'Reddit', 'RSS'
- icon: text (nullable) - URL or emoji
- created_at: timestamp
```

### Social Tables

#### comments
Threaded comment system with nested support.

```sql
- id: uuid (PK)
- post_id: uuid (FK to posts)
- parent_comment_id: uuid (nullable, FK to comments)
- user_id: uuid (FK to auth.users)
- content: text
- created_at: timestamp
- updated_at: timestamp
```

#### reactions
Emoji reactions on posts and comments.

```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- post_id: uuid (nullable, FK to posts)
- comment_id: uuid (nullable, FK to comments)
- reaction_type_id: uuid (FK to reaction_types)
- created_at: timestamp
```

#### reaction_types
Available reaction types (Like, Love, Laugh, Wow, Sad, Angry).

```sql
- id: uuid (PK)
- name: text
- emoji: text
- display_order: int
- created_at: timestamp
```

### Following System

#### tag_follows
Users following show tags.

```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- show_tag_id: uuid (FK to show_tags)
- created_at: timestamp
- UNIQUE(user_id, show_tag_id)
```

#### user_follows
Users following other users.

```sql
- id: uuid (PK)
- follower_id: uuid (FK to auth.users)
- following_id: uuid (FK to auth.users)
- created_at: timestamp
- UNIQUE(follower_id, following_id)
```

#### post_follows
Users following specific posts for updates.

```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- post_id: uuid (FK to posts)
- created_at: timestamp
- UNIQUE(user_id, post_id)
```

#### saved_posts
User's saved posts and queue.

```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- post_id: uuid (FK to posts)
- is_saved: boolean (default true)
- queue_position: int (nullable) - for playback queue
- created_at: timestamp
- UNIQUE(user_id, post_id)
```

### Federation Tables

#### connected_accounts
External platform credentials for aggregation and federation.

```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- platform_id: uuid (FK to platforms)
- platform_user_id: text
- platform_username: text (nullable)
- is_active: boolean (default true)
- last_synced_at: timestamp (nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### platforms
Available platforms for connection.

```sql
- id: uuid (PK)
- name: text - internal name
- display_name: text
- icon: text (nullable)
- supports_read: boolean
- supports_write: boolean
- created_at: timestamp
```

#### federated_posts
Outbound posts published to external platforms.

```sql
- id: uuid (PK)
- local_post_id: uuid (FK to posts)
- connected_account_id: uuid (FK to connected_accounts)
- external_post_id: text (nullable)
- external_url: text (nullable)
- status: enum('pending', 'published', 'failed')
- error_message: text (nullable)
- published_at: timestamp (nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### aggregated_posts
Inbound posts from external platforms.

```sql
- id: uuid (PK)
- local_post_id: uuid (nullable, FK to posts)
- connected_account_id: uuid (FK to connected_accounts)
- external_post_id: text
- external_url: text (nullable)
- author_name: text
- author_avatar: text (nullable)
- content: text
- external_created_at: timestamp (nullable)
- synced_at: timestamp
- created_at: timestamp
```

### Community Integration

#### show_community_links
Discord and other community platform links for shows.

```sql
- id: uuid (PK)
- show_tag_id: uuid (FK to show_tags)
- platform: text - 'discord', 'telegram', etc.
- name: text - display name for the link
- description: text (nullable)
- url: text - full URL to community
- is_discord: boolean (nullable)
- discord_server_id: text (nullable)
- created_at: timestamp
```

### User Management

#### user_profiles
Extended user profile information.

```sql
- id: uuid (PK, FK to auth.users)
- username: text (unique, nullable)
- display_name: text (nullable)
- avatar_url: text (nullable)
- bio: text (nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### user_rss_feeds
User-submitted RSS feeds for content aggregation.

```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- show_tag_id: uuid (nullable, FK to show_tags)
- rss_url: text
- title: text
- last_fetched_at: timestamp (nullable)
- created_at: timestamp
```

## Application Structure

### Directory Layout

```
/app                    # Next.js App Router pages
  /[username]          # User profile pages
  /admin               # Admin dashboard and tools
  /api                 # API routes
    /rss               # RSS feed generation
  /auth                # Authentication pages
  /post                # Individual post pages
  /queue               # User's playback queue
  /saved               # User's saved posts
  /settings            # User settings
  /show                # Show tag pages (main content)
    /[showTag]         # Dynamic show page
  layout.tsx           # Root layout
  page.tsx             # Home page

/components            # React components
  /audio               # Audio player components
  /auth                # Authentication UI
  /layout              # Layout components (header, sidebar)
  /post-aggregator     # Main feed and post components
  /profile             # User profile components
  /queue               # Queue management
  /settings            # Settings panels
  /ui                  # shadcn/ui components

/lib                   # Utilities and helpers
  /hooks               # Custom React hooks
  /supabase            # Supabase client wrappers
  /utils               # Utility functions
  types.ts             # TypeScript type definitions
  utils.ts             # General utilities

/scripts               # Database migration scripts
  001_create_schema.sql
  002_seed_data.sql
  003_add_connected_accounts.sql
  004_add_comments_replies.sql
  005_add_reactions.sql
  006_add_following_system.sql
  007_add_post_federation.sql
  008_populate_more_shows.sql
  010_fix_show_tags_constraint.sql
  011_add_episode_slugs_and_discord.sql
  012_add_test_discord_links.sql
  013_add_is_saved_column.sql
  014_fix_user_profiles_foreign_keys.sql

/supabase              # Supabase configuration
  /functions           # Edge functions (Deno)
```

## Real-time Architecture

### WebSocket Subscriptions

PodBridge uses Supabase Realtime for live updates across all clients:

#### Implementation Pattern
```typescript
// Subscribe to posts in a specific show tag
const channel = supabase
  .channel('posts')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => {
      // Handle insert/update/delete
    }
  )
  .subscribe()
```

#### Subscribed Tables
- `posts` - New posts, updates
- `comments` - New comments, replies
- `reactions` - New reactions, changes
- `tag_follows` - Follow/unfollow events
- `user_follows` - User follow events
- `saved_posts` - Save/queue changes

### Optimistic Updates

UI updates immediately before server confirmation for better UX:

1. Update local state immediately
2. Send mutation to Supabase
3. On success: Keep optimistic update
4. On error: Rollback and show error

## Security

### Row Level Security (RLS)

All tables use Supabase RLS policies:

#### Public Read Policies
- `show_tags`, `posts`, `sources`, `platforms` - Anyone can view
- Enables unauthenticated browsing

#### Authenticated Write Policies
- Users can only create/update their own content
- Uses `auth.uid()` to verify ownership

#### User-Scoped Policies
- `user_subscriptions`, `saved_posts`, `user_follows` - Users only see/manage their own
- `user_profiles` - Users can only update their own profile

### Authentication

- Managed by Supabase Auth
- Supports email/password and OAuth providers
- Guest browsing supported (read-only)
- JWT-based session management

## Component Architecture

### Key Components

#### ShowTagFeed
Main feed component for show pages.

**Props:**
- `showTag: ShowTag` - Show tag data with community links
- `initialPosts?: Post[]` - Server-side fetched posts

**Features:**
- Tabbed interface (Live Feed, Official Feed, Episode Catalog)
- Real-time post updates
- Follow/unfollow functionality
- Join conversation dropdown for Discord links

#### PostFeed
Displays list of posts with real-time updates.

**Props:**
- `initialPosts: Post[]`
- `showTagId?: string` - Filter to specific tag

**Features:**
- WebSocket subscriptions for live updates
- Infinite scroll pagination
- Reactions and comments

#### EpisodeCatalog
Audio episode browser with playback.

**Props:**
- `showTagId: string`
- `showTagSlug: string`
- `communityLinks?: ShowCommunityLink[]`

**Features:**
- Episode list with audio player
- Save to queue
- Discord discussion links
- Episode metadata display

#### AudioPlayer
Global audio player with queue management.

**Features:**
- Play/pause/skip controls
- Queue visualization and reordering
- Volume control
- Progress bar with seeking

### Utility Functions

#### Slug Generation (lib/utils/slugs.ts)

```typescript
// Convert text to kebab-case
toKebabCase(text: string): string

// Generate show slug
generateShowSlug(showName: string): string
// Example: "The Joe Rogan Experience" → "joe-rogan-experience"

// Generate episode slug with date
generateEpisodeSlug(date: Date, title: string): string
// Example: "2025-12-22-transform-pain-trauma"

// Generate Discord thread name
generateDiscordThreadName(date: Date, title: string): string
// Example: "2025-12-22 - Transform Pain & Trauma..."

// Build Discord episode URL
generateDiscordEpisodeUrl(serverUrl: string, slug: string): string
// Example: "https://discord.gg/show?episode=2025-12-22-slug"
```

## Episode Slug System

Episodes automatically get slugs for deep linking and organization:

### Trigger Flow

```sql
-- Trigger on post insert
BEFORE INSERT TRIGGER: trigger_generate_episode_slug
  ↓
FUNCTION: generate_episode_slug()
  ├─ Check: audio_url IS NOT NULL
  ├─ Extract: First line from content (episode title)
  ├─ Clean: Remove hashtags, episode numbers
  ├─ Format: YYYY-MM-DD from created_at
  ├─ Generate: Title slug (first 6 words, kebab-case)
  ├─ Combine: {date}-{title-slug}
  ├─ Validate: Length < 60 chars
  └─ Set: NEW.episode_slug
```

### Usage

- **Discord Links**: Append as query param `?episode=<slug>`
- **Permalinks**: Future use for direct episode URLs
- **Search**: Enable filtering by episode
- **Archives**: Organize episodes chronologically

## Discord Integration

### Join Conversation Dropdown

Located in show tag header tabs, provides access to community links:

**Data Source:** `show_community_links` table
**Filtering:** Discord links (`is_discord = true`) shown separately
**Behavior:** Opens in new tab OR embedded modal

### Discord Embed Modal

Embeds Discord widget inside PodBridge:

**Component:** `components/post-aggregator/discord-embed-modal.tsx`
**Widget URL:** `https://discord.com/widget?id={serverId}&theme=dark`
**Fallback:** External link if widget unavailable

### Episode Discussion Links

Each episode in catalog can link to Discord thread:

**URL Pattern:** `{discord-server-url}?episode={episode-slug}`
**Server Setup:** Requires Discord server widget to be enabled
**Visual:** Discord brand color (#5865F2) for distinction

## API Routes

### RSS Feed Generation

**Route:** `/api/rss/[tag]/route.ts`
**Purpose:** Generate RSS feed for any show tag
**URL:** `https://podbridge.app/api/rss/{tag-slug}`

**Features:**
- Standard RSS 2.0 format
- Episode enclosures for audio
- Podcast-specific metadata
- Cached for performance

## Migration System

Database changes are managed through numbered SQL scripts in `/scripts/`:

### Migration Order

Scripts must be run in numerical order:
1. `001_create_schema.sql` - Initial schema
2. `002_seed_data.sql` - Seed data
3. `003-014...` - Feature additions and fixes

### Migration Documentation

Some migrations include README files:
- `013_MIGRATION_README.md` - is_saved column addition
- `014_MIGRATION_README.md` - user_profiles foreign key fixes

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Environment Variables

Required variables (set via Supabase integration):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### Database Setup

1. Create Supabase project
2. Run all SQL scripts in order (001-014)
3. Enable Realtime for `posts` table
4. Configure authentication providers

## Performance Considerations

### Indexing

Key indexes for query performance:
- `posts.show_tag_id` - Feed queries
- `posts.created_at DESC` - Chronological sorting
- `comments.post_id` - Comment loading
- `reactions.post_id` - Reaction counts

### Caching Strategy

- Server-side rendering for initial page load
- Client-side caching for subsequent navigations
- Optimistic updates for instant feedback

### Real-time Optimization

- Selective subscriptions (only current view)
- Debounced updates for rapid changes
- Connection pooling via Supabase

## Future Architecture Considerations

### Planned Enhancements

1. **Background Jobs**: Queue for RSS polling and webhook processing
2. **CDN Integration**: Media hosting and optimization
3. **Search Service**: Full-text search with Elasticsearch/Algolia
4. **Analytics Pipeline**: Event tracking and user insights
5. **Mobile Apps**: Native iOS/Android with shared backend

### Scalability

- Database: Supabase handles connection pooling and read replicas
- Frontend: Vercel edge caching and CDN
- Real-time: Supabase Realtime scales automatically
- Future: Microservices for heavy processing (aggregation, federation)

## Testing Strategy

### Current State

- Manual testing guides available
- No automated test suite currently
- Reliance on TypeScript for type safety

### Recommended Testing

1. **Unit Tests**: Utility functions (slugs, formatting)
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Critical user flows (Playwright/Cypress)
4. **API Tests**: Edge function validation
