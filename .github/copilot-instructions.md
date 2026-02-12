# AI Coding Instructions for MK Web App V11

## Project Overview

MK Web App V11 is a monorepo design system built with **Next.js 15**, **React 19**, **TypeScript**, and **pnpm workspaces**. The codebase implements a sophisticated visual content editing platform with AI integration, featuring:

- **GridEditorV3**: A tree-based layout editor supporting infinite nesting, layout/content separation, and undo/redo
- **AI Integration**: Template analysis, content generation, and vector search via Gemini AI
- **tRPC + Prisma**: Type-safe backend with database access and auto-generated types
- **MobX State Management**: Reactive UI with `makeAutoObservable` for observable stores
- **Multi-environment Support**: Test, staging, and production builds with environment-specific configs

## Monorepo Structure

```
packages/
├── jiantie/          # Main application (Next.js, 30+ routers)
├── ui/               # Shared UI component library
├── work-rc/          # Works service client (Prisma, tRPC routers)
├── jobs/             # Background job processor
├── search/           # Search indexing service
└── work-stat/        # Analytics service
```

**Workspace reference**: Use `pnpm -F @mk/jiantie` to target jiantie package, or `pnpm -F @workspace/ui` for UI library.

## Critical Development Workflows

### Setup & Installation

```bash
pnpm install                  # Install all dependencies, triggers Prisma generation
pnpm postinstall             # Generates Prisma client + work-rc types
```

### Development & Building

```bash
pnpm dev:jiantie             # Start Next.js with Turbopack
pnpm build:jiantie           # Production build
pnpm format:all              # Format + ESLint fix (required before commits)
```

### Database & AI Vector Management

```bash
pnpm -F @mk/jiantie db:push                          # Apply Prisma schema changes
pnpm -F @mk/jiantie init:ai-vector-table             # Initialize template AI vectors
pnpm -F @mk/jiantie sync:ai-vector                   # Sync template vectors
pnpm -F @mk/jiantie init:works-ai-vector-table       # Initialize works AI vectors
```

### Code Quality

- **Format**: `pnpm format` (Prettier, 2 spaces, single quotes, 80 char width)
- **Lint**: `pnpm lint:fix` (ESLint + TypeScript strict mode)
- **Git Hooks**: `lint-staged` auto-fixes staged files before commit

## Architecture Patterns

### tRPC Routers (Backend API)

**Location**: `packages/jiantie/server/routers/`

All routers follow the pattern: `publicProcedure` (unauthenticated) or `protectedProcedure` (JWT-verified). Context extracts user info from headers (`x-uid`, `x-token`, `x-appid`). Example workflow:

```typescript
// packages/jiantie/server/routers/example.ts
export const exampleRouter = t.router({
  getItem: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // ctx.uid, ctx.token, ctx.prisma are available
    return ctx.prisma.table.findUnique({ where: { id: input.id } });
  }),
});
```

### MobX Stores (State Management)

**Location**: `packages/jiantie/store/` and `packages/work-rc/src/stores/`

Use `makeAutoObservable(this)` for automatic reactivity. Components subscribe via `observer()` wrapper. Example:

```typescript
class WorksStore {
  editingElemId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setEditingElemId(id: string) {
    this.editingElemId = id;
  }
}

// In React component:
const MyComponent = observer(() => {
  const { editingElemId } = worksStore;
  return <div>{editingElemId}</div>;
});
```

### GridEditorV3 Architecture

**Key insight**: Layout (`GridRow` tree) and Content (`LayerElemItem`) are **separated**.

- `GridRow`: Flex/Grid layouts, spacing, nesting (recursive tree structure)
- `LayerElemItem`: Text, images, videos, positioned elements
- `childrenIds`: Array references linking rows to content items
- `depth` array: Path from root (e.g., `[0,1,2]` = `gridsData[0].children[1].children[2]`)

**Core files**: `components/GridEditorV3/`, `packages/work-rc/src/stores/GridOperatorV2.ts`

### API Environment Configuration

**Location**: `packages/jiantie/services/apis.ts`

Environments auto-detect from `process.env.RUN_ENV` or `process.env.ENV`. Four tiers:

- `dev` → test5.maka.im
- `test` → test5.maka.im (same as dev)
- `staging` → staging.maka.im
- `prod` → production domains

Update `EnvConfig` object when adding new API endpoints.

## Project-Specific Conventions

### File Organization

- **Components**: JSX files use `export const ComponentName = () => {}` pattern
- **Server code**: `packages/jiantie/server/` files use `export const` for routers
- **Middleware**: Authentication middleware in `server/middleware/adminAuth.ts` for role-based access
- **Utilities**: Reusable functions in `utils/` directories (e.g., `devices.ts` for browser detection)

### Naming Patterns

- **V2/V3 suffix**: Indicates major component rewrites (GridEditorV3, RowRendererV2)
- **Editor vs Viewer**: Components split between editable (editor) and read-only (viewer) modes
- **Router files**: Use simple names (`works.ts`, `designer.ts`) despite containing 20-30 procedures

### Error Handling & Logging

- **Logger**: `packages/jiantie/server/logger.ts` exports global Pino logger for server
- **tRPC errors**: Throw `TRPCError` with code + message, context auto-serializes with `superjson`
- **Client-side**: Use `@tanstack/react-query` for mutation handling with error states

### Prisma & Database

- **Config**: `packages/jiantie/prisma.config.ts` (custom config file)
- **Auto-generation**: `postinstall` hook runs `pnpm generate` automatically
- **Vector tables**: AI embedding tables require explicit initialization scripts
- **Accelerate**: Uses `@prisma/extension-accelerate` for connection pooling

## Integration Points & Dependencies

### External Services

- **Gemini AI**: `@ai-sdk/google` for content generation/analysis (see `app/api/ai-generate/`)
- **Object Storage**: Aliyun OSS (`ali-oss`) for image uploads, AWS S3 fallback
- **Logging**: Aliyun SLS (`@alicloud/sls20201230`) for server-side event tracking
- **i18n**: `next-intl` for multi-language (Chinese, Indonesian, traditional/simplified)

### Component Dependencies

- **Drag-and-drop**: `@dnd-kit/*` for sortable lists and grid reordering
- **Form handling**: `@hookform/resolvers` with Zod validation
- **UI Framework**: Custom components + Tailwind CSS + Emotion styling
- **State persistence**: Uses `next-intl` config in `pages/` for layout in `i18n/config.ts`

### Cross-Component Communication

- **App Bridge**: `store/app-bridge/` handles native app integration (iOS/Android)
- **Custom hooks**: `useLocalObservable` for component-level MobX stores
- **Context**: `EnvironmentProvider` injects global config and store instances

## Key Files for Understanding

| File                                                                                 | Purpose                                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| [GRIDEDITORV3_TECHNICAL_ANALYSIS.md](GRIDEDITORV3_TECHNICAL_ANALYSIS.md)             | Complete tree-render architecture, data models, undo/redo system |
| [FORMATTING.md](FORMATTING.md)                                                       | Code style rules, Prettier/ESLint config, git hooks              |
| [README.md](README.md)                                                               | High-level project overview, tech stack, dev commands            |
| [packages/jiantie/server/trpc.ts](packages/jiantie/server/trpc.ts)                   | tRPC setup, context, middleware patterns                         |
| [packages/jiantie/store/index.ts](packages/jiantie/store/index.ts)                   | Main MobX store (WorksStore) with 100+ computed properties       |
| [packages/jiantie/components/GridEditorV3](packages/jiantie/components/GridEditorV3) | Editor implementation, renderer components                       |

## Performance Considerations

### Rendering Optimization

- **GridEditorV3 uses MobX reactions** to prevent unnecessary re-renders during large layout changes
- **Recursive rendering**: `RowRendererV2` efficiently handles deep nesting without flattening
- **Component splitting**: Editor components separate from viewer (read-only) to avoid re-render overhead

### Bundle Size

- **Turbopack enabled** in dev for faster builds
- **Dynamic imports**: Use for heavy components (AI editor, template search)
- **Server packages marked external**: Aliyun SDK, NestJS JWT prevented from bundling

### API Optimization

- **tRPC superjson**: Handles Date/Map/Set serialization automatically
- **Batch operations**: Multiple mutations wrapped in single tRPC call where possible
- **Prisma accelerate**: Connection pooling reduces cold-start latency

## Testing Strategy

- **Test framework requirement**: Jest or Vitest (see `.kiro/specs/` for test requirements)
- **Route handler testing**: Mock Prisma context, test request/response cycle
- **Database testing**: Use test database or Prisma mock
- **Coverage target**: 80%+ for core APIs

## Common Pitfalls to Avoid

1. **Mutating MobX state directly outside actions**: Always use methods for state changes
2. **Forgetting `observer()` wrapper**: Components won't re-render on observable changes
3. **Waterfalls in tRPC procedures**: Use `Promise.all()` or `Promise.allSettled()` for parallel queries
4. **Missing Prisma generation**: Run `pnpm generate` after schema changes before building
5. **Hardcoded API URLs**: Always use `EnvConfig` from `services/apis.ts`
6. **Not handling authentication in protectedProcedure**: Check `ctx.token` and `ctx.uid` exist
7. **GridEditorV3 depth array mutation**: Treat `depth` as immutable for tree navigation

## Command Quick Reference

| Task                   | Command                                    |
| ---------------------- | ------------------------------------------ |
| Start dev server       | `pnpm dev:jiantie`                         |
| Format & lint          | `pnpm format:all`                          |
| Build                  | `pnpm build:jiantie`                       |
| Sync Prisma schema     | `pnpm -F @mk/jiantie db:push`              |
| Generate Prisma client | `pnpm -F @mk/jiantie generate`             |
| Check lint errors      | `pnpm lint:check`                          |
| Initialize AI vectors  | `pnpm -F @mk/jiantie init:ai-vector-table` |

---

**Last Updated**: February 2026
**Maintained For**: Claude Haiku, GitHub Copilot, Cursor AI agents
