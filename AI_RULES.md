# AI Editor Rules for Post Aggregator

This document outlines the technical stack and mandatory library usage rules for maintaining consistency and quality in the Post Aggregator application.

## Technical Stack Overview

1.  **Framework**: Next.js 16, utilizing the App Router for routing and server/client components.
2.  **Language**: TypeScript is mandatory for all application code.
3.  **Backend & Database**: Supabase is used for PostgreSQL database, Realtime subscriptions (WebSockets), and User Authentication (Supabase Auth).
4.  **Styling**: Tailwind CSS v4 is the sole styling utility. All components must be styled using Tailwind classes.
5.  **UI Library**: shadcn/ui components (built on Radix UI primitives) are used for all standard UI elements (Buttons, Cards, Dialogs, etc.).
6.  **Icons**: All icons must be sourced from the `lucide-react` package.
7.  **Date Management**: The `date-fns` library is used for all date and time manipulation and formatting.
8.  **Data Access**: Supabase client wrappers (`@/lib/supabase/client` and `@/lib/supabase/server`) must be used for all database interactions.

## Mandatory Library Usage Rules

| Purpose | Mandatory Library/Tool | Notes |
| :--- | :--- | :--- |
| **UI Components** | `shadcn/ui` (Radix UI) | Always prioritize existing shadcn components. If a component is missing, create a new, small component file. |
| **Styling** | Tailwind CSS | Use Tailwind classes exclusively for all styling. Ensure designs are responsive. |
| **Icons** | `lucide-react` | Do not use external icon libraries. |
| **Date/Time** | `date-fns` | Use for formatting and distance calculations (e.g., `formatDistanceToNow`). |
| **Client-side DB Access** | `@/lib/supabase/client` | Use this wrapper for all client-side Supabase interactions (e.g., fetching data in client components, real-time subscriptions). |
| **Server-side DB Access** | `@/lib/supabase/server` | Use this wrapper for all server-side Supabase interactions (e.g., data fetching in Next.js Server Components/Pages). |
| **Forms** | `react-hook-form` & `zod` | Use these for complex form validation and state management. |