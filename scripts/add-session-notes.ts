import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Create enums
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SessionType" AS ENUM ('THERAPY', 'ASSESSMENT', 'PARENT_TRAINING', 'CONSULTATION', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Create table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "session_notes" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "patientId" INTEGER NOT NULL,
        "treatmentPlanId" INTEGER,
        "sessionType" "SessionType" NOT NULL DEFAULT 'THERAPY',
        "sessionStatus" "SessionStatus" NOT NULL DEFAULT 'COMPLETED',
        "sessionDate" TIMESTAMP(3) NOT NULL,
        "sessionDuration" INTEGER,
        "createdById" INTEGER NOT NULL,
        "sessionNotes" TEXT,
        "goalProgress" JSONB DEFAULT '[]',
        "behaviorsObserved" JSONB DEFAULT '[]',
        "interventionsUsed" JSONB DEFAULT '[]',
        "dataCollected" JSONB DEFAULT '[]',
        "parentFeedback" TEXT,
        "nextSessionPlan" TEXT,
        "staffSignature" VARCHAR(255),
        "signedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "deletedAt" TIMESTAMP(3),

        CONSTRAINT "session_notes_pkey" PRIMARY KEY ("id")
      );
    `)

    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "session_notes_organizationId_idx" ON "session_notes"("organizationId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "session_notes_patientId_idx" ON "session_notes"("patientId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "session_notes_treatmentPlanId_idx" ON "session_notes"("treatmentPlanId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "session_notes_createdById_idx" ON "session_notes"("createdById");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "session_notes_sessionDate_idx" ON "session_notes"("sessionDate");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "session_notes_sessionStatus_idx" ON "session_notes"("sessionStatus");`)

    // Add foreign keys
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_patientId_fkey"
          FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_treatmentPlanId_fkey"
          FOREIGN KEY ("treatmentPlanId") REFERENCES "treatment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "session_notes" ADD CONSTRAINT "session_notes_createdById_fkey"
          FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    console.log('✅ Session notes table created successfully!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
