# TaskForge — Next.js track

A project management teaching application built with Next.js 16, React 19,
TypeScript, Prisma 7, and Tailwind CSS.

## Features

- **Authentication**: Development login/register with NextAuth.js
- **Authorization**: Owner-scoped data with read-only viewer enforcement
- **Dashboard**: Overview of tasks and projects with statistics
- **Projects**: Create, manage, and archive projects
- **Kanban Board**: Visual task management with three columns (To Do, In Progress, Done)
- **Task Management**: Create, update, and delete tasks
- **Comments**: Flat comments on tasks
- **Labels**: Labels in the data model and seed data
- **Priority Levels**: LOW, MEDIUM, HIGH, URGENT

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Database**: SQLite with Prisma ORM 7 and its better-sqlite3 adapter
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui components
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 24.x and npm

### Installation

1. Clone the repository and navigate to the project:

```bash
cd taskforge-tutorial/nextjs
```

2. Set up environment variables:

```bash
cp .env.example .env
```

3. Install the locked dependencies:

```bash
npm ci
```

Edit `.env` and update the following:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

4. Apply the committed database migration and seed the sample data:

```bash
npm run db:setup
```

The seed uses stable identifiers and safely upserts the sample records; it
does not remove work you create during the tutorials.

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Sample Credentials

After seeding, you can login with:

- **Email**: `alice@example.com`
- **Password**: `password123`
- **Role**: Admin

Other test accounts:

- `bob@example.com` / `password123` (member)
- `charlie@example.com` / `password123` (read-only viewer)

## Project Structure

```
nextjs/
├── app/                      # Next.js App Router pages
│   ├── api/                 # API routes
│   ├── auth/                # Authentication pages
│   ├── projects/            # Project pages
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Dashboard
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── task-card.tsx
│   ├── task-board.tsx
│   ├── project-list.tsx
│   └── comment-thread.tsx
├── lib/                     # Utilities and configurations
│   ├── db.ts                # Prisma client
│   ├── database-url.ts      # SQLite path compatibility
│   ├── auth.ts              # NextAuth config
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Utility functions
├── prisma/                  # Database schema and migrations
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── generated/prisma/        # Generated locally during install
├── prisma.config.ts         # Prisma datasource and seed config
└── tests/                   # Test files
```

## Database Schema

- **User**: Authentication and user management
- **Project**: Project organization
- **Task**: Task tracking with status and priority
- **Comment**: Task comments
- **Label**: Custom labels for tasks
- **TaskLabel**: Many-to-many relationship

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Apply safe ESLint fixes
- `npm run typecheck` - Generate route types and run TypeScript without emitting files
- `npm run seed` - Seed database with sample data
- `npm run db:migrate` - Apply committed database migrations
- `npm run db:reset` - Recreate and reseed the local database
- `npm run db:setup` - Apply migrations and seed the database
- `npm run test:coverage` - Run tests with a coverage report
- `npm run test:prisma-compatibility` - Exercise Prisma 5 SQLite timestamp compatibility
- `npm run verify` - Run lint, types, coverage, Prisma compatibility, build, and production dependency audit
- `npx prisma studio` - Open Prisma Studio (database GUI)

## Testing

Run tests with:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Learning baseline

This starter intentionally leaves room for course exercises. It is a local
learning baseline, not a production-ready application:

1. **Direct mutation calls** - Reads use a shared hook, while several mutations
   still call `fetch` directly
2. **No browser-level E2E suite** - Route, page, component, hook, library, and
   seed behavior is covered below the browser boundary
3. **Data-only labels** - Labels and task-label associations exist, but there is
   no label-management interface
4. **Flat comments** - Comments are intentionally simple rather than threaded
   or real time
5. **Minimal UI feedback** - Some failed mutations are logged without an in-page error message

## License

MIT. See the repository-level `LICENSE` file.
