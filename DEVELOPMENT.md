# AquaLink PH — Development Guide

## Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** or **bun**
- A **Supabase** or **Neon** account (for PostgreSQL in production)

## Local Setup

### 1. Clone & Install
```bash
git clone <repo-url>
cd aqualink-ph
npm install --legacy-peer-deps
```

### 2. Environment
```bash
cp .env.example .env
# For local dev with SQLite, the default DATABASE_URL is fine
```

### 3. Database
```bash
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema to SQLite
npx tsx prisma/seed.ts   # Seed with PH test data
```

### 4. Run
```bash
npm run dev              # http://localhost:3000
```

## Production Build

### Build
```bash
npm run build
```

### Fix TypeScript Errors
The build currently has TS errors in:
- `src/types/next-auth.d.ts` — Session type augmentation (add `role` field to NextAuth types)
- Missing `DropdownMenuLabel` export in `dropdown-menu.tsx`

Fix them before deploying.

### Deploy to Vercel
1. Push to GitHub
2. Connect repo to Vercel
3. Set env vars (DATABASE_URL, NEXTAUTH_SECRET, etc.)
4. Deploy

## Database Migrations

### Schema Changes
```bash
npx prisma migrate dev --name describe_changes
npx prisma db push        # For prototyping without migration
npx prisma studio         # Visual DB browser
```

## Test Accounts (after seeding)

| Role | Phone | Password |
|------|-------|----------|
| Customer | 09170000002 | password123 |
| Customer | 09170000003 | password123 |
| Provider | 09170000004 | password123 |
| Provider | 09170000005 | password123 |
| Provider | 09170000006 | password123 |
| Admin | 09170000001 | password123 |

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to DB |
| `npm run db:seed` | Seed test data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Run linter |
| `npm run format` | Format code |
| `npm test` | Run tests |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL or SQLite connection string |
| `NEXTAUTH_URL` | Yes | App URL (e.g., http://localhost:3000) |
| `NEXTAUTH_SECRET` | Yes | Random string for JWT encryption |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `NEXT_PUBLIC_APP_NAME` | No | App name (defaults to "AquaLink PH") |
| `NEXT_PUBLIC_DEFAULT_LAT/LNG` | No | Default map center (Manila) |

## Architecture Decisions

### Why Next.js API Routes instead of Express?
- Single deployment, no separate backend server
- Shared types between frontend and backend
- Vercel-optimized deployment
- Reduced infrastructure complexity

### Why SQLite for dev, PostgreSQL for prod?
- SQLite: Zero config, file-based, perfect for local dev
- Prisma abstracts the difference — same schema, same queries
- Switch by changing one env variable

### Why NextAuth with JWT?
- Stateless sessions (no DB lookup needed)
- Built-in CSRF protection
- Easy to extend with OAuth/OTP later