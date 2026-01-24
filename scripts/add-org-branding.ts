import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Add branding columns to organizations table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS "logoPath" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "primaryColor" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS "secondaryColor" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS "companyWebsite" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "companyPhone" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "companyAddress" TEXT;
    `)

    console.log('✅ Organization branding columns added successfully!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
