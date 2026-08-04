# Project Rules

## 1. Tech Stack & Core Modules

- **Framework**: Next.js 16 (App Router)
- **API**: Hono v4 (RPC Pattern)
- **Database/Auth**: Appwrite Cloud
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **State Management**: TanStack Query v5 (Server State) + Nuqs (URL State)
- **Validation**: Zod + @hono/zod-validator
- **Testing**: Vitest

## 2. Directory Structure

The project follows a **Feature-Based Architecture**.

```
src/
├── app/                  # Next.js App Router (Pages & Layouts only)
├── features/             # Business Logic & Feature Modules
│   └── [feature-name]/
│       ├── api/          # Client-side hooks (React Query wrappers)
│       ├── components/   # Feature-specific UI components
│       ├── server/       # Hono route handlers & backend logic
│       │   ├── route.ts  # Main Hono app for this feature
│       │   └── use-cases/# Complex business logic (optional)
│       ├── schemas.ts    # Zod schemas (shared client/server)
│       └── types.ts      # TypeScript definitions
├── lib/                  # Shared utilities (Appwrite clients, RPC client)
├── components/           # Shared UI components (dumb components)
├── ui/                   # Design System primitives (Shadcn)
└── config.ts             # Centralized environment variables & constants
```

## 3. Naming Conventions

### Files & Directories
- **Directories**: `kebab-case` (e.g., `user-profile`)
- **Files**: `kebab-case` (e.g., `user-button.tsx`, `route.ts`)

### Functions & Components
- **React Components**: `PascalCase` (e.g., `UserButton`)
- **Hooks**: `camelCase` prefixed with `use` (e.g., `useCreateWorkspace`)
- **Server Actions/Functions**: `camelCase` (e.g., `generateInviteCode`)

## 4. Coding conventions

### TypeScript
- **Strict Mode**: Enabled. No `any` allowed.
- **Interfaces vs Types**: Prefer `interface` for object shapes, `type` for unions/intersections.
- **Exports**: Named exports preferred over default exports (except for Next.js Pages/Layouts).

### Validation (Zod)
- All API inputs must be validated using Zod schemas.
- Schemas should be defined in `schemas.ts` within the feature.
- Use `@hono/zod-validator` middleware for server-side validation.

## 5. Feature Creation Standard

When adding a new feature `[feature-name]`:

1.  Create `src/features/[feature-name]`.
2.  Define `schemas.ts` for data models.
3.  Create `server/route.ts` defining the Hono app.
4.  Register the route in `src/app/api/[[...route]]/route.ts`.
5.  Create `api/use-[action].ts` hooks for client interaction.

## 6. Security Checklist using Appwrite

- [ ] **Middleware**: Ensure `sessionMiddleware` is used on protected routes.
- [ ] **Permissions**: Verify user role (Admin/Member) before performing actions.
- [ ] **Validation**: Validate all inputs with Zod.
- [ ] **Secrets**: Never expose Appwrite API Keys to the client.
