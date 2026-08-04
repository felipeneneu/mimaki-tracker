# Appwrite Rules

## 1. Configuration & IDs

- **Single Source of Truth**: All Collection IDs, Database IDs, and Bucket IDs must be exported from `src/config.ts`.
- **Environment Variables**: Never hardcode IDs in the code. Use `process.env.NEXT_PUBLIC_APPWRITE_...`.

## 2. Client Initialization

Access Appwrite **only** via the helper functions in `src/lib/appwrite.ts`:

1.  **Session Client** (`createSessionClient`)
    *   **Context**: Use for user-initiated actions.
    *   **Scope**: Scoped to the current user's permissions.
    *   **Usage**: `const { account, databases } = await createSessionClient();`

2.  **Admin Client** (`createAdminClient`)
    *   **Context**: Use ONLY for system-level background tasks or admin overrides.
    *   **Scope**: Has full access (API Key).
    *   **Restriction**: NEVER import or use in Client Components.

## 3. Authentication Flow

- **Session Middleware**: All protected Hono routes MUST use `sessionMiddleware` from `src/lib/session-middleware.ts`.
- **Context Injection**: The middleware injects `user`, `databases`, `storage`, etc., into the Hono context (`c.get("user")`).
- **Do not create manual clients** inside route handlers; use the injected ones from middleware for performance and consistency.

## 4. Collection & Database Patterns

- **Queries**: Use `Query` from `node-appwrite`.
- **Pagination**: Always handle pagination for list queries if more than one result is expected.
- **Relationships**:
    *   Appwrite is a NoSQL-like document structure.
    *   Manage relationships manually via ID references (e.g., `workspaceId` in `members` collection).
    *   Perform "Joins" application-side (e.g., fetch workspace -> fetch members).

## 5. Security & Permissions

- **Document Security**: Set permissions on the Appwrite Console (Collection Level preferred).
- **Role Validation**: In code, always verify if the current user has the required role (e.g., `MemberRole.ADMIN`) before performing sensitive updates (like `updateWorkspace`).
- **File Storage**: Images and files go to the `IMAGES_BUCKET_ID`. Validate file types and sizes in Zod before upload logic if possible, or handling SDK errors.
