# Discord Embed Integration Guide

## Overview

Podbridge now opens Discord conversations inside the platform instead of redirecting users to external windows. This creates a seamless, integrated experience where users can join Discord discussions without leaving Podbridge.

## How It Works

When users click "Join the conversation" or "Discord Discussion" buttons, a modal opens with:

1. **Discord Widget (if available)** - An embedded Discord widget showing:
   - Online members
   - Server channels
   - Join server button
   - Real-time presence

2. **Fallback Link** - If the widget is unavailable, users can click to open Discord externally

## For Server Administrators

To enable the Discord widget for your server (so it can be embedded in Podbridge):

### Step 1: Enable Widget in Discord Server Settings

1. Open your Discord server
2. Go to **Server Settings** → **Widget**
3. Toggle **Enable Server Widget** to ON
4. Click **Save Changes**

### Step 2: Get Your Server ID

Your server ID is automatically extracted from Discord URLs in the format:
- `https://discord.com/channels/{SERVER_ID}`

For invite links (discord.gg/xxx), users will see a fallback button to open Discord externally.

### Step 3: Update Your Community Link

Make sure your Discord link in Podbridge uses the channel URL format if you want the widget to work:
- ✅ Good: `https://discord.com/channels/123456789012345678`
- ⚠️ Will fallback: `https://discord.gg/yourserver`

## User Experience

### Before (Old Behavior)
- Click "Join conversation" → Opens Discord in new tab
- User leaves Podbridge
- Context switch required

### After (New Behavior)
- Click "Join conversation" → Modal opens inside Podbridge
- Discord widget loads in modal
- User stays in Podbridge
- Can close modal and return to content

## Technical Details

- **Component**: `components/post-aggregator/discord-embed-modal.tsx`
- **Widget API**: `https://discord.com/widget?id={serverId}&theme=dark`
- **Modal Size**: 800px × 600px
- **Security**: iframe sandboxed with necessary permissions
- **Fallback**: Graceful degradation to external link

## Benefits

1. **Better User Experience**: Users don't need to leave Podbridge
2. **Higher Engagement**: Reduced friction to join discussions
3. **Professional Look**: Integrated experience feels native
4. **Mobile Friendly**: Modal works on all screen sizes
5. **Accessible**: Maintains Discord's accessibility features

## Files Changed

- `components/post-aggregator/discord-embed-modal.tsx` (new) - Modal component with Discord widget
- `components/post-aggregator/join-conversation-dropdown.tsx` - Updated to use modal
- `components/post-aggregator/episode-list-item.tsx` - Updated to use modal

## Screenshots

### Join Conversation Dropdown
Users click the dropdown to see Discord communities.

### Discord Embed Modal
When clicked, Discord opens inside a modal within Podbridge.

## Support

If you encounter issues:
1. Verify Discord widget is enabled in server settings
2. Check that you're using channel URLs (not invite links) for widget support
3. Ensure Discord server has widget feature enabled

---

**Note**: This feature enhances the user experience by keeping users within the Podbridge platform while still providing full access to Discord communities.
