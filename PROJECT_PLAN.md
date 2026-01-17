# MISSION: BUILD ENTERPRISE-GRADE ABA THERAPY SAAS PLATFORM IN NEXT.JS

You are tasked with building a complete, production-ready, HIPAA-compliant multi-tenant SaaS platform using Next.js 14+ (App Router) for the Applied Behavior Analysis (ABA) healthcare industry [memory:11]. This is a medical-grade system handling Protected Health Information (PHI) for children with Autism Spectrum Disorder.

## CRITICAL CONSTRAINTS

1. **HIPAA COMPLIANCE IS NON-NEGOTIABLE:** AES-256 encryption for PHI, complete audit logging, session management [web:20][web:23]
2. **Multi-Tenant Architecture:** Shared PostgreSQL database with Row-Level Security for strict tenant isolation [web:19][web:22]
3. **Local Storage Only:** PostgreSQL 15+ for all data, local filesystem (`/storage`) for documents
4. **Clean Code Structure:** Modular Next.js App Router architecture - well-organized folders [memory:12]
5. **Production Ready:** TypeScript, error boundaries, validation, security middleware, logging

## TECH STACK - NEXT.JS FULL-STACK

**Frontend & Backend:**
- Next.js 14+ (App Router with Server Components and Server Actions)
- TypeScript 5+ (strict mode)
- React 18+ (Server Components + Client Components)
- Server Actions for mutations
- API Routes for external integrations

**Styling:**
- Tailwind CSS 3+
- shadcn/ui components (accessible, customizable)
- Radix UI primitives
- Lucide React icons

**State Management:**
- Server Components (default state from database)
- React Context for client-side global state
- Zustand for complex client state (optional)
- SWR or TanStack Query for data fetching/caching

**Database & ORM:**
- PostgreSQL 15+ (local instance)
- Prisma ORM (with Row-Level Security via raw queries)
- Prisma Client for type-safe queries
- Prisma Migrate for schema management

**Authentication:**
- NextAuth.js v5 (Auth.js) with Credentials provider
- JWT sessions stored in secure HTTP-only cookies
- Custom authorization middleware
- Session timeout: 15 minutes inactivity

**Form Handling & Validation:**
- React Hook Form
- Zod for schema validation (client + server)
- Server-side validation on all mutations

**AI Integration:**
- OpenAI SDK for GPT-4 Turbo
- Streaming responses for AI reviews
- Edge runtime for AI endpoints (optional)

**File Storage:**
- Local filesystem (`/storage/documents`, `/storage/certifications`)
- Custom file upload API routes with streaming
- Access control via database references

**Testing:**
- Jest + React Testing Library
- Playwright for E2E tests
- Prisma Client mock for unit tests

**Development Tools:**
- ESLint + Prettier
- Husky for pre-commit hooks
- TypeScript strict mode
- Environment variable validation with Zod

## PROJECT STRUCTURE - NEXT.JS APP ROUTER

aba-saas-platform/
├── src/
│ ├── app/ # Next.js App Router
│ │ ├── (auth)/ # Route group for auth pages
│ │ │ ├── login/
│ │ │ │ └── page.tsx
│ │ │ ├── register/
│ │ │ │ └── page.tsx
│ │ │ └── layout.tsx # Auth layout (centered, no nav)
│ │ ├── (dashboard)/ # Route group for authenticated app
│ │ │ ├── layout.tsx # Main dashboard layout (sidebar, header)
│ │ │ ├── page.tsx # Dashboard home
│ │ │ ├── patients/
│ │ │ │ ├── page.tsx # Patient list
│ │ │ │ ├── [id]/
│ │ │ │ │ ├── page.tsx # Patient details
│ │ │ │ │ └── edit/
│ │ │ │ │ └── page.tsx
│ │ │ │ └── new/
│ │ │ │ └── page.tsx # Create patient
│ │ │ ├── treatment-plans/
│ │ │ │ ├── page.tsx # Treatment plan list
│ │ │ │ ├── [id]/
│ │ │ │ │ ├── page.tsx # View treatment plan
│ │ │ │ │ ├── edit/
│ │ │ │ │ │ └── page.tsx
│ │ │ │ │ ├── versions/
│ │ │ │ │ │ └── page.tsx # Version history
│ │ │ │ │ └── ai-review/
│ │ │ │ │ └── page.tsx # AI review results
│ │ │ │ └── new/
│ │ │ │ └── page.tsx
│ │ │ ├── templates/
│ │ │ │ ├── page.tsx
│ │ │ │ └── [id]/
│ │ │ │ └── page.tsx
│ │ │ ├── training/
│ │ │ │ ├── page.tsx # Training modules
│ │ │ │ └── [id]/
│ │ │ │ └── page.tsx # Module details
│ │ │ ├── reports/
│ │ │ │ ├── page.tsx # Analytics dashboard
│ │ │ │ └── compliance/
│ │ │ │ └── page.tsx
│ │ │ ├── organization/
│ │ │ │ ├── settings/
│ │ │ │ │ └── page.tsx
│ │ │ │ ├── users/
│ │ │ │ │ └── page.tsx # User management
│ │ │ │ └── billing/
│ │ │ │ └── page.tsx
│ │ │ └── notifications/
│ │ │ └── page.tsx
│ │ ├── api/ # API Routes
│ │ │ ├── auth/
│ │ │ │ └── [...nextauth]/
│ │ │ │ └── route.ts # NextAuth configuration
│ │ │ ├── patients/
│ │ │ │ ├── route.ts # GET /api/patients (list), POST (create)
│ │ │ │ └── [id]/
│ │ │ │ └── route.ts # GET, PUT, DELETE specific patient
│ │ │ ├── treatment-plans/
│ │ │ │ ├── route.ts
│ │ │ │ └── [id]/
│ │ │ │ ├── route.ts
│ │ │ │ ├── ai-review/
│ │ │ │ │ └── route.ts # POST AI review
│ │ │ │ ├── approve/
│ │ │ │ │ └── route.ts
│ │ │ │ └── versions/
│ │ │ │ └── route.ts
│ │ │ ├── organizations/
│ │ │ │ ├── route.ts
│ │ │ │ └── [id]/
│ │ │ │ ├── route.ts
│ │ │ │ └── invite/
│ │ │ │ └── route.ts
│ │ │ ├── upload/
│ │ │ │ └── route.ts # File upload endpoint
│ │ │ ├── reports/
│ │ │ │ └── compliance/
│ │ │ │ └── route.ts
│ │ │ └── health/
│ │ │ └── route.ts # Health check
│ │ ├── layout.tsx # Root layout (providers, fonts)
│ │ ├── globals.css # Tailwind imports
│ │ └── error.tsx # Global error boundary
│ ├── components/ # React components
│ │ ├── ui/ # shadcn/ui components
│ │ │ ├── button.tsx
│ │ │ ├── input.tsx
│ │ │ ├── select.tsx
│ │ │ ├── dialog.tsx
│ │ │ ├── table.tsx
│ │ │ ├── form.tsx
│ │ │ ├── card.tsx
│ │ │ ├── badge.tsx
│ │ │ ├── toast.tsx
│ │ │ └── dropdown-menu.tsx
│ │ ├── auth/
│ │ │ ├── login-form.tsx # Client component
│ │ │ ├── register-form.tsx
│ │ │ └── auth-guard.tsx # Protect routes
│ │ ├── patients/
│ │ │ ├── patient-card.tsx
│ │ │ ├── patient-form.tsx # Create/Edit form
│ │ │ ├── patient-list.tsx
│ │ │ └── patient-details.tsx
│ │ ├── treatment-plans/
│ │ │ ├── plan-form.tsx
│ │ │ ├── plan-viewer.tsx
│ │ │ ├── plan-status-badge.tsx
│ │ │ ├── goal-editor.tsx # Dynamic goal array editor
│ │ │ ├── behavior-editor.tsx
│ │ │ ├── intervention-editor.tsx
│ │ │ ├── ai-review-panel.tsx # Display AI suggestions
│ │ │ ├── workflow-actions.tsx # Submit, Approve buttons
│ │ │ ├── version-history.tsx
│ │ │ └── comments-section.tsx # Discussion thread
│ │ ├── layout/
│ │ │ ├── header.tsx # Top navigation
│ │ │ ├── sidebar.tsx # Left navigation
│ │ │ ├── org-switcher.tsx # Switch between orgs
│ │ │ ├── user-menu.tsx
│ │ │ └── notifications-bell.tsx
│ │ ├── templates/
│ │ │ ├── template-selector.tsx
│ │ │ └── template-form.tsx
│ │ ├── reports/
│ │ │ ├── compliance-dashboard.tsx
│ │ │ ├── analytics-chart.tsx
│ │ │ └── metrics-card.tsx
│ │ └── shared/
│ │ ├── loading-spinner.tsx
│ │ ├── error-message.tsx
│ │ ├── empty-state.tsx
│ │ ├── confirm-dialog.tsx
│ │ └── data-table.tsx # Reusable table with sorting, filtering
│ ├── lib/ # Utilities and configurations
│ │ ├── auth/
│ │ │ ├── auth-config.ts # NextAuth configuration
│ │ │ ├── auth-options.ts # Auth options
│ │ │ └── session.ts # Session utilities
│ │ ├── db/
│ │ │ ├── prisma.ts # Prisma client singleton
│ │ │ └── queries/ # Complex queries
│ │ │ ├── patients.ts
│ │ │ ├── treatment-plans.ts
│ │ │ └── organizations.ts
│ │ ├── services/
│ │ │ ├── encryption.ts # AES-256 encryption/decryption
│ │ │ ├── ai-reviewer.ts # AI treatment plan review
│ │ │ ├── pdf-generator.ts # Generate treatment plan PDFs
│ │ │ ├── email.ts # Email notifications
│ │ │ ├── file-storage.ts # Local file operations
│ │ │ └── audit-logger.ts # HIPAA audit logging
│ │ ├── middleware/
│ │ │ ├── tenant.ts # Extract org context
│ │ │ ├── rbac.ts # Role-based access control
│ │ │ └── rate-limit.ts # API rate limiting
│ │ ├── validations/
│ │ │ ├── auth.ts # Zod schemas for auth
│ │ │ ├── patient.ts # Patient validation schemas
│ │ │ ├── treatment-plan.ts # Treatment plan schemas
│ │ │ └── common.ts # Shared validation rules
│ │ ├── hooks/ # Custom React hooks
│ │ │ ├── use-session.ts # Wrapper around NextAuth
│ │ │ ├── use-organization.ts # Current org context
│ │ │ ├── use-patients.ts # SWR hook for patients
│ │ │ ├── use-treatment-plans.ts
│ │ │ └── use-notifications.ts
│ │ ├── utils/
│ │ │ ├── cn.ts # Tailwind class merger
│ │ │ ├── formatters.ts # Date, phone, currency formatters
│ │ │ ├── validators.ts # Custom validators
│ │ │ ├── constants.ts # App constants (roles, statuses)
│ │ │ └── helpers.ts # Generic utilities
│ │ └── types/
│ │ ├── database.ts # Prisma generated types
│ │ ├── api.ts # API request/response types
│ │ ├── auth.ts # Auth types
│ │ └── index.ts # Barrel exports
│ ├── actions/ # Server Actions
│ │ ├── auth.ts # Login, logout, register actions
│ │ ├── patients.ts # Patient CRUD actions
│ │ ├── treatment-plans.ts # Treatment plan actions
│ │ ├── organizations.ts # Org management actions
│ │ └── notifications.ts # Mark as read, etc.
│ └── context/ # React Context providers
│ ├── organization-context.tsx # Current org state
│ ├── theme-context.tsx # Light/dark mode
│ └── toast-context.tsx # Global toast notifications
├── prisma/
│ ├── schema.prisma # Database schema
│ ├── migrations/ # Prisma migrations
│ └── seed.ts # Seed data for development
├── storage/ # Local file storage
│ ├── documents/
│ │ └── {org_id}/
│ │ └── {patient_id}/
│ ├── certifications/
│ │ └── {user_id}/
│ └── temp/
├── public/ # Static assets
│ ├── images/
│ └── fonts/
├── tests/
│ ├── unit/
│ ├── integration/
│ └── e2e/
├── .env.example
├── .env.local # Local environment variables
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── middleware.ts # Next.js middleware (auth, tenant)
└── README.md

text

## DATABASE SCHEMA - PRISMA

### Prisma Schema (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// TENANT MASTER
// ============================================
model Organization {
  id               Int      @id @default(autoincrement())
  name             String   @db.VarChar(255)
  domain           String?  @unique @db.VarChar(100)
  subdomain        String   @unique @db.VarChar(50)
  status           OrgStatus @default(ACTIVE)
  subscriptionPlan SubscriptionPlan @default(STARTER)
  maxUsers         Int      @default(10)
  maxPatients      Int      @default(50)
  features         Json     @default("{\"aiReviewer\": false, \"trainingModule\": false}")
  settings         Json     @default("{}")
  billingEmail     String?  @db.VarChar(255)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

  // Relations
  users            OrganizationUser[]
  patients         Patient[]
  treatmentPlans   TreatmentPlan[]
  templates        Template[]
  trainingModules  TrainingModule[]
  notifications    Notification[]
  auditLogs        AuditLog[]
  aiReviews        AIReview[]

  @@index([domain])
  @@index([subdomain])
  @@index([status])
  @@map("organizations")
}

enum OrgStatus {
  ACTIVE
  SUSPENDED
  TRIAL
  CANCELLED
}

enum SubscriptionPlan {
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

// ============================================
// USERS & AUTH
// ============================================
model User {
  id                      Int       @id @default(autoincrement())
  email                   String    @unique @db.VarChar(255)
  passwordHash            String    @db.VarChar(255)
  firstName               String    @db.VarChar(100)
  lastName                String    @db.VarChar(100)
  phone                   String?   @db.VarChar(20)
  profileImagePath        String?   @db.VarChar(500)
  status                  UserStatus @default(ACTIVE)
  isIndependentClinician  Boolean   @default(false)
  emailVerified           Boolean   @default(false)
  emailVerificationToken  String?   @db.VarChar(255)
  passwordResetToken      String?   @db.VarChar(255)
  passwordResetExpires    DateTime?
  lastLogin               DateTime?
  lastActivity            DateTime?
  failedLoginAttempts     Int       @default(0)
  lockedUntil             DateTime?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  deletedAt               DateTime?

  // Relations
  organizations           OrganizationUser[]
  patientsCreated         Patient[] @relation("PatientCreator")
  patientsAsBCBA          Patient[] @relation("AssignedBCBA")
  patientsAsRBT           Patient[] @relation("AssignedRBT")
  treatmentPlansCreated   TreatmentPlan[] @relation("PlanCreator")
  treatmentPlansReviewed  TreatmentPlan[] @relation("PlanReviewer")
  treatmentPlansApproved  TreatmentPlan[] @relation("PlanApprover")
  comments                Comment[]
  templatesCreated        Template[]
  notifications           Notification[]
  auditLogs               AuditLog[]
  aiReviews               AIReview[]
  trainingCompletions     UserTrainingCompletion[]
  invitedUsers            OrganizationUser[] @relation("InvitedBy")

  @@index([email])
  @@index([status])
  @@map("users")
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

model OrganizationUser {
  id             Int      @id @default(autoincrement())
  organizationId Int
  userId         Int
  role           UserRole
  permissions    Json     @default("{}")
  invitedById    Int?
  invitedAt      DateTime?
  joinedAt       DateTime?
  status         OrgUserStatus @default(PENDING_INVITE)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  invitedBy      User?        @relation("InvitedBy", fields: [invitedById], references: [id])

  @@unique([organizationId, userId])
  @@index([organizationId, status])
  @@index([userId])
  @@index([role])
  @@map("organization_users")
}

enum UserRole {
  ORG_ADMIN
  CLINICAL_DIRECTOR
  BCBA
  RBT
  BT
  HR_MANAGER
}

enum OrgUserStatus {
  PENDING_INVITE
  ACTIVE
  INACTIVE
}

// ============================================
// PATIENTS (PHI - ENCRYPTED)
// ============================================
model Patient {
  id                        Int       @id @default(autoincrement())
  organizationId            Int
  
  // ENCRYPTED PHI FIELDS (stored as base64 TEXT)
  firstNameEncrypted        String    @db.Text
  lastNameEncrypted         String    @db.Text
  dateOfBirthEncrypted      String    @db.Text
  ssnEncrypted              String?   @db.Text
  addressEncrypted          String?   @db.Text
  parentGuardianEncrypted   String?   @db.Text
  phoneEncrypted            String?   @db.Text
  emailEncrypted            String?   @db.Text
  emergencyContactEncrypted String?   @db.Text
  insuranceInfoEncrypted    String?   @db.Text
  
  // Non-PHI
  patientCode               String    @unique @db.VarChar(50)
  diagnosis                 Json      @default("{}")
  allergies                 String[]  @default([])
  medications               Json      @default("[]")
  status                    PatientStatus @default(ACTIVE)
  assignedBCBAId            Int?
  assignedRBTId             Int?
  enrollmentDate            DateTime?
  dischargeDate             DateTime?
  consentForms              Json      @default("[]")
  
  createdById               Int
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt
  deletedAt                 DateTime?

  // Relations
  organization              Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy                 User         @relation("PatientCreator", fields: [createdById], references: [id])
  assignedBCBA              User?        @relation("AssignedBCBA", fields: [assignedBCBAId], references: [id])
  assignedRBT               User?        @relation("AssignedRBT", fields: [assignedRBTId], references: [id])
  treatmentPlans            TreatmentPlan[]

  @@index([organizationId, status])
  @@index([patientCode])
  @@index([assignedBCBAId])
  @@index([assignedRBTId])
  @@map("patients")
}

enum PatientStatus {
  ACTIVE
  INACTIVE
  DISCHARGED
  ON_HOLD
}

// ============================================
// TREATMENT PLANS (CORE CLINICAL DOCUMENT)
// ============================================
model TreatmentPlan {
  id                      Int       @id @default(autoincrement())
  organizationId          Int
  patientId               Int
  
  // Versioning
  version                 Int       @default(1)
  parentVersionId         Int?
  
  // Plan Content (JSONB)
  title                   String    @db.VarChar(255)
  goals                   Json      @default("[]")
  behaviors               Json      @default("[]")
  interventions           Json      @default("[]")
  dataCollectionMethods   Json      @default("[]")
  sessionFrequency        String?   @db.VarChar(100)
  reviewCycle             String?   @db.VarChar(50)
  additionalNotes         String?   @db.Text
  
  // Workflow State Machine
  status                  PlanStatus @default(DRAFT)
  workflowHistory         Json      @default("[]")
  
  // Authorship & Approvals
  createdById             Int
  reviewedById            Int?
  approvedById            Int?
  approvedAt              DateTime?
  rejectionReason         String?   @db.Text
  
  // AI Integration
  aiReviewed              Boolean   @default(false)
  aiReviewId              Int?
  aiSuggestionsAccepted   Int       @default(0)
  aiSuggestionsRejected   Int       @default(0)
  
  // Compliance Dates
  effectiveDate           DateTime?
  expiryDate              DateTime?
  nextReviewDate          DateTime?
  
  // Document Storage
  documentPath            String?   @db.VarChar(500)
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  deletedAt               DateTime?

  // Relations
  organization            Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  patient                 Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)
  createdBy               User         @relation("PlanCreator", fields: [createdById], references: [id])
  reviewedBy              User?        @relation("PlanReviewer", fields: [reviewedById], references: [id])
  approvedBy              User?        @relation("PlanApprover", fields: [approvedById], references: [id])
  parentVersion           TreatmentPlan? @relation("PlanVersions", fields: [parentVersionId], references: [id])
  childVersions           TreatmentPlan[] @relation("PlanVersions")
  aiReview                AIReview?    @relation("PlanAIReview", fields: [aiReviewId], references: [id])
  aiReviews               AIReview[]   @relation("PlanReviews")
  comments                Comment[]

  @@unique([patientId, version])
  @@index([organizationId, status])
  @@index([patientId])
  @@index([createdById])
  @@index([status])
  @@index([expiryDate])
  @@map("treatment_plans")
}

enum PlanStatus {
  DRAFT
  PENDING_BCBA_REVIEW
  PENDING_CLINICAL_DIRECTOR
  APPROVED
  ACTIVE
  ARCHIVED
  REJECTED
}

// ============================================
// AI REVIEWS
// ============================================
model AIReview {
  id                 Int       @id @default(autoincrement())
  treatmentPlanId    Int
  organizationId     Int
  
  aiModel            String    @db.VarChar(100)
  reviewType         ReviewType
  
  // Results
  overallScore       Float?
  confidenceScore    Float?
  riskFlags          Json      @default("[]")
  suggestions        Json      @default("[]")
  complianceFlags    Json      @default("[]")
  strengths          Json      @default("[]")
  overallFeedback    String?   @db.Text
  
  // Performance
  reviewDurationMs   Int?
  promptTokens       Int?
  completionTokens   Int?
  totalCost          Float?
  
  reviewedById       Int
  reviewedAt         DateTime  @default(now())
  createdAt          DateTime  @default(now())

  // Relations
  treatmentPlan      TreatmentPlan @relation("PlanReviews", fields: [treatmentPlanId], references: [id], onDelete: Cascade)
  organization       Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  reviewedBy         User          @relation(fields: [reviewedById], references: [id])
  linkedPlan         TreatmentPlan? @relation("PlanAIReview")

  @@index([treatmentPlanId])
  @@index([organizationId])
  @@index([reviewedAt])
  @@map("ai_reviews")
}

enum ReviewType {
  DRAFT_REVIEW
  CLINICAL_REVIEW
  COMPLIANCE_REVIEW
}

// ============================================
// COMMENTS
// ============================================
model Comment {
  id                Int       @id @default(autoincrement())
  treatmentPlanId   Int
  userId            Int
  parentCommentId   Int?
  
  commentText       String    @db.Text
  isResolved        Boolean   @default(false)
  resolvedById      Int?
  resolvedAt        DateTime?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  // Relations
  treatmentPlan     TreatmentPlan @relation(fields: [treatmentPlanId], references: [id], onDelete: Cascade)
  user              User          @relation(fields: [userId], references: [id])
  parentComment     Comment?      @relation("CommentReplies", fields: [parentCommentId], references: [id])
  replies           Comment[]     @relation("CommentReplies")

  @@index([treatmentPlanId])
  @@index([userId])
  @@map("comments")
}

// ============================================
// TEMPLATES
// ============================================
model Template {
  id               Int       @id @default(autoincrement())
  organizationId   Int?
  createdById      Int
  
  name             String    @db.VarChar(255)
  description      String?   @db.Text
  templateType     String    @default("treatment_plan") @db.VarChar(50)
  templateContent  Json
  
  isActive         Boolean   @default(true)
  isPublic         Boolean   @default(false)
  usageCount       Int       @default(0)
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?

  // Relations
  organization     Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy        User          @relation(fields: [createdById], references: [id])

  @@index([organizationId, isActive])
  @@index([isPublic])
  @@map("templates")
}

// ============================================
// TRAINING (Phase 2 - Architect Now)
// ============================================
model TrainingModule {
  id                  Int       @id @default(autoincrement())
  organizationId      Int?
  
  title               String    @db.VarChar(255)
  description         String?   @db.Text
  moduleType          ModuleType
  contentUrl          String?   @db.VarChar(500)
  contentPath         String?   @db.VarChar(500)
  durationMinutes     Int?
  passingScore        Int       @default(80)
  requiredForRoles    UserRole[]
  
  hasQuiz             Boolean   @default(false)
  quizQuestions       Json      @default("[]")
  
  isActive            Boolean   @default(true)
  orderIndex          Int       @default(0)
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Relations
  organization        Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  completions         UserTrainingCompletion[]

  @@index([organizationId, isActive])
  @@index([moduleType])
  @@map("training_modules")
}

enum ModuleType {
  ORIENTATION
  RBT_40HR
  HIP_HEALTH
  ATCC
  CONTINUING_ED
  CUSTOM
}

model UserTrainingCompletion {
  id                Int       @id @default(autoincrement())
  userId            Int
  trainingModuleId  Int
  organizationId    Int
  
  startedAt         DateTime?
  completedAt       DateTime?
  score             Float?
  attempts          Int       @default(1)
  
  certificatePath   String?   @db.VarChar(500)
  expiryDate        DateTime?
  
  status            CompletionStatus @default(NOT_STARTED)
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  user              User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  trainingModule    TrainingModule @relation(fields: [trainingModuleId], references: [id], onDelete: Cascade)

  @@unique([userId, trainingModuleId, organizationId])
  @@index([userId, organizationId])
  @@index([status])
  @@index([expiryDate])
  @@map("user_training_completions")
}

enum CompletionStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  EXPIRED
  FAILED
}

// ============================================
// NOTIFICATIONS
// ============================================
model Notification {
  id                   Int       @id @default(autoincrement())
  userId               Int
  organizationId       Int?
  
  title                String    @db.VarChar(255)
  message              String?   @db.Text
  notificationType     NotificationType
  priority             NotificationPriority @default(NORMAL)
  
  relatedResourceType  String?   @db.VarChar(50)
  relatedResourceId    Int?
  
  isRead               Boolean   @default(false)
  readAt               DateTime?
  
  actionUrl            String?   @db.VarChar(500)
  
  createdAt            DateTime  @default(now())

  // Relations
  user                 User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization         Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([organizationId])
  @@index([createdAt])
  @@map("notifications")
}

enum NotificationType {
  TREATMENT_PLAN_REVIEW
  TREATMENT_PLAN_APPROVED
  TREATMENT_PLAN_REJECTED
  CERTIFICATION_EXPIRING
  PLAN_EXPIRING
  PATIENT_ASSIGNMENT
  SYSTEM_ALERT
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

// ============================================
// AUDIT LOGS (HIPAA COMPLIANCE)
// ============================================
model AuditLog {
  id                 Int       @id @default(autoincrement())
  organizationId     Int?
  userId             Int?
  
  action             String    @db.VarChar(100)
  resourceType       String?   @db.VarChar(50)
  resourceId         Int?
  
  ipAddress          String    @db.Inet
  userAgent          String?   @db.Text
  requestMethod      String?   @db.VarChar(10)
  requestPath        String?   @db.VarChar(500)
  requestBody        Json?
  responseStatus     Int?
  
  changes            Json?
  
  phiAccessed        Boolean   @default(false)
  consentVerified    Boolean   @default(true)
  
  responseTimeMs     Int?
  
  createdAt          DateTime  @default(now())

  // Relations
  organization       Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user               User?         @relation(fields: [userId], references: [id])

  @@index([organizationId])
  @@index([userId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([phiAccessed])
  @@index([createdAt])
  @@index([ipAddress])
  @@map("audit_logs")
}
AUTHENTICATION - NEXTAUTH.JS V5
Auth Configuration (lib/auth/auth-config.ts)
typescript
import NextAuth, { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { loginSchema } from "@/lib/validations/auth"
import { createAuditLog } from "@/lib/services/audit-logger"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        // Validate input
        const validatedFields = loginSchema.safeParse(credentials)
        if (!validatedFields.success) {
          return null
        }

        const { email, password } = validatedFields.data

        // Get user
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            organizations: {
              where: { status: 'ACTIVE' },
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    subdomain: true,
                    features: true
                  }
                }
              }
            }
          }
        })

        if (!user || user.deletedAt) {
          return null
        }

        // Check status
        if (user.status !== 'ACTIVE') {
          throw new Error('Account inactive or suspended')
        }

        // Check if locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('Account locked due to too many failed attempts')
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash)

        if (!isValidPassword) {
          // Increment failed attempts
          const failedAttempts = user.failedLoginAttempts + 1
          const lockAccount = failedAttempts >= 5
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failedAttempts,
              lockedUntil: lockAccount 
                ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
                : null
            }
          })

          return null
        }

        // Success - reset failed attempts
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLogin: new Date(),
            lastActivity: new Date()
          }
        })

        // Audit log
        await createAuditLog({
          userId: user.id,
          organizationId: user.organizations?.organizationId || null,
          action: 'login',
          ipAddress: req.headers?.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers?.get('user-agent') || 'unknown'
        })

        // Return user for session
        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          isIndependentClinician: user.isIndependentClinician,
          organizations: user.organizations.map(ou => ({
            id: ou.organization.id,
            name: ou.organization.name,
            subdomain: ou.organization.subdomain,
            role: ou.role,
            features: ou.organization.features
          }))
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.isIndependentClinician = user.isIndependentClinician
        token.organizations = user.organizations
        token.currentOrgId = user.organizations?.id || null
      }

      // Update session (from client)
      if (trigger === "update" && session) {
        if (session.currentOrgId) {
          token.currentOrgId = session.currentOrgId
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.isIndependentClinician = token.isIndependentClinician as boolean
        session.user.organizations = token.organizations as any[]
        session.user.currentOrgId = token.currentOrgId as number | null
        
        // Get current org details
        const currentOrg = token.organizations?.find(
          (org: any) => org.id === token.currentOrgId
        )
        session.user.currentOrg = currentOrg || null
      }
      return session
    }
  },

  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login'
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 15 * 60, // 15 minutes
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
Middleware (middleware.ts)
typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth-config'

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Public routes
  const publicRoutes = ['/login', '/register', '/api/health']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect all other routes
  if (!isPublicRoute && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check inactivity timeout (15 minutes)
  if (session?.user) {
    const lastActivity = session.user.lastActivity
    if (lastActivity) {
      const inactiveTime = Date.now() - new Date(lastActivity).getTime()
      const maxInactivity = 15 * 60 * 1000 // 15 minutes

      if (inactiveTime > maxInactivity) {
        // Force logout
        return NextResponse.redirect(new URL('/login?timeout=true', request.url))
      }
    }
  }

  // Set tenant context header for API routes
  if (pathname.startsWith('/api') && session?.user?.currentOrgId) {
    const response = NextResponse.next()
    response.headers.set('x-organization-id', session.user.currentOrgId.toString())
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
ENCRYPTION SERVICE
AES-256 Encryption (lib/services/encryption.ts)
typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // Must be 32 bytes (64 hex chars)

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
}

const KEY = Buffer.from(ENCRYPTION_KEY, 'hex')

export function encrypt(text: string): string {
  if (!text) return ''
  
  // Generate random IV (16 bytes)
  const iv = crypto.randomBytes(16)
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  // Prepend IV to encrypted data
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  
  try {
    // Split IV and encrypted data
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts, 'hex')
    const encrypted = parts[1]
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

// Bulk encrypt/decrypt for patient objects
export function encryptPatientPHI(data: any) {
  return {
    firstNameEncrypted: encrypt(data.firstName),
    lastNameEncrypted: encrypt(data.lastName),
    dateOfBirthEncrypted: encrypt(data.dateOfBirth),
    ssnEncrypted: data.ssn ? encrypt(data.ssn) : null,
    addressEncrypted: data.address ? encrypt(JSON.stringify(data.address)) : null,
    parentGuardianEncrypted: data.parentGuardian ? encrypt(JSON.stringify(data.parentGuardian)) : null,
    phoneEncrypted: data.phone ? encrypt(data.phone) : null,
    emailEncrypted: data.email ? encrypt(data.email) : null,
    emergencyContactEncrypted: data.emergencyContact ? encrypt(JSON.stringify(data.emergencyContact)) : null,
    insuranceInfoEncrypted: data.insuranceInfo ? encrypt(JSON.stringify(data.insuranceInfo)) : null,
  }
}

export function decryptPatientPHI(patient: any) {
  return {
    ...patient,
    firstName: decrypt(patient.firstNameEncrypted),
    lastName: decrypt(patient.lastNameEncrypted),
    dateOfBirth: decrypt(patient.dateOfBirthEncrypted),
    ssn: patient.ssnEncrypted ? decrypt(patient.ssnEncrypted) : null,
    address: patient.addressEncrypted ? JSON.parse(decrypt(patient.addressEncrypted)) : null,
    parentGuardian: patient.parentGuardianEncrypted ? JSON.parse(decrypt(patient.parentGuardianEncrypted)) : null,
    phone: patient.phoneEncrypted ? decrypt(patient.phoneEncrypted) : null,
    email: patient.emailEncrypted ? decrypt(patient.emailEncrypted) : null,
    emergencyContact: patient.emergencyContactEncrypted ? JSON.parse(decrypt(patient.emergencyContactEncrypted)) : null,
    insuranceInfo: patient.insuranceInfoEncrypted ? JSON.parse(decrypt(patient.insuranceInfoEncrypted)) : null,
  }
}
AI REVIEWER SERVICE
AI Treatment Plan Review (lib/services/ai-reviewer.ts)
typescript
import OpenAI from 'openai'
import { prisma } from '@/lib/db/prisma'
import { decrypt } from './encryption'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert Board Certified Behavior Analyst (BCBA) with 15+ years reviewing ABA treatment plans for children with Autism Spectrum Disorder.

Analyze against:
1. BACB Ethics Code compliance
2. Evidence-based ABA practices
3. Goal measurability (observable, specific criteria)
4. FBA alignment
5. Age-appropriateness
6. Data collection validity
7. Safety assessment

RULES:
- DO NOT modify the plan
- ONLY provide suggestions with rationale
- Reference ABA principles
- Flag safety concerns as HIGH severity

OUTPUT JSON FORMAT:
{
  "overall_score": 0.0-1.0,
  "confidence_score": 0.0-1.0,
  "risk_flags": [{
    "flag": "string",
    "severity": "high|medium|low",
    "description": "string",
    "recommendation": "string"
  }],
  "suggestions": [{
    "field": "goals|behaviors|interventions|dataCollectionMethods",
    "index": number | null,
    "sub_field": "string" | null,
    "current_value": "string",
    "suggestion": "string",
    "reason": "string",
    "priority": "high|medium|low",
    "aba_principle": "string",
    "example": "string"
  }],
  "compliance_flags": [{
    "regulation": "string",
    "issue": "string",
    "recommendation": "string",
    "severity": "critical|high|medium|low"
  }],
  "strengths": ["string"],
  "overall_feedback": "string"
}`

interface AIReviewParams {
  treatmentPlanId: number
  reviewType: 'DRAFT_REVIEW' | 'CLINICAL_REVIEW' | 'COMPLIANCE_REVIEW'
  userId: number
}

export async function reviewTreatmentPlan({
  treatmentPlanId,
  reviewType,
  userId
}: AIReviewParams) {
  const startTime = Date.now()

  // Get treatment plan with patient context
  const plan = await prisma.treatmentPlan.findUnique({
    where: { id: treatmentPlanId },
    include: {
      patient: true,
      organization: true
    }
  })

  if (!plan) {
    throw new Error('Treatment plan not found')
  }

  // Check if AI feature enabled
  const features = plan.organization.features as any
  if (!features.aiReviewer) {
    throw new Error('AI reviewer not enabled for organization')
  }

  // Calculate patient age
  const dob = new Date(decrypt(plan.patient.dateOfBirthEncrypted))
  const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

  // Get previous plans count
  const previousPlansCount = await prisma.treatmentPlan.count({
    where: {
      patientId: plan.patientId,
      id: { not: plan.id },
      status: { in: ['APPROVED', 'ACTIVE', 'ARCHIVED'] }
    }
  })

  // Build user prompt
  const userPrompt = `
PATIENT CONTEXT:
- Age: ${age.toFixed(1)} years old
- Diagnosis: ${JSON.stringify(plan.patient.diagnosis, null, 2)}
- Treatment History: ${previousPlansCount > 0 ? `${previousPlansCount} previous plans` : 'First treatment plan'}

TREATMENT PLAN TO REVIEW:
Version: ${plan.version}
Title: ${plan.title}

GOALS (${(plan.goals as any[]).length}):
${JSON.stringify(plan.goals, null, 2)}

BEHAVIORS (${(plan.behaviors as any[]).length}):
${JSON.stringify(plan.behaviors, null, 2)}

INTERVENTIONS (${(plan.interventions as any[]).length}):
${JSON.stringify(plan.interventions, null, 2)}

DATA COLLECTION METHODS (${(plan.dataCollectionMethods as any[]).length}):
${JSON.stringify(plan.dataCollectionMethods, null, 2)}

SESSION DETAILS:
- Frequency: ${plan.sessionFrequency || 'Not specified'}
- Review Cycle: ${plan.reviewCycle || 'Not specified'}

REVIEW TYPE: ${reviewType}

${getReviewTypeInstructions(reviewType)}

Provide comprehensive feedback in the JSON format specified.
`

  try {
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    // Parse AI response
    const aiResult = JSON.parse(completion.choices.message.content!)

    // Calculate cost (approximate GPT-4 Turbo pricing)
    const promptTokens = completion.usage?.prompt_tokens || 0
    const completionTokens = completion.usage?.completion_tokens || 0
    const cost = (promptTokens * 0.01 / 1000) + (completionTokens * 0.03 / 1000)

    // Save AI review
    const aiReview = await prisma.aiReview.create({
      data: {
        treatmentPlanId: plan.id,
        organizationId: plan.organizationId,
        aiModel: process.env.AI_MODEL || 'gpt-4-turbo',
        reviewType,
        overallScore: aiResult.overall_score,
        confidenceScore: aiResult.confidence_score,
        riskFlags: aiResult.risk_flags,
        suggestions: aiResult.suggestions,
        complianceFlags: aiResult.compliance_flags || [],
        strengths: aiResult.strengths || [],
        overallFeedback: aiResult.overall_feedback,
        reviewDurationMs: duration,
        promptTokens,
        completionTokens,
        totalCost: cost,
        reviewedById: userId
      }
    })

    // Update treatment plan
    await prisma.treatmentPlan.update({
      where: { id: plan.id },
      data: {
        aiReviewed: true,
        aiReviewId: aiReview.id
      }
    })

    return aiReview
  } catch (error) {
    console.error('AI review failed:', error)
    throw new Error('AI review failed: ' + (error as Error).message)
  }
}

function getReviewTypeInstructions(reviewType: string): string {
  const instructions = {
    DRAFT_REVIEW: `
FOCUS FOR DRAFT REVIEW:
- Basic completeness
- Obvious errors or missing elements
- Formatting clarity
- Be educational and supportive (for RBT/BT)`,
    
    CLINICAL_REVIEW: `
FOCUS FOR CLINICAL REVIEW:
- Clinical accuracy and evidence-base
- Goal measurability and appropriateness
- Intervention effectiveness and safety
- Data collection validity
- Best practices alignment
- Comprehensive review for BCBA approval`,
    
    COMPLIANCE_REVIEW: `
FOCUS FOR COMPLIANCE REVIEW:
- BACB Ethics Code compliance
- HIPAA considerations
- Documentation completeness
- Legal/regulatory requirements
- Informed consent elements
- Final check before approval`
  }

  return instructions[reviewType] || instructions.CLINICAL_REVIEW
}
EXAMPLE SERVER ACTION
Patient Creation Action (actions/patients.ts)
typescript
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/auth-config'
import { encryptPatientPHI } from '@/lib/services/encryption'
import { createAuditLog } from '@/lib/services/audit-logger'
import { patientSchema } from '@/lib/validations/patient'
import { z } from 'zod'

export async function createPatient(data: z.infer<typeof patientSchema>) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const currentOrgId = session.user.currentOrgId
  if (!currentOrgId) {
    throw new Error('No organization selected')
  }

  // Validate input
  const validatedData = patientSchema.parse(data)

  // Check user role
  const userOrg = session.user.organizations.find(o => o.id === currentOrgId)
  if (!['ORG_ADMIN', 'BCBA', 'CLINICAL_DIRECTOR'].includes(userOrg?.role || '')) {
    throw new Error('Insufficient permissions')
  }

  // Encrypt PHI
  const encryptedPHI = encryptPatientPHI(validatedData)

  // Generate patient code
  const org = await prisma.organization.findUnique({
    where: { id: currentOrgId }
  })

  const lastPatient = await prisma.patient.findFirst({
    where: { organizationId: currentOrgId },
    orderBy: { id: 'desc' }
  })

  const patientNumber = lastPatient ? lastPatient.id + 1 : 1
  const patientCode = `${org!.subdomain.toUpperCase()}-${String(patientNumber).padStart(4, '0')}`

  // Create patient
  const patient = await prisma.patient.create({
    data: {
      ...encryptedPHI,
      organizationId: currentOrgId,
      patientCode,
      diagnosis: validatedData.diagnosis,
      allergies: validatedData.allergies || [],
      medications: validatedData.medications || [],
      assignedBCBAId: validatedData.assignedBCBAId,
      assignedRBTId: validatedData.assignedRBTId,
      enrollmentDate: validatedData.enrollmentDate,
      createdById: parseInt(session.user.id)
    }
  })

  // Audit log
  await createAuditLog({
    organizationId: currentOrgId,
    userId: parseInt(session.user.id),
    action: 'create_patient',
    resourceType: 'patient',
    resourceId: patient.id,
    phiAccessed: true,
    changes: { patient_code: patientCode }
  })

  revalidatePath('/patients')
  
  return { success: true, patientId: patient.id }
}
API ROUTE EXAMPLE
AI Review API Route (app/api/treatment-plans/[id]/ai-review/route.ts)
typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth-config'
import { reviewTreatmentPlan } from '@/lib/services/ai-reviewer'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const reviewSchema = z.object({
  review_type: z.enum(['DRAFT_REVIEW', 'CLINICAL_REVIEW', 'COMPLIANCE_REVIEW'])
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const planId = parseInt(params.id)
    const body = await request.json()
    const { review_type } = reviewSchema.parse(body)

    // Get treatment plan
    const plan = await prisma.treatmentPlan.findUnique({
      where: { id: planId },
      include: { patient: true }
    })

    if (!plan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check access
    if (plan.organizationId !== session.user.currentOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Trigger AI review
    const aiReview = await reviewTreatmentPlan({
      treatmentPlanId: planId,
      reviewType: review_type,
      userId: parseInt(session.user.id)
    })

    return NextResponse.json({
      ai_review_id: aiReview.id,
      overall_score: aiReview.overallScore,
      confidence_score: aiReview.confidenceScore,
      risk_flags: aiReview.riskFlags,
      suggestions: aiReview.suggestions,
      compliance_flags: aiReview.complianceFlags,
      strengths: aiReview.strengths,
      overall_feedback: aiReview.overallFeedback,
      reviewed_at: aiReview.reviewedAt
    })
  } catch (error) {
    console.error('AI review error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
ENVIRONMENT VARIABLES
.env.example
bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aba_saas?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Encryption (CRITICAL - Generate with: openssl rand -hex 32)
ENCRYPTION_KEY="64-character-hex-string-32-bytes"

# AI Service
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4-turbo"

# Email (Optional for MVP)
MAIL_SERVER="smtp.gmail.com"
MAIL_PORT="587"
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"

# File Storage
STORAGE_PATH="./storage"
MAX_UPLOAD_SIZE="10485760"  # 10MB

# Node Environment
NODE_ENV="development"
KEY IMPLEMENTATION NOTES
1. Row-Level Security with Prisma
Since Prisma doesn't natively support RLS policies, implement tenant isolation via:

Middleware that sets session variables

Raw SQL for RLS setup

Prisma middleware to auto-filter by organization

typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

// Middleware for tenant isolation
prisma.$use(async (params, next) => {
  // Auto-add organizationId filter for tenant-scoped models
  const tenantModels = ['Patient', 'TreatmentPlan', 'Template', 'AIReview']
  
  if (tenantModels.includes(params.model || '')) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      // Auto-filter by current org (get from context/headers)
      // This requires passing orgId through function params or global context
    }
  }
  
  return next(params)
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
2. Org Context Management
Use React Context to manage current organization:

typescript
// context/organization-context.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import { useSession, update } from 'next-auth/react'

const OrgContext = createContext<{
  currentOrg: any
  switchOrg: (orgId: number) => void
} | null>(null)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const currentOrg = session?.user?.currentOrg

  const switchOrg = async (orgId: number) => {
    await update({ currentOrgId: orgId })
  }

  return (
    <OrgContext.Provider value={{ currentOrg, switchOrg }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrganization = () => {
  const context = useContext(OrgContext)
  if (!context) throw new Error('useOrganization must be within OrgProvider')
  return context
}
3. Client vs Server Components
Server Components (default): Data fetching, PHI display, layouts

Client Components ('use client'): Forms, interactive UI, real-time updates

4. Data Fetching Patterns
Server Components: Direct Prisma calls

Client Components: SWR/TanStack Query with API routes

Mutations: Server Actions (preferred) or API routes

5. Security Checklist
✅ PHI encrypted at rest (AES-256)

✅ JWT tokens in HTTP-only cookies

✅ Session timeout (15 min inactivity)

✅ Audit logging on all PHI access

✅ Role-based access control

✅ Input validation (Zod on client + server)

✅ Rate limiting on API routes

✅ CORS configuration

✅ SQL injection prevention (Prisma ORM)

✅ XSS prevention (React escaping)

MVP DELIVERY CHECKLIST
Phase 1 - Core Platform:

✅ Authentication (NextAuth with credentials)

✅ Multi-tenant organization management

✅ User invitation & role assignment

✅ Patient CRUD with PHI encryption

✅ Treatment plan creation & editing

✅ Treatment plan versioning

✅ AI review integration

✅ Workflow (draft → review → approve)

✅ Basic audit logging

✅ Responsive UI (Tailwind + shadcn/ui)

Phase 2 - Enhancement:

Training modules

Advanced analytics

Email notifications

Document generation (PDFs)

File upload system

CRITICAL SUCCESS FACTORS
Never store unencrypted PHI - Always use encryption service

Always audit PHI access - Create audit log on every read/write

Enforce tenant isolation - Check organizationId on every query

Validate on server - Never trust client-side validation alone

Use TypeScript strictly - Catch errors at compile time

Test with real data - Use realistic scenarios (child ages, diagnoses)

BUILD THIS PLATFORM WITH PRODUCTION-GRADE QUALITY. EVERY LINE OF CODE MUST BE READY FOR REAL CLINICAL USE WITH CHILDREN'S MEDICAL DATA.