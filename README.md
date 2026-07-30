# PodBridge – Your podcasts, unified.

A real-time podcast aggregator platform that allows users to follow show and episode tags (like #JoeRogan, #HubermanLab) and engage with a community around their favorite podcasts. Built with Next.js, Supabase, and WebSockets for instant updates.

## Quick Links

- **[Development Guide](./DEVELOPMENT.md)** - Get started developing
- **[Architecture Documentation](./ARCHITECTURE.md)** - System design and technical details
- **[Technical Debt](./TECHNICAL_DEBT.md)** - Known issues and improvement areas
- **[AI Rules](./AI_RULES.md)** - Guidelines for AI-assisted development

## Current Features

### Core Functionality

#### Show Tag Communities
- **Tag-based Feeds**: Dedicated feeds for each show or episode tag.
- **Real-time Updates**: WebSocket-powered live post streaming.
- **Tag Following**: Subscribe to specific tags to customize your feed.
- **Tag Discovery**: Browse popular and trending tags in the sidebar.

#### Post Aggregation
- **Multi-source Support**: Aggregate posts from various platforms (Spotify, Apple, YouTube, RSS).
- **Source Management**: Add and manage multiple content sources per tag.
- **Unified Feed**: Single view for all posts across platforms.
- **Post Creation**: Create posts directly within the platform.

### Social Features

#### Comments & Replies
- **Threaded Conversations**: Full nested comment support
- **Real-time Comments**: Instant comment updates via WebSocket
- **Reply Functionality**: Reply to both posts and comments
- **Comment Counts**: Live tracking of conversation activity

#### Reactions System
- **Multiple Reaction Types**: Like, Love, Laugh, Wow, Sad, Angry
- **Reaction Counts**: Aggregated view of all reactions
- **Quick React**: One-click reaction toggle
- **Visual Feedback**: Emoji-based reaction display

#### Following System
- **Follow Users**: Stay updated with specific users' content
- **Follow Posts**: Get notified of updates to specific posts
- **Follow Tags**: Subscribe to show tag feeds
- **Follow Management**: Easy follow/unfollow controls
- **Follower Counts**: See popularity metrics

### Connected Accounts

#### Platform Integration
- **Multi-platform Support**: Twitter, Reddit, Mastodon, LinkedIn, Discord, Telegram (representing podcast platforms/social media)
- **Account Management**: Connect, disconnect, and manage multiple accounts
- **Active/Inactive Toggle**: Control which accounts to use
- **OAuth 2.0 Flow**: ✅ Fully implemented secure authentication with external platforms
  - PKCE support for enhanced security
  - Automatic token refresh on expiry
  - AES-256-GCM token encryption
  - CSRF protection with state validation
- **Account Status**: Visual indicators for connection health
- **Token Management**: Automatic refresh of expired tokens

#### Post Federation
- **Cross-posting**: Publish to multiple platforms simultaneously
- **Selective Publishing**: Choose which platforms to post to
- **Federation Status**: Track posting status per platform
- **Error Handling**: Visual feedback for failed posts
- **External URLs**: Direct links to posts on origin platforms

### Technical Features

#### Real-time Architecture
- **Supabase Realtime**: WebSocket subscriptions for live data
- **Instant Updates**: No page refresh needed for new content
- **Multi-client Sync**: Changes propagate across all connected users
- **Optimistic Updates**: Immediate UI feedback before server confirmation

#### Security
- **Row Level Security (RLS)**: Database-level access control
- **User Authentication**: Secure user management via Supabase Auth
- **Data Privacy**: Users only access their own data
- **API Protection**: Server-side validation and authorization

#### Database Schema
- **Posts**: Core content with user ownership
- **Show Tags**: Tag definitions and metadata (formerly Cash Tags)
- **Comments**: Threaded comment system
- **Reactions**: User reactions to posts and comments
- **Following**: User, post, and tag subscriptions
- **Connected Accounts**: External platform credentials
- **Federated Posts**: Cross-platform post tracking
- **Aggregated Posts**: Inbound posts from external platforms

#### Admin Features
- **Tag Management**: Create, edit, and delete show tags
- **Bulk Upload**: Load multiple creators at once via CSV/JSON
- **RSS Feed Management**: Configure feeds for automated content aggregation
- **Community Links**: Set up Discord, Telegram, and other community platforms
- **Subdomain Mapping**: Custom branded subdomains for each show

## Future Improvements

### Phase 1: Enhanced Aggregation
- [x] **Automated Polling**: Background jobs to fetch posts from RSS feeds and connected accounts
- [x] **Webhook Support**: REST API endpoint for real-time ingestion from supported platforms
- [x] **Duplicate Detection**: Smart deduplication using external GUID and content similarity
- [x] **Content Filtering**: Basic spam detection and content moderation
- [ ] **API Integration**: Direct API connections to podcast platforms/social media (Twitter, Reddit APIs)
- [ ] **Media Support**: Images, videos, and rich media in posts
- [ ] **Advanced ML-based filtering**: Machine learning models for better spam detection

### Phase 2: Advanced Federation
- [ ] **Bidirectional Sync**: Sync reactions and comments back to origin platforms
- [ ] **Scheduled Posts**: Queue posts for future publishing
- [ ] **Draft Management**: Save and edit drafts before publishing
- [ ] **Post Templates**: Reusable post formats for different platforms
- [ ] **Character Limits**: Platform-specific validation and truncation
- [ ] **Hashtag Mapping**: Convert between show tags and platform hashtags

### Phase 3: Analytics & Insights
- [ ] **Engagement Metrics**: Track views, clicks, and interactions
- [ ] **Tag Analytics**: Trending topics and sentiment analysis
- [ ] **User Statistics**: Personal engagement dashboards
- [ ] **Performance Charts**: Visual data representation with charts
- [ ] **Export Data**: Download your posts and analytics
- [ ] **Comparative Analysis**: Compare performance across platforms

### Phase 4: Social Enhancements
- [ ] **Direct Messaging**: Private conversations between users
- [ ] **Notifications**: Real-time alerts for mentions, reactions, follows
- [ ] **User Profiles**: Detailed profile pages with bio and stats
- [ ] **Mentions & Tagging**: @mention users in posts and comments
- [ ] **Bookmarks**: Save posts for later reading
- [ ] **Share Functionality**: Share posts via link or to other platforms

### Phase 5: Community Features
- [ ] **User Discovery**: Find users with similar interests
- [ ] **Tag Recommendations**: AI-powered tag suggestions
- [ ] **Trending Posts**: Highlight popular content
- [ ] **Moderation Tools**: Report, block, and mute functionality
- [ ] **Custom Feeds**: Create and share custom tag combinations
- [ ] **Community Guidelines**: Platform rules and enforcement

### Phase 6: Mobile & Performance
- [ ] **Progressive Web App**: Installable mobile experience
- [ ] **Push Notifications**: Native mobile notifications
- [ ] **Offline Support**: Cache posts for offline reading
- [ ] **Lazy Loading**: Infinite scroll with pagination
- [ ] **Image Optimization**: Compress and resize media
- [ ] **Performance Monitoring**: Track and optimize load times

### Phase 7: Monetization & Premium
- [ ] **Subscription Tiers**: Premium features for paid users
- [ ] **Ad Integration**: Sponsored posts and native advertising
- [ ] **Creator Tools**: Analytics and monetization for content creators
- [ ] **API Access**: Developer API for third-party integrations
- [ ] **White Label**: Custom branding options
- [ ] **Enterprise Features**: Team accounts and collaboration tools

## Architecture

PodBridge uses a modern, real-time architecture:

- **Show Tags**: Central organizing concept - each tag represents a podcast or creator
- **Subdomain Routing**: Each show can have a branded subdomain (e.g., `huberman-lab.podbridge.app`)
- **Real-time Updates**: WebSocket subscriptions keep all clients in sync
- **Row Level Security**: Database-level access control for data privacy

### Database Schema

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for complete schema documentation.

**Key Tables**:
- `show_tags` - Podcast/creator definitions
- `posts` - Content (user posts and podcast episodes)
- `comments` - Threaded discussions
- `reactions` - Emoji reactions
- `saved_posts` - User's saved posts and playback queue
- `connected_accounts` - External platform integrations (planned)
- `show_community_links` - Discord and other community links

## Technical Stack

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime (WebSocket)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Language**: TypeScript

## Getting Started

### Quick Start

```bash
# Clone the repository
git clone https://github.com/rkendel1/v0-post-aggregator-with-web-sockets.git
cd v0-post-aggregator-with-web-sockets

# Install dependencies
npm install

# Set up environment variables (see DEVELOPMENT.md)
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Database Setup

Run all SQL migration scripts in order in your Supabase SQL Editor:

```
scripts/001_create_schema.sql
scripts/002_seed_data.sql
scripts/003_add_connected_accounts.sql
scripts/004_add_comments_replies.sql
scripts/005_add_reactions.sql
scripts/006_add_following_system.sql
scripts/007_add_post_federation.sql
scripts/008_populate_more_shows.sql
scripts/010_fix_show_tags_constraint.sql
scripts/011_add_episode_slugs_and_discord.sql
scripts/012_add_test_discord_links.sql
scripts/013_add_is_saved_column.sql
scripts/014_fix_user_profiles_foreign_keys.sql
scripts/015_add_rss_feeds_tables.sql
scripts/016_add_aggregated_posts_sync.sql
```

**Important**: Run scripts in numerical order.

For detailed setup instructions, see **[DEVELOPMENT.md](./DEVELOPMENT.md)**.

For automated aggregation setup, see **[docs/AUTOMATED_AGGREGATION.md](./docs/AUTOMATED_AGGREGATION.md)**.

For bulk creator upload, see **[docs/BULK_UPLOAD_GUIDE.md](./docs/BULK_UPLOAD_GUIDE.md)**.

### Key Concepts

#### Show Tags
Tags prefixed with # (e.g., #JoeRogan, #Episode2000) represent shows, episodes, or topics. Users can follow tags to see aggregated content.

#### Connected Accounts
Link external social media accounts or podcast platforms to aggregate posts and federate content to multiple platforms.

#### Real-time Updates
All posts, comments, reactions, and follows update instantly across all connected clients via WebSocket subscriptions.

#### Federation Status
Posts can be published to multiple platforms with status tracking:
- **Pending**: Queued for publishing
- **Published**: Successfully posted
- **Failed**: Error occurred (with error message)

## Contributing

We welcome contributions! Please see **[CONTRIBUTING.md](./CONTRIBUTING.md)** for detailed guidelines.

**Quick start for contributors:**

1. **Read the docs**:
   - [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
   - [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup and guidelines
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
   - [AI_RULES.md](./AI_RULES.md) - Coding standards and library usage

2. **Set up your environment**:
   - Fork the repository
   - Follow setup instructions in DEVELOPMENT.md
   - Create a feature branch

3. **Make your changes**:
   - Follow existing code patterns
   - Use TypeScript, Tailwind CSS, and shadcn/ui components
   - Test your changes thoroughly

4. **Submit a pull request**:
   - Describe your changes clearly
   - Link any related issues
   - Ensure all checks pass

### Development Commands

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run ESLint
```

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Documentation

### For Developers
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design
- **[AI_RULES.md](./AI_RULES.md)** - AI-assisted development guidelines
- **[TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)** - Known issues and improvement areas
- **[Realtime Subscriptions Guide](./docs/REALTIME_SUBSCRIPTIONS.md)** - Best practices for WebSocket subscriptions
- **[Automated Aggregation Guide](./docs/AUTOMATED_AGGREGATION.md)** - Setup and usage of automated post aggregation

### Implementation Guides
- See `docs/guides/` for feature-specific documentation
- Historical implementation notes in `docs/archive/`

## Troubleshooting

Common issues and solutions:

**Database Connection Errors**
- Verify environment variables in `.env.local`
- Check Supabase project is active
- Ensure all migrations have been run

**Real-time Updates Not Working**
- Verify Realtime is enabled for tables in Supabase
- Check browser console for WebSocket errors
- Ensure proper subscription cleanup in components (see [Realtime Subscriptions Guide](./docs/REALTIME_SUBSCRIPTIONS.md))
- Check for memory leaks with multiple subscriptions in DevTools Network tab

**Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors with `npx tsc --noEmit`
- Clear `.next` cache: `rm -rf .next && npm run build`

For more help, see [DEVELOPMENT.md](./DEVELOPMENT.md#troubleshooting) or create an issue.

## Current Status

**Active Features**: ✅
- Real-time feed updates
- Show tag following
- Comments and reactions
- User profiles and following
- Audio episode playback
- Save posts and queue management
- Discord community integration

**In Development**: 🚧
- Automated content aggregation
- External platform federation
- OAuth for connected accounts

See **[TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)** for detailed status and roadmap.

---

Built with ❤️ using Next.js, Supabase, and Tailwind CSS