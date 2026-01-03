# PodBridge Development Guide

This guide provides everything you need to set up, develop, and contribute to PodBridge.

## Prerequisites

### Required Software

- **Node.js**: v18 or higher
- **npm**: v8 or higher (comes with Node.js)
- **Git**: For version control
- **Supabase Account**: Free tier available at [supabase.com](https://supabase.com)

### Recommended Tools

- **VS Code**: With TypeScript and Tailwind CSS extensions
- **Supabase CLI**: For local development (optional)
- **Postman/Insomnia**: For API testing (optional)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/rkendel1/v0-post-aggregator-with-web-sockets.git
cd v0-post-aggregator-with-web-sockets
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Create a Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (takes ~2 minutes)
3. Note your project URL and anon key

#### Run Database Migrations

Execute the SQL scripts in order in the Supabase SQL Editor:

```bash
# In Supabase Dashboard > SQL Editor, run these in order:
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
```

**Important**: Run scripts in numerical order. Each script builds on the previous ones.

#### Enable Realtime

In Supabase Dashboard:
1. Go to Database > Replication
2. Ensure `posts` table is enabled for Realtime
3. Other tables can be enabled as needed

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note**: If using Vercel or v0 integration, environment variables may be automatically configured.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

### Project Structure

```
/app                    # Next.js pages (App Router)
/components             # React components
/lib                    # Utilities, hooks, types
/scripts                # Database migrations
/supabase/functions     # Edge functions (Deno)
/public                 # Static assets
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

### Code Style Guidelines

#### TypeScript

- **Mandatory**: All application code must be TypeScript
- Use explicit types, avoid `any`
- Define interfaces in `lib/types.ts` for shared types
- Use `type` for unions/intersections, `interface` for objects

#### Styling

- **Tailwind CSS Only**: No custom CSS files
- Use Tailwind utility classes exclusively
- Responsive design: Use `sm:`, `md:`, `lg:` breakpoints
- Dark mode: Use `dark:` variants

#### UI Components

- **shadcn/ui**: Use existing components from `components/ui/`
- If component doesn't exist, add it via shadcn CLI:
  ```bash
  npx shadcn-ui@latest add <component-name>
  ```
- Do not use external UI libraries

#### Icons

- **lucide-react Only**: No other icon libraries
- Import as needed:
  ```typescript
  import { Heart, MessageCircle, Share2 } from 'lucide-react'
  ```

#### Date Handling

- **date-fns Only**: For all date operations
- Common functions:
  ```typescript
  import { format, formatDistanceToNow } from 'date-fns'
  
  format(new Date(), 'MMM d, yyyy')
  formatDistanceToNow(new Date(created_at), { addSuffix: true })
  ```

### Database Access

#### Client-Side (React Components)

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Query
const { data, error } = await supabase
  .from('posts')
  .select('*, show_tags(*)')
  .eq('show_tag_id', id)
  .order('created_at', { ascending: false })

// Insert
const { data, error } = await supabase
  .from('posts')
  .insert({ content, show_tag_id, user_id })

#### Real-time Subscriptions

**IMPORTANT**: Always follow best practices for Realtime subscriptions to prevent memory leaks.

See [docs/REALTIME_SUBSCRIPTIONS.md](./docs/REALTIME_SUBSCRIPTIONS.md) for comprehensive guide.

**Quick Reference:**

```typescript
import { useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ✅ GOOD: Use useRef for stable client instance
const supabaseRef = useRef(createClient())

useEffect(() => {
  const supabase = supabaseRef.current
  
  const channel = supabase
    .channel('posts')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'posts' },
      (payload) => {
        // Handle new post
      }
    )
    .subscribe()
  
  // ✅ ALWAYS cleanup subscriptions
  return () => {
    supabase.removeChannel(channel)
  }
}, []) // ✅ Minimal dependencies
```

**Common Pitfalls to Avoid:**
- ❌ Don't use `useState` for supabase client
- ❌ Don't include supabase client in dependencies
- ❌ Always include cleanup function
- ❌ Don't include unstable callbacks in dependencies

For detailed examples and troubleshooting, see the [Realtime Subscriptions Guide](./docs/REALTIME_SUBSCRIPTIONS.md).

#### Server-Side (Server Components, API Routes)

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()

// Rest is the same as client-side
const { data, error } = await supabase
  .from('posts')
  .select('*')
```

### Creating New Features

#### 1. Plan Your Feature

- Identify which tables/data you need
- Check if database changes are required
- Review existing components you can reuse

#### 2. Database Changes (if needed)

Create a new migration script:

```bash
# scripts/015_your_feature_name.sql
```

Follow existing migration patterns:
- Create/alter tables
- Add RLS policies
- Create indexes
- Add seed data if needed

#### 3. Update Types

Add/modify TypeScript interfaces in `lib/types.ts`:

```typescript
export interface YourNewType {
  id: string
  // ... fields
  created_at: string
}
```

#### 4. Create Components

- Use functional components with hooks
- Implement real-time subscriptions if data changes
- Follow existing component patterns
- Keep components focused (single responsibility)

#### 5. Test Locally

- Verify functionality works
- Test real-time updates (open multiple browsers)
- Check responsive design
- Test authentication states (logged in/out)

### Git Workflow

#### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

#### Commit Messages

Use clear, descriptive commit messages:

```
Add episode playback queue functionality

- Create queue management component
- Add drag-and-drop reordering
- Implement queue persistence in database
- Add real-time queue updates
```

#### Pull Requests

1. Create a PR from your feature branch
2. Add clear description of changes
3. Link related issues
4. Request review if applicable

## Building and Deployment

### Build for Production

```bash
npm run build
```

Checks for:
- TypeScript errors
- Build errors
- Missing environment variables

### Lint Code

```bash
npm run lint
```

Fix linting errors before committing.

### Deploy to Vercel

1. Connect repository to Vercel
2. Configure environment variables
3. Set up custom domain (optional)
4. Enable wildcard subdomains for show pages

**Wildcard Subdomain Setup:**
1. In Vercel project settings > Domains
2. Add `*.yourdomain.com`
3. Configure DNS with wildcard CNAME

## Testing

### Manual Testing

See testing guides:
- [docs/guides/MANUAL_TESTING_GUIDE.md](./docs/guides/MANUAL_TESTING_GUIDE.md) - Saved posts testing
- [docs/guides/AUTH_TESTING_GUIDE.md](./docs/guides/AUTH_TESTING_GUIDE.md) - Authentication flow testing

### Key Test Scenarios

1. **Authentication**
   - Sign up with email
   - Sign in/sign out
   - Password reset
   - OAuth providers (if configured)

2. **Show Tag Pages**
   - View show feed
   - Follow/unfollow tags
   - Create posts
   - Real-time updates

3. **Social Features**
   - Add comments
   - React to posts
   - Follow users
   - Save posts to queue

4. **Real-time Features**
   - Open same page in two browsers
   - Create post in one, see it appear in other
   - Test all subscription types

## Common Development Tasks

### Adding a New shadcn/ui Component

```bash
npx shadcn-ui@latest add <component-name>
```

Example:
```bash
npx shadcn-ui@latest add calendar
```

### Adding a Database Table

1. Create migration script `scripts/0XX_description.sql`
2. Define table schema
3. Add RLS policies
4. Create indexes
5. Add type definition in `lib/types.ts`
6. Run migration in Supabase

### Creating an API Route

Create file in `app/api/your-route/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Your logic here
  
  return NextResponse.json({ data })
}
```

### Adding Real-time Subscriptions

```typescript
useEffect(() => {
  const supabase = createClient()
  
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (payload) => {
        // Handle change
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

## Troubleshooting

### Common Issues

#### "Cannot find module" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database connection errors

- Check environment variables are set correctly
- Verify Supabase project is active
- Check RLS policies aren't blocking queries

#### Real-time not working

- Verify table is enabled for Realtime in Supabase
- Check subscription channel name is unique
- Ensure proper cleanup in useEffect return

#### Build errors

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check Next.js config
npm run build
```

### Getting Help

1. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Review existing similar components
3. Check Supabase documentation
4. Search GitHub issues
5. Create a new issue with details

## Code Review Guidelines

When reviewing PRs, check for:

- [ ] TypeScript types are explicit and correct
- [ ] Tailwind CSS used exclusively (no custom CSS)
- [ ] shadcn/ui components used where appropriate
- [ ] Database queries use proper client wrapper
- [ ] RLS policies protect data appropriately
- [ ] Real-time subscriptions are cleaned up
- [ ] Responsive design works on mobile
- [ ] Code follows existing patterns
- [ ] No console.log statements left in code

## Best Practices

### Performance

- Use Server Components when possible (default in App Router)
- Lazy load heavy components
- Optimize images with Next.js Image component
- Index database queries appropriately
- Limit real-time subscriptions to active views

### Security

- Never expose service role key in client code
- Always use RLS policies
- Validate user input
- Sanitize data before display
- Use Supabase auth helpers for user identity

### Code Organization

- Keep components small and focused
- Extract reusable logic to hooks
- Share types via `lib/types.ts`
- Group related components in folders
- Use meaningful variable names

### Accessibility

- Use semantic HTML elements
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers when possible
- Maintain color contrast ratios

## Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Internal Docs

- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [AI_RULES.md](./AI_RULES.md) - AI coding guidelines
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) - Known issues

### Community

- GitHub Issues - Bug reports and features
- GitHub Discussions - Questions and ideas
- Supabase Discord - Database questions

## License

MIT License - See [LICENSE](./LICENSE) file for details
