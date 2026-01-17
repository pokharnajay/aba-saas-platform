# ABA Therapy SAAS Platform

Enterprise-grade HIPAA-compliant multi-tenant SaaS platform for Applied Behavior Analysis (ABA) therapy management.

## Features

### Phase 1 (MVP) - Implemented
- ✅ NextAuth v5 authentication with credentials provider
- ✅ Multi-tenant organization management
- ✅ User role-based access control (RBAC)
- ✅ Patient management with AES-256 PHI encryption
- ✅ Treatment plan creation and versioning
- ✅ AI-powered treatment plan review (OpenAI GPT-4)
- ✅ Treatment plan workflow (draft → review → approve)
- ✅ HIPAA-compliant audit logging
- ✅ Responsive dashboard with Tailwind CSS + shadcn/ui

### Security Features
- AES-256-CBC encryption for all PHI data
- JWT sessions with HTTP-only cookies
- 15-minute inactivity timeout
- Complete audit logging for compliance
- Row-level security for tenant isolation
- Password complexity requirements
- Account lockout after failed login attempts

## Tech Stack

- **Frontend/Backend**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: OpenAI GPT-4 Turbo
- **Encryption**: Node.js crypto (AES-256-CBC)

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ running locally
- OpenAI API key (for AI features)

### 1. Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aba_saas?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# Encryption (CRITICAL - Must be 64 hex characters)
ENCRYPTION_KEY="your-64-char-hex-key"  # Generate with: openssl rand -hex 32

# AI Service (Optional for MVP testing)
OPENAI_API_KEY="sk-your-openai-key"
AI_MODEL="gpt-4-turbo"

# Node Environment
NODE_ENV="development"
```

### 2. Generate Encryption Key

```bash
# Generate a secure 32-byte encryption key
openssl rand -hex 32

# Generate NextAuth secret
openssl rand -base64 32
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The platform uses a comprehensive PostgreSQL schema with:

- **Organizations**: Multi-tenant support with subscription plans
- **Users**: Authentication and authorization
- **OrganizationUser**: Junction table for multi-org membership
- **Patients**: PHI data encrypted at rest
- **TreatmentPlans**: Core clinical documents with versioning
- **AIReview**: AI-generated treatment plan reviews
- **Comments**: Discussion threads on treatment plans
- **Templates**: Reusable treatment plan templates
- **TrainingModules**: Staff training and certification tracking
- **Notifications**: System notifications
- **AuditLogs**: HIPAA-compliant audit trail

## User Roles

- **ORG_ADMIN**: Full organization management
- **CLINICAL_DIRECTOR**: Clinical oversight and approvals
- **BCBA**: Treatment plan creation and approval
- **RBT**: Registered Behavior Technician
- **BT**: Behavior Technician
- **HR_MANAGER**: HR and user management

## Security Checklist

- ✅ PHI encrypted at rest (AES-256)
- ✅ JWT tokens in HTTP-only cookies
- ✅ Session timeout (15 min inactivity)
- ✅ Audit logging on all PHI access
- ✅ Role-based access control
- ✅ Input validation (Zod on client + server)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention (React escaping)
- ✅ Password complexity requirements
- ✅ Account lockout protection

## API Routes

- `/api/auth/[...nextauth]` - NextAuth endpoints
- `/api/patients` - Patient CRUD operations
- `/api/treatment-plans` - Treatment plan management
- `/api/treatment-plans/[id]/ai-review` - AI review endpoint
- `/api/organizations` - Organization management

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Database operations
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
```

## Production Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build the application
5. Deploy to your hosting platform

## License

UNLICENSED - Proprietary Software

## Support

For support and questions, please contact the development team.
