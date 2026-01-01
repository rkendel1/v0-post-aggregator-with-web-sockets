# Discord Integration - Component Architecture

## Component Hierarchy

```
ShowTagFeed (show-tag-feed.tsx)
│
├── Header
│   ├── Logo
│   ├── Show Title & Info
│   └── Action Buttons
│       ├── Claim Page (if applicable)
│       ├── Tag Follow Button
│       ├── Main Feed Button
│       └── New Post Button
│
└── Tabs Navigation
    ├── TabsList
    │   ├── Live Feed Tab
    │   ├── Official Feed Tab
    │   ├── Episode Catalog Tab
    │   └── JoinConversationDropdown ← NEW
    │       ├── Discord Community Links
    │       └── Other Community Links
    │
    ├── Live Feed Content
    │   └── PostFeed
    │
    ├── Official Feed Content
    │   └── PostFeed
    │
    └── Episode Catalog Content
        └── EpisodeCatalog
            ├── Discord Server URL (from community links)
            └── Episode List
                └── EpisodeListItem (multiple)
                    ├── Play/Pause Button
                    ├── Episode Info
                    └── Expanded View
                        ├── Save Button
                        ├── View Original Button
                        └── Discord Discussion Button ← NEW
```

## Data Flow

```
1. Show Page Load
   ├── Fetch ShowTag with show_community_links
   ├── Pass to ShowTagFeed
   └── ShowTagFeed renders

2. Join Conversation Dropdown
   ├── Receives communityLinks from ShowTag
   ├── Filters for Discord links (is_discord = true)
   ├── Renders dropdown with grouped links
   └── Opens Discord URLs in new tab

3. Episode Catalog
   ├── Receives communityLinks from ShowTagFeed
   ├── Finds primary Discord server URL
   ├── Passes to each EpisodeListItem
   └── Each episode renders Discord discussion link

4. Episode Slug Generation (Database)
   ├── New episode inserted with audio_url
   ├── Trigger: generate_episode_slug()
   ├── Extracts title from content
   ├── Generates: YYYY-MM-DD-title-slug
   └── Saves to episode_slug column
```

## Component Interfaces

### JoinConversationDropdown

```typescript
interface JoinConversationDropdownProps {
  communityLinks: ShowCommunityLink[]
  showName?: string
}
```

**Input:** Array of community links
**Output:** Dropdown menu UI
**Logic:**
- Filters Discord vs other links
- Groups in separate sections
- Shows Discord icon in brand color

### EpisodeListItem (Updated)

```typescript
interface EpisodeListItemProps {
  episode: Post
  showTagSlug: string
  discordServerUrl?: string | null  // ← NEW
}
```

**Input:** 
- Episode data
- Show tag slug
- Discord server URL (optional)

**Output:** Episode card UI with Discord link

**Logic:**
- Generates Discord thread name using episode date/title
- Builds Discord URL with episode_slug parameter
- Shows Discord discussion button if URL provided

### EpisodeCatalog (Updated)

```typescript
interface EpisodeCatalogProps {
  showTagId: string
  showTagSlug: string
  communityLinks?: ShowCommunityLink[]  // ← NEW
}
```

**Input:**
- Show tag ID
- Show tag slug
- Community links (optional)

**Output:** List of episodes with Discord links

**Logic:**
- Finds first Discord link from communityLinks
- Passes Discord URL to all episodes
- Episodes use URL to build discussion links

## Slug Generation Utilities

### Functions in lib/utils/slugs.ts

```typescript
// Convert any text to kebab-case
toKebabCase(text: string): string

// Generate show-level slug
generateShowSlug(showName: string): string
// Example: "The Joe Rogan Experience" → "joe-rogan-experience"

// Extract short slug from episode title
extractEpisodeTitleSlug(title: string, maxWords?: number): string
// Example: "Episode #432 - Amazing Discovery" → "amazing-discovery"

// Generate full episode slug with date
generateEpisodeSlug(date: Date, title: string): string
// Example: "2025-12-22-transform-pain-trauma-creative"

// Generate Discord-friendly thread name
generateDiscordThreadName(date: Date, title: string): string
// Example: "2025-12-22 - Transform Pain & Trauma..."

// Generate Discord episode URL
generateDiscordEpisodeUrl(serverUrl: string, slug: string): string
// Example: "https://discord.gg/show?episode=2025-12-22-slug"
```

## Database Trigger Flow

```
INSERT INTO posts (content, audio_url, ...)
    ↓
BEFORE INSERT TRIGGER: trigger_generate_episode_slug
    ↓
FUNCTION: generate_episode_slug()
    ├── Check: audio_url IS NOT NULL?
    ├── Extract: First line from content
    ├── Clean: Remove hashtags, episode numbers
    ├── Format: YYYY-MM-DD from created_at
    ├── Generate: Title slug (first 6 words)
    ├── Combine: date-prefix + title-slug
    ├── Validate: Length < 60 chars
    └── Set: NEW.episode_slug
    ↓
ROW INSERTED with episode_slug populated
```

## Styling Notes

### Discord Brand Color
- Color: `#5865F2` (Discord Blurple)
- Used for Discord icon in dropdown and episode cards

### Component Variants
- Dropdown: Uses shadcn/ui DropdownMenu
- Buttons: Uses shadcn/ui Button with "outline" variant
- Icons: lucide-react (MessageCircle, Users, ExternalLink)

### Responsive Behavior
- Dropdown: Aligns to end of tabs
- Episode buttons: Wrap on mobile with flex-wrap
- Discord icon: Shows brand color for visual distinction

## Integration Points

### Where Discord Links Come From

1. **Database:** `show_community_links` table
   - Linked to show_tags via `show_tag_id`
   - Filtered by `is_discord = true` OR `platform = 'discord'`

2. **Query:** Show page fetches links
   ```typescript
   .select(`*, show_community_links(*)`)
   ```

3. **Props:** Passed down through components
   - ShowTag → ShowTagFeed
   - ShowTagFeed → JoinConversationDropdown
   - ShowTagFeed → EpisodeCatalog → EpisodeListItem

### Where Episode Slugs Are Used

1. **Database:** Auto-generated on insert
2. **Post object:** Available as `episode.episode_slug`
3. **Discord URLs:** Appended as query parameter
   ```
   https://discord.gg/server?episode=2025-12-22-slug
   ```
4. **Future:** Can be used for:
   - Episode permalinks
   - Search/filtering
   - Archive organization
   - External API references

## Testing Strategy

### Unit Tests (Slug Generation)
```typescript
// Test cases for slug utilities
test('generates correct episode slug')
test('handles special characters')
test('respects length limits')
test('removes hashtags and episode numbers')
```

### Integration Tests (UI)
```typescript
// Test cases for components
test('dropdown shows Discord links')
test('episode cards show Discord button')
test('Discord links open in new tab')
test('dropdown groups links correctly')
```

### Manual Testing Checklist
- [ ] Dropdown appears next to tabs
- [ ] Discord links have correct icon color
- [ ] Episode cards show Discord button
- [ ] URLs include episode slug parameter
- [ ] New episodes get auto-generated slugs
- [ ] Existing episodes have backfilled slugs
