# Contributing to PodBridge

Thank you for your interest in contributing to PodBridge! This guide will help you get started.

## Quick Links

Before contributing, please review:

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Setup and development guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[AI_RULES.md](./AI_RULES.md)** - Coding standards and library requirements
- **[TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)** - Known issues and planned improvements

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/v0-post-aggregator-with-web-sockets.git
cd v0-post-aggregator-with-web-sockets

# Add upstream remote
git remote add upstream https://github.com/rkendel1/v0-post-aggregator-with-web-sockets.git
```

### 2. Set Up Development Environment

Follow the complete setup guide in [DEVELOPMENT.md](./DEVELOPMENT.md):

1. Install Node.js 18+
2. Install dependencies: `npm install`
3. Set up Supabase project
4. Run database migrations
5. Configure environment variables
6. Start dev server: `npm run dev`

### 3. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bug fix branch
git checkout -b fix/bug-description
```

## What to Work On

### Good First Issues

Look for issues labeled `good first issue` in the GitHub repository. These are well-defined tasks suitable for newcomers.

### Current Priorities

See [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) for:
- High-priority features (OAuth, federation, testing)
- Medium-priority improvements (UX, performance, security)
- Low-priority enhancements (optimizations, refactoring)

### Areas That Need Help

- **Automated Testing**: We currently have no test suite
- **OAuth Integration**: Connected accounts need real OAuth implementation
- **Federation**: Actual posting to external platforms
- **Mobile Optimization**: Better responsive design
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Documentation**: Expand guides, add code examples

## Coding Standards

### Mandatory Requirements

PodBridge has strict library and technology requirements. **You must follow these**:

| Component | Required Library | Notes |
|-----------|-----------------|-------|
| UI Components | shadcn/ui | No other UI libraries |
| Styling | Tailwind CSS v4 | No custom CSS files |
| Icons | lucide-react | No other icon libraries |
| Date/Time | date-fns | Only library for dates |
| Database (Client) | @/lib/supabase/client | All client-side DB access |
| Database (Server) | @/lib/supabase/server | All server-side DB access |
| Forms | react-hook-form + zod | For complex forms |

See [AI_RULES.md](./AI_RULES.md) for detailed guidelines.

### Code Style

- **TypeScript**: Mandatory, use explicit types, avoid `any`
- **Components**: Functional components with hooks only
- **Naming**: 
  - Components: PascalCase (e.g., `PostCard`)
  - Files: kebab-case (e.g., `post-card.tsx`)
  - Variables: camelCase
- **Responsive**: Always design mobile-first
- **Accessibility**: Add ARIA labels, ensure keyboard navigation

### File Organization

```
/app              # Next.js pages
/components       # React components
  /ui             # shadcn/ui components
  /[feature]      # Feature-specific components
/lib              # Utilities and helpers
  /hooks          # Custom React hooks
  /supabase       # Database clients
  /utils          # Utility functions
  types.ts        # Shared TypeScript types
/scripts          # Database migrations
/docs             # Documentation
  /guides         # Feature guides
  /archive        # Historical docs
```

## Making Changes

### Database Changes

If your contribution requires database changes:

1. Create a new migration script in `/scripts/`
2. Number it sequentially (e.g., `015_your_feature.sql`)
3. Include:
   - Table creation/modification
   - RLS policies
   - Indexes
   - Comments explaining the changes
4. Test on a development Supabase instance first
5. Create a migration README if changes are complex

See [scripts/README.md](./scripts/README.md) for migration guidelines.

### Adding Components

1. Check if shadcn/ui has the component:
   ```bash
   npx shadcn-ui@latest add <component-name>
   ```

2. If creating a custom component:
   - Place in appropriate `/components/[feature]/` folder
   - Use TypeScript with explicit prop types
   - Style with Tailwind CSS only
   - Document with JSDoc comments

3. Export types in `lib/types.ts` if needed

### Real-time Features

When adding real-time subscriptions:

```typescript
useEffect(() => {
  const supabase = createClient()
  
  const channel = supabase
    .channel('unique-channel-name')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'your_table' },
      (payload) => {
        // Handle changes
      }
    )
    .subscribe()

  // IMPORTANT: Clean up subscription
  return () => {
    supabase.removeChannel(channel)
  }
}, [dependencies])
```

## Testing Your Changes

### Manual Testing

1. Test your changes in the browser
2. Test responsive design (mobile, tablet, desktop)
3. Test with real-time updates (open multiple browser windows)
4. Test authentication states (logged in, logged out, guest)
5. Check browser console for errors

### Verification Checklist

- [ ] TypeScript compiles without errors
- [ ] No console errors or warnings
- [ ] Works on mobile viewport
- [ ] Works with real-time updates
- [ ] RLS policies protect data appropriately
- [ ] Changes work in both light and dark mode
- [ ] Follows coding standards from AI_RULES.md

## Submitting Your Contribution

### 1. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "Add user profile editing feature

- Create profile edit form component
- Add validation with zod
- Update user_profiles table
- Add RLS policies for profile updates"
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

1. Go to GitHub and create a Pull Request
2. Use a clear title describing the change
3. In the description:
   - Explain what the PR does
   - Link any related issues
   - List breaking changes (if any)
   - Add screenshots for UI changes
   - Note any database migrations required

### 4. PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List key changes
- Use bullet points
- Be specific

## Database Changes
- [ ] No database changes
- [ ] New migration script: scripts/0XX_description.sql
- [ ] Migration README included

## Testing
- [ ] Manual testing completed
- [ ] Works on mobile
- [ ] Real-time updates tested
- [ ] No console errors

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Fixes #123
```

## Code Review Process

### What to Expect

1. **Initial Review**: Maintainer will review within a few days
2. **Feedback**: May request changes or improvements
3. **Iteration**: Make requested changes and push updates
4. **Approval**: Once approved, PR will be merged

### Review Criteria

Your PR will be checked for:
- Follows coding standards (AI_RULES.md)
- Uses required libraries (no alternatives)
- TypeScript types are correct
- RLS policies are appropriate
- Real-time subscriptions clean up properly
- Code is well-documented
- Changes are minimal and focused

## Common Mistakes to Avoid

❌ **Don't:**
- Use custom CSS instead of Tailwind
- Use alternative UI libraries instead of shadcn/ui
- Use different icon libraries instead of lucide-react
- Skip RLS policies on new tables
- Forget to clean up real-time subscriptions
- Make unrelated changes in the same PR
- Leave console.log statements in code

✅ **Do:**
- Follow the mandatory library requirements
- Add JSDoc comments to complex functions
- Test real-time features thoroughly
- Keep PRs focused and small
- Document database changes
- Ask questions if unsure

## Getting Help

### Before Asking

1. Check [DEVELOPMENT.md](./DEVELOPMENT.md) for setup issues
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Search existing GitHub issues
4. Check [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) for known issues

### Where to Ask

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and ideas
- **Pull Request Comments**: Questions about your PR

### Good Questions

- "How should I implement X given the architecture?"
- "Which shadcn component should I use for Y?"
- "Where should this file go in the project structure?"
- "How do I test real-time subscriptions locally?"

## Documentation Contributions

Documentation improvements are always welcome!

### What Needs Documentation

- Feature implementation guides
- Code examples
- Troubleshooting tips
- Architecture explanations
- Migration procedures

### Documentation Standards

- Use Markdown
- Include code examples
- Add links to related docs
- Keep up-to-date with code
- Place in appropriate directory:
  - `/docs/guides/` for feature guides
  - Root for main docs (ARCHITECTURE.md, etc.)

## License

By contributing to PodBridge, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing:
1. Check the documentation links at the top
2. Search GitHub issues
3. Create a new discussion on GitHub
4. Reach out to the maintainers

Thank you for contributing to PodBridge! 🎉
