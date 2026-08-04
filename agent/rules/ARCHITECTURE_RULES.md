# Architecture Rules

## 1. High-Level Architecture (RPC Pattern)

The application uses a **Typesafe RPC** pattern connecting Next.js Client Components to Appwrite via Hono.

```mermaid
graph TD
    Client[Next.js Client (Browser)] -->|Uses| Hook[Feature Hook (React Query)]
    Hook -->|Calls| RPC[Hono RPC Client]
    RPC -->|HTTP Request| API[Next.js Route Handler (/api/*)]
    API -->|Dispatches| Hono[Hono Server]
    Hono -->|Validates| Schema[Zod Schema]
    Hono -->|Checks Auth| Middleware[Session Middleware]
    Hono -->|Executes| Logic[Route Handler / Use Case]
    Logic -->|Interacts| Appwrite[Appwrite SDK]
```

## 2. Layer Definitions

### Presentation Layer (Client)
- **Location**: `src/app`, `src/features/*/components`, `src/components`
- **Responsibility**: Rendering UI, handling user interaction.
- **State**: Manages server state via React Query hooks (`src/features/*/api`).
- **Constraint**: NEVER import server-side logic directly.

### API Layer (Interface)
- **Location**: `src/features/*/api` (Hooks), `src/lib/rpc.ts`
- **Responsibility**: Providing typesafe interfaces for the frontend to call the backend.
- **Mechanism**: `useMutation`, `useQuery` wrapping Hono RPC client.

### Backend Layer (Server)
- **Location**: `src/features/*/server`
- **Responsibility**: Request handling, validation, orchestration.
- **Entry Point**: `route.ts` (Hono app instance).
- **Logic**: Simple CRUD logic stays in `route.ts`. Complex business logic goes to `use-cases/`.

### Data/Domain Layer
- **Location**: `src/features/*/types.ts`, `src/features/*/schemas.ts`
- **Responsibility**: Defining data shapes and validation rules.
- **Database**: Appwrite is the source of truth.

## 3. Dependency Rules

1.  **Strict Boundary**: Client Code (`components`, `hooks`) MUST NOT import Server Code (`server`, `node-appwrite`).
2.  **Shared Domain**: `types.ts` and `schemas.ts` are shared and can be imported by both Client and Server.
3.  **Feature Isolation**: Features should generally be independent.
    *   To share logic between features, check if it belongs in `src/lib` (generic) or if strict boundaries are needed.
    *   Current pattern allows importing types/utils from other features (e.g., `workspaces` imports `members/types`).

## 4. Coupling & Extension

- **Use Cases**: Use `use-cases` folder when a route handler exceeds ~50 lines of logic or involves multiple steps.
- **Hono Composition**: The main `src/app/api/[[...route]]/route.ts` composes all feature routes. THIS is the central registry.
- **Client RPC**: The client is auto-generated from the type of the main route. This ensures end-to-end type safety.
