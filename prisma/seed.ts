import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create test organization
  const organization = await prisma.organization.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo ABA Clinic',
      subdomain: 'demo',
      status: 'ACTIVE',
      subscriptionPlan: 'PROFESSIONAL',
      maxUsers: 50,
      maxPatients: 200,
      features: {
        aiReviewer: true,
        trainingModule: true,
      },
      billingEmail: 'admin@demo-aba.com',
    },
  })

  console.log('✓ Created organization:', organization.name)

  // Create test users
  const passwordHash = await bcrypt.hash('Password123!', 10)

  // 1. Organization Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo-aba.com' },
    update: {},
    create: {
      email: 'admin@demo-aba.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '555-0100',
      status: 'ACTIVE',
      emailVerified: true,
    },
  })

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: admin.id,
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  })

  console.log('✓ Created admin user: admin@demo-aba.com')

  // 2. Clinical Director
  const director = await prisma.user.upsert({
    where: { email: 'director@demo-aba.com' },
    update: {},
    create: {
      email: 'director@demo-aba.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '555-0101',
      status: 'ACTIVE',
      emailVerified: true,
    },
  })

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: director.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: director.id,
      role: 'CLINICAL_DIRECTOR',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  })

  console.log('✓ Created clinical director: director@demo-aba.com')

  // 3. BCBA
  const bcba = await prisma.user.upsert({
    where: { email: 'bcba@demo-aba.com' },
    update: {},
    create: {
      email: 'bcba@demo-aba.com',
      passwordHash,
      firstName: 'Michael',
      lastName: 'Smith',
      phone: '555-0102',
      status: 'ACTIVE',
      emailVerified: true,
    },
  })

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: bcba.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: bcba.id,
      role: 'BCBA',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  })

  console.log('✓ Created BCBA: bcba@demo-aba.com')

  // 4. RBT
  const rbt = await prisma.user.upsert({
    where: { email: 'rbt@demo-aba.com' },
    update: {},
    create: {
      email: 'rbt@demo-aba.com',
      passwordHash,
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '555-0103',
      status: 'ACTIVE',
      emailVerified: true,
    },
  })

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: rbt.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: rbt.id,
      role: 'RBT',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  })

  console.log('✓ Created RBT: rbt@demo-aba.com')

  console.log('\n=================================')
  console.log('Seed completed successfully!')
  console.log('=================================')
  console.log('\nTest Credentials:')
  console.log('─────────────────────────────────')
  console.log('Email: admin@demo-aba.com')
  console.log('Email: director@demo-aba.com')
  console.log('Email: bcba@demo-aba.com')
  console.log('Email: rbt@demo-aba.com')
  console.log('Password (all): Password123!')
  console.log('─────────────────────────────────')
  console.log('Organization: Demo ABA Clinic')
  console.log('Subdomain: demo')
  console.log('=================================\n')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
