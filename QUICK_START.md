# Quick Start Guide - ABA SAAS Platform

## Current Status
✅ Server is running at: **http://localhost:3001**

## Database Setup Required

### Step 1: Start PostgreSQL

Choose one method based on your setup:

**If using Homebrew:**
```bash
brew services start postgresql@15
# or
brew services start postgresql
```

**If installed manually:**
```bash
pg_ctl -D /usr/local/var/postgres start
```

**Verify it's running:**
```bash
psql -V  # Check PostgreSQL is installed
```

### Step 2: Create Database

```bash
# Create the database
createdb aba_saas

# Verify it was created
psql -l | grep aba_saas
```

### Step 3: Apply Database Schema

```bash
cd "/Users/jaypokharna/Desktop/Shared Folder/Shared Folder/python/aba_saas"
npm run db:push
```

### Step 4: Seed Test Data

```bash
npm run db:seed
```

This will create test users with the following credentials:

## 🔐 Test Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Org Admin** | admin@demo-aba.com | Password123! |
| **Clinical Director** | director@demo-aba.com | Password123! |
| **BCBA** | bcba@demo-aba.com | Password123! |
| **RBT** | rbt@demo-aba.com | Password123! |

**Organization Details:**
- Name: Demo ABA Clinic
- Subdomain: demo

---

## Alternative: Register Your Own Account

If you prefer to create your own account instead of using test data:

1. Go to: http://localhost:3001/register
2. Fill in the registration form:
   - Organization Name (e.g., "My ABA Clinic")
   - Subdomain (unique, e.g., "myaba")
   - First Name
   - Last Name
   - Email
   - Password (min 8 chars, must include uppercase, lowercase, number, special char)
   - Phone (optional)
3. Click "Create Account"
4. You'll be automatically logged in as ORG_ADMIN

---

## Testing the Platform

Once logged in, you can:

1. **Dashboard** - View organization overview
2. **Patients** - Add and manage patients (PHI is encrypted)
3. **Treatment Plans** - Create and manage treatment plans
4. **AI Review** - Test AI-powered treatment plan review (requires OpenAI API key)
5. **User Management** - Invite team members with different roles

---

## Troubleshooting

### PostgreSQL not installed?

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Database connection failed?

Check your .env file has the correct DATABASE_URL:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/aba_saas?schema=public"
```

### Can't create database?

```bash
# Connect to PostgreSQL
psql postgres

# Create database manually
CREATE DATABASE aba_saas;

# Exit
\q
```

---

## Quick Access

- **App URL**: http://localhost:3001
- **Login**: http://localhost:3001/login
- **Register**: http://localhost:3001/register
- **Dashboard**: http://localhost:3001/dashboard

---

## Need Help?

Check the main [README.md](README.md) for detailed documentation.
