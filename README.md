# PodBridge – Your podcasts, unified.

A real-time podcast aggregator platform that allows users to follow show and episode tags (like #JoeRogan, #JoeRogan:2000) and aggregate posts from multiple podcast platforms and social sources. Built with Next.js, Supabase, and WebSockets for instant updates.

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
- **OAuth Flow**: Secure authentication with external platforms
- **Account Status**: Visual indicators for connection health

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

## Future Improvements

### Phase 1: Enhanced Aggregation
- [ ] **Automated Polling**: Background jobs to fetch posts from connected accounts
- [ ] **API Integration**: Direct API connections to podcast platforms/social media
- [ ] **Webhook Support**: Real-time ingestion from supported platforms
- [ ] **Duplicate Detection**: Smart deduplication of cross-posted content
- [ ] **Content Filtering**: Spam detection and content moderation tools
- [ ] **Media Support**: Images, videos, and rich media in posts

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

## Database Overview

### Core Tables
- `posts`: User-generated content with show tag associations
- `show_tags`: Tag definitions and metadata (formerly cash_tags)
- `sources`: Content sources for each tag
- `user_subscriptions`: User subscriptions to specific tags

### Social Tables
- `comments`: Threaded comments on posts
- `reactions`: Emoji reactions on posts and comments
- `post_follows`: Users following specific posts
- `user_follows`: Users following other users
- `tag_follows`: Users following show tags

### Federation Tables
- `connected_accounts`: External platform credentials
- `federated_posts`: Outbound posts to external platforms
- `aggregated_posts`: Inbound posts from external platforms

## Technical Stack

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime (WebSocket)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Connected Supabase integration in v0

### Installation

1. Run all SQL scripts in order:
   ```
   001_create_schema.sql
   002_seed_data.sql
   003_add_connected_accounts.sql
   004_add_comments_replies.sql
   005_add_reactions.sql
   006_add_following_system.sql
   007_add_post_federation.sql
   ```

2. The app will automatically use environment variables from your Supabase integration

3. Start developing - all changes sync in real-time!

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

This is a v0 project. To contribute:
1. Download the ZIP or clone from GitHub
2. Make your changes locally
3. Test thoroughly with Supabase
4. Submit pull requests via GitHub integration

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
- Check the Supabase dashboard for database errors
- Review the browser console for client-side errors
- Ensure all SQL scripts have been executed in order
- Verify environment variables are properly set

---

Built with ❤️ using v0, Next.js, and Supabase