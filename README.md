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
- **Notes** - Rich text notes with tags and JSON content

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
api.note.*     // Note management
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
