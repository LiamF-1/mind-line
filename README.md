# Mindline - Scalable Productivity Suite

A modern, full-stack productivity application built with the latest scalable technologies for 2025. This monorepo provides a complete foundation for building production-ready applications with type-safety, authentication, real-time capabilities, and modern DevOps practices.

## 🏗️ Architecture

### Tech Stack

| Layer                 | Technology                                                                       | Why it Scales                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Frontend/SSR**      | Next.js 15 (React 19, App Router, Server Components) + TypeScript + Tailwind CSS | Single codebase for pages, APIs, and streaming UI; battle-tested at scale; zero-config edge deployment              |
| **API Layer**         | tRPC inside Next.js Route Handlers                                               | Eliminates REST/GraphQL boilerplate while keeping end-to-end types                                                  |
| **Database & ORM**    | PostgreSQL 16 + Prisma ORM                                                       | Robust relational DB, horizontal read-replicas; Prisma's generated types and migrations pair well with AI prompting |
| **Authentication**    | Auth.js v1 (NextAuth) with Postgres adapter                                      | Modern, OAuth-ready, session & JWT support                                                                          |
| **Caching/Queues**    | Redis                                                                            | Sub-ms access; easy to scale or move to managed Redis                                                               |
| **Testing & Quality** | Vitest + React Testing Library; ESLint, Prettier, Husky                          | Fast, full-stack test runner; consistent code style                                                                 |
| **DevOps**            | Docker/Docker-Compose for local; GitHub Actions CI; Vercel/Fly.io deployment     | Smooth local ↔ prod parity; built-in autoscale                                                                     |
| **Observability**     | Ready for Sentry + OpenTelemetry → Grafana/Prometheus                            | Full trace of server & client issues                                                                                |

### Project Structure

```
mind-line/
├── apps/
│   └── web/                    # Next.js 15 frontend & API routes
│       ├── src/
│       │   ├── app/           # App Router pages & layouts
│       │   ├── components/    # React components
│       │   ├── lib/          # Utilities, auth, db connections
│       │   └── server/       # tRPC routers & procedures
│       ├── prisma/           # Database schema & migrations
│       └── public/           # Static assets
├── packages/
│   └── config/               # Shared tsconfig, eslint, prettier
├── docker/                   # Database initialization scripts
├── .github/workflows/        # CI/CD pipelines
└── docker-compose.yml        # Local development services
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and **pnpm** 8+
- **Docker** and **Docker Compose**
- **Git**

### 1. Clone and Install

```bash
git clone <your-repo-url> Mindline
cd Mindline
pnpm install
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Verify services are running
docker compose ps
```

### 3. Set Up Environment

```bash
# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Edit the environment file with your values
# The defaults should work for local development
```

**Environment Variables:**

- `POSTGRES_URL`: Database connection string for PostgreSQL
- `REDIS_URL`: Redis connection string for caching and sessions
- `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for local development)
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js (minimum 32 characters, change in production)

### 4. Initialize Database

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm migrate

# Optional: Seed with sample data
cd apps/web && pnpm prisma db seed
```

### 5. Start Development Server

```bash
# Start Next.js in development mode
pnpm dev

# Your app will be available at http://localhost:3000
```

## 🔐 Authentication

The application includes a complete authentication system with:

### User Registration & Login

- **Registration**: Create new accounts at `/register`
- **Login**: Sign in at `/login`
- **Dashboard**: Protected area at `/dashboard`

### Authentication Flow

```
1. User visits landing page (/)
2. Click "Get Started" → redirects to /register
3. Fill registration form → creates account & auto-login
4. Redirected to /dashboard (protected route)
5. Can logout → returns to landing page
```

### First User Setup

Create your first user account by:

1. Starting the application (`pnpm dev`)
2. Navigate to http://localhost:3000
3. Click "Get Started" or go directly to `/register`
4. Fill out the registration form
5. You'll be automatically logged in and redirected to the dashboard

### API Endpoints

- `POST /api/auth/register` - User registration
- `GET|POST /api/auth/[...nextauth]` - NextAuth.js authentication routes
- Protected tRPC procedures for user management

## 📅 Calendar Feature

The Mindline calendar provides a complete event management system with a professional interface and full CRUD operations.

### Features

- **Multiple Views**: Month, week, and day views with smooth navigation
- **Event Management**: Create, read, update, and delete events
- **Rich Event Data**: Title, description, date/time, all-day events, location, and color coding
- **Dashboard Integration**: Today's events and upcoming events displayed on dashboard
- **Responsive Design**: Mobile-friendly with collapsible sidebar
- **Real-time Updates**: Optimistic UI updates with toast notifications

### Calendar API

The calendar uses tRPC procedures for type-safe API calls:

```typescript
// Get events by date range
const events = api.event.getByDateRange.useQuery({
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31'),
})

// Create a new event
const createEvent = api.event.create.useMutation()
await createEvent.mutateAsync({
  title: 'Team Meeting',
  description: 'Weekly sync meeting',
  startsAt: new Date('2024-01-15T10:00:00Z'),
  endsAt: new Date('2024-01-15T11:00:00Z'),
  allDay: false,
  color: '#3b82f6',
  location: 'Conference Room A',
})

// Update an existing event
const updateEvent = api.event.update.useMutation()
await updateEvent.mutateAsync({
  id: 'event-id',
  data: { title: 'Updated Meeting Title' },
})

// Delete an event
const deleteEvent = api.event.delete.useMutation()
await deleteEvent.mutateAsync({ id: 'event-id' })
```

### Event Schema

```typescript
interface CalendarEvent {
  id: string
  title: string
  description?: string
  startsAt: Date
  endsAt: Date
  allDay: boolean
  color: string
  location?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}
```

### Usage Examples

#### Creating Events with cURL

```bash
# Create a new event (requires authentication)
curl -X POST 'http://localhost:3000/api/trpc/event.create' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Project Review",
    "description": "Quarterly project review meeting",
    "startsAt": "2024-01-15T14:00:00Z",
    "endsAt": "2024-01-15T15:30:00Z",
    "allDay": false,
    "color": "#22c55e",
    "location": "Room 101"
  }'
```

#### React Hook Usage

```typescript
import { api } from '@/lib/trpc-client'

function MyCalendarComponent() {
  // Fetch events for current month
  const { data: events, isLoading } = api.event.getByDateRange.useQuery({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  })

  // Create event mutation
  const createEvent = api.event.create.useMutation({
    onSuccess: () => {
      toast.success('Event created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleCreateEvent = (eventData) => {
    createEvent.mutate(eventData)
  }

  return (
    <div>
      {/* Your calendar UI */}
    </div>
  )
}
```

## 📝 Notes Feature

The Mindline Notes feature provides a powerful, Notion-style note-taking experience with rich text editing, full-text search, and version history.

### Features

- **Rich Text Editor**: Built with TipTap, supporting headings, lists, code blocks, task lists, and text formatting
- **Auto-save**: Notes save automatically as you type with visual indicators
- **Full-text Search**: PostgreSQL-powered search across note titles and content
- **Tag Organization**: Organize notes with tags for easy categorization and filtering
- **Version History**: Complete revision tracking with the ability to restore previous versions
- **Mobile Responsive**: Optimized for both desktop and mobile editing experiences
- **Keyboard Shortcuts**: Familiar shortcuts like Ctrl+S for manual save, / for slash commands

### Notes API

The notes system uses tRPC procedures for type-safe operations:

```typescript
// List notes with search and pagination
const notes = api.note.list.useInfiniteQuery({
  query: 'search term',
  tag: 'work',
  limit: 20,
})

// Get a single note with revision history
const note = api.note.get.useQuery({ id: 'note-id' })

// Create a new note
const createNote = api.note.create.useMutation()
await createNote.mutateAsync({
  title: 'Meeting Notes',
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Project Planning' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Discussion points...' }],
      },
    ],
  },
  tags: ['meetings', 'planning'],
})

// Update a note (automatically creates revision if content changed)
const updateNote = api.note.update.useMutation()
await updateNote.mutateAsync({
  id: 'note-id',
  data: {
    title: 'Updated Title',
    content: updatedContent,
    tags: ['updated-tag'],
  },
})

// Search notes using full-text search
const searchResults = api.note.search.useQuery({
  query: 'project planning',
  limit: 10,
})

// Get all available tags
const tags = api.note.getTags.useQuery()
```

### Note Schema

```typescript
interface Note {
  id: string
  title: string
  content: JSON // TipTap JSON document
  tags: string[] // Array of tag strings
  createdAt: Date
  updatedAt: Date
  userId: string
  revisions: NoteRevision[]
}

interface NoteRevision {
  id: string
  noteId: string
  content: JSON // Snapshot of content at this revision
  createdAt: Date
}
```

### Editor Features

#### Rich Text Formatting

- **Bold**, _italic_, ~~strikethrough~~ text
- `Inline code` and syntax-highlighted code blocks
- Headings (H1, H2, H3)
- Bullet lists and numbered lists
- Task lists with checkboxes
- Blockquotes
- Text highlighting

#### Keyboard Shortcuts

- `Ctrl/Cmd + B` - Bold
- `Ctrl/Cmd + I` - Italic
- `Ctrl/Cmd + S` - Manual save
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Y` - Redo
- `/` - Open slash command menu (coming soon)

### Seeding Demo Notes

```bash
# Seed the database with demo notes
cd apps/web
npx ts-node prisma/seed-notes.ts

# Or run the full seed script
pnpm prisma db seed
```

### Usage Examples

#### Creating Notes Programmatically

```typescript
import { api } from '@/lib/trpc'

// Create a note with rich content
const note = await api.note.create.mutate({
  title: 'Project Retrospective',
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Sprint Retrospective' }],
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'What went well?' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Team collaboration improved' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  tags: ['retrospective', 'team', 'sprint-1'],
})
```

#### Full-text Search Implementation

The notes feature includes PostgreSQL full-text search with ranking:

```sql
-- Automatic search index creation
CREATE INDEX "note_search_idx"
  ON "notes"
  USING GIN (to_tsvector('simple', title || ' ' || content::text));

-- Search query with ranking
SELECT id, title, content, tags, "createdAt", "updatedAt"
FROM notes
WHERE "user_id" = $1
  AND to_tsvector('simple', title || ' ' || content::text) @@ plainto_tsquery('simple', $2)
ORDER BY ts_rank(to_tsvector('simple', title || ' ' || content::text), plainto_tsquery('simple', $2)) DESC;
```

## 📝 Available Scripts

### Root Level Commands

```bash
# Development
pnpm dev              # Start all development servers
pnpm build            # Build all applications
pnpm lint             # Lint all code
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code with Prettier
pnpm typecheck        # Run TypeScript checks
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode

# Database
pnpm migrate          # Run Prisma migrations
pnpm db:push          # Push schema changes to database
pnpm db:generate      # Generate Prisma client
```

### Web App Specific

```bash
cd apps/web

# Prisma operations
pnpm prisma studio    # Open Prisma Studio (database GUI)
pnpm prisma migrate dev --name <migration-name>
pnpm prisma db seed   # Run seed script
pnpm prisma generate  # Generate Prisma client

# Next.js operations
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
```

## 🏛️ Database Schema

The application includes a complete schema for productivity features:

- **Users** - Authentication and user management (NextAuth.js compatible)
- **Tasks** - Todo/task management with priorities and due dates
- **CalendarEvents** - Calendar events with time ranges and colors
- **Notes** - Rich text notes with tags, revisions, and full-text search

### Key Features

- **Type-safe database operations** with Prisma
- **Automatic migrations** and schema versioning
- **Optimistic relations** for data consistency
- **JSON fields** for flexible content storage

## 🔐 Authentication

Built with Auth.js (NextAuth.js) providing:

- **Multiple providers** - Credentials, Google, GitHub (easily extensible)
- **Session management** - JWT and database sessions
- **Type-safe sessions** - Full TypeScript support
- **Protected routes** - Server and client-side protection
- **Database adapter** - Prisma integration for user storage

### Adding OAuth Providers

1. Install the provider package
2. Add credentials to your environment
3. Configure in `apps/web/src/lib/auth.ts`

## 🛠️ API Layer (tRPC)

End-to-end type-safe APIs with tRPC:

### Router Structure

```typescript
// Available routers
api.user.*     // User management
api.task.*     // Task operations
api.event.*    // Calendar events
api.note.*     // Notes with rich text editing and search
```

### Usage Examples

```typescript
// Client-side usage
const { data: tasks } = trpc.task.getAll.useQuery()
const createTask = trpc.task.create.useMutation()

// Server-side usage
const tasks = await trpc.task.getAll.query()
```

### Protected Procedures

All data operations require authentication:

```typescript
// Automatically includes user context
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { session: ctx.session } })
})
```

## 🧪 Testing

Comprehensive testing setup with Vitest:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Testing Stack

- **Vitest** - Fast unit test runner
- **React Testing Library** - Component testing
- **MSW** - API mocking (if needed)
- **Prisma Test Environment** - Database testing

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically on push

### Docker Production

```bash
# Build production image
docker build -t Mindline .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Required for production:

```bash
POSTGRES_URL="postgresql://..."
REDIS_URL="redis://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"
```

## 🔧 Development Workflow

### Code Quality

- **ESLint** - Code linting with Next.js rules
- **Prettier** - Code formatting with Tailwind plugin
- **Husky** - Git hooks for quality gates
- **Commitlint** - Conventional commit messages

### Git Workflow

```bash
# Feature development
git checkout -b feature/your-feature
git add .
git commit -m "feat: add new feature"  # Follows conventional commits
git push origin feature/your-feature

# Automatic checks run on:
# - Pre-commit: lint-staged, type check
# - Pre-push: tests, build verification
# - CI: full test suite, deployment
```

### CI/CD Pipeline

GitHub Actions automatically:

1. **Installs dependencies** with caching
2. **Runs type checking** across all packages
3. **Lints code** with ESLint
4. **Runs test suite** with coverage
5. **Builds application** for production
6. **Deploys** to staging/production

## 📊 Monitoring & Observability

Ready for production monitoring:

### Error Tracking

```typescript
// Sentry integration ready
import * as Sentry from '@sentry/nextjs'

// tRPC error handling
onError: ({ error, path }) => {
  Sentry.captureException(error, { extra: { path } })
}
```

### Performance Monitoring

- **Next.js Analytics** - Built-in performance metrics
- **OpenTelemetry** - Distributed tracing ready
- **Database monitoring** - Prisma query insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all checks pass
6. Submit a pull request

### Development Setup

```bash
# Install dependencies
pnpm install

# Set up git hooks
pnpm prepare

# Start development environment
docker compose up -d
pnpm dev
```

## 📚 Learn More

- **Next.js 15** - [Documentation](https://nextjs.org/docs)
- **tRPC** - [Documentation](https://trpc.io)
- **Prisma** - [Documentation](https://prisma.io/docs)
- **Auth.js** - [Documentation](https://authjs.dev)
- **Tailwind CSS** - [Documentation](https://tailwindcss.com)

## 🗺️ Roadmap

- [ ] Real-time features with WebSockets
- [ ] File upload and storage
- [ ] Advanced search with full-text search
- [ ] Mobile app with React Native
- [ ] Microservices architecture option
- [ ] Advanced analytics dashboard

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for modern web development**
