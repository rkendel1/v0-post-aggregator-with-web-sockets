# Discord Integration UI Changes - Visual Guide

## Overview
This document describes the UI changes made to integrate Discord conversations into Podbridge with auto-generated slugs.

## Key Changes

### 1. "Join the conversation" Dropdown (Replaces Discord Links in Header)

**Before:**
- Discord community links were displayed as buttons in the header below the show name
- Took up significant space and cluttered the UI

**After:**
- Discord links moved to a dropdown menu next to the tabs
- Appears on the same line as "Live Feed", "Official Feed", "Episode Catalog"
- Clean, compact design that saves space

**Component:** `components/post-aggregator/join-conversation-dropdown.tsx`

**Features:**
- Groups Discord servers separately from other community links
- Shows Discord icon in Discord brand color (#5865F2)
- Displays server name and description in dropdown
- Opens links in new tab

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Live Feed] [Official Feed] [Episode Catalog] [Join the conversation ▼] │
└─────────────────────────────────────────────────────────────┘
```

When clicked:
```
                                    ┌───────────────────────────┐
                                    │ Discord Communities       │
                                    ├───────────────────────────┤
                                    │ 🗣️ Huberman Lab Discord   │
                                    │   Official Discord...     │
                                    ├───────────────────────────┤
                                    │ Other Communities         │
                                    │ ...                       │
                                    └───────────────────────────┘
```

### 2. Episode-Specific Discord Links

**Before:**
- Episode cards only showed "Save" and "View Original" buttons
- No way to jump to Discord discussion for specific episode

**After:**
- Each episode card now shows "Discord Discussion" button
- Button appears in the expanded episode view
- Links directly to episode-specific Discord thread/channel

**Component:** `components/post-aggregator/episode-list-item.tsx`

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ ▶️ Episode Title                                        │
│   December 22, 2025                                     │
└─────────────────────────────────────────────────────────┘
  When expanded:
  ┌───────────────────────────────────────────────────────┐
  │ [💾 Save] [🔗 View Original] [💬 Discord Discussion]  │
  │                                                       │
  │ Episode description...                                │
  └───────────────────────────────────────────────────────┘
```

### 3. Auto-Generated Episode Slugs

**Naming Convention:**
- Format: `YYYY-MM-DD-episode-slug`
- Example: `2025-12-22-transform-pain-trauma-creative`

**Features:**
- Automatically generated when episode is created
- Based on episode date and title
- Removes hashtags, episode numbers
- Takes first 4-8 meaningful words
- Kebab-case (lowercase with hyphens)
- Limited to 60 characters for Discord compatibility

**Database Changes:**
- Added `episode_slug` column to `posts` table
- Auto-generation trigger on insert
- Backfilled existing episodes

## Implementation Details

### Files Modified

1. **lib/utils/slugs.ts** (NEW)
   - Slug generation utilities
   - Functions: `generateEpisodeSlug()`, `generateShowSlug()`, `generateDiscordThreadName()`

2. **lib/types.ts**
   - Added `episode_slug` to Post interface
   - Added `is_discord` and `discord_server_id` to ShowCommunityLink interface

3. **components/post-aggregator/join-conversation-dropdown.tsx** (NEW)
   - Dropdown component for community links
   - Separates Discord links from other links

4. **components/post-aggregator/show-tag-feed.tsx**
   - Removed Discord buttons from header
   - Added dropdown next to tabs
   - Passes community links to episode catalog

5. **components/post-aggregator/episode-catalog.tsx**
   - Accepts community links prop
   - Finds primary Discord server URL
   - Passes to episode list items

6. **components/post-aggregator/episode-list-item.tsx**
   - Accepts Discord server URL prop
   - Generates episode-specific Discord URL
   - Shows Discord discussion button

### Database Migrations

1. **scripts/011_add_episode_slugs_and_discord.sql**
   - Adds `episode_slug` column to posts
   - Adds Discord fields to show_community_links
   - Creates auto-generation trigger
   - Backfills existing episodes

2. **scripts/012_add_test_discord_links.sql**
   - Adds sample Discord links for testing
   - Creates Darknet Diaries show if needed

## User Experience Improvements

1. **Cleaner Header**
   - Removed clutter from header
   - More space for show information

2. **Better Organization**
   - Community links grouped logically
   - Discord servers easy to find

3. **Episode-Specific Discussions**
   - Direct links to discuss specific episodes
   - Native feel - seamless navigation

4. **Future-Proof**
   - Slugs support archiving and search
   - Compatible with Discord naming conventions
   - Scalable to many episodes

## Testing Checklist

- [ ] Discord dropdown appears next to tabs
- [ ] Discord links removed from header
- [ ] Episode cards show Discord discussion button
- [ ] Discord URLs include episode slug
- [ ] Slug generation works for new episodes
- [ ] Existing episodes have slugs backfilled
- [ ] Links open in new tab
- [ ] UI is responsive on mobile

## Screenshots

Screenshots would show:
1. Before/After header comparison
2. "Join the conversation" dropdown expanded
3. Episode card with Discord discussion button
4. Mobile view of changes

Note: Screenshots cannot be generated without Supabase credentials configured.
