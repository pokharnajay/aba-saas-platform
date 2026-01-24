import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''
const HMAC_KEY = process.env.HMAC_KEY || process.env.ENCRYPTION_KEY || ''

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn('WARNING: ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32')
}

if (!HMAC_KEY || HMAC_KEY.length !== 64) {
  console.warn('WARNING: HMAC_KEY should be 64 hex characters (32 bytes). Using ENCRYPTION_KEY as fallback.')
}

const KEY = ENCRYPTION_KEY ? Buffer.from(ENCRYPTION_KEY, 'hex') : Buffer.alloc(32)
const HMAC_SECRET = HMAC_KEY ? Buffer.from(HMAC_KEY, 'hex') : Buffer.alloc(32)

/**
 * Generate HMAC for data integrity verification
 * @param data - Data to create HMAC for
 * @returns HMAC as hex string
 */
function generateHMAC(data: string): string {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET)
  hmac.update(data)
  return hmac.digest('hex')
}

/**
 * Verify HMAC for data integrity
 * @param data - Data to verify
 * @param expectedHmac - Expected HMAC value
 * @returns true if valid, false otherwise
 */
function verifyHMAC(data: string, expectedHmac: string): boolean {
  const computedHmac = generateHMAC(data)
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * Encrypts a string using AES-256-CBC encryption with HMAC integrity
 * @param text - Plain text to encrypt
 * @returns Encrypted text with IV and HMAC (format: iv:encryptedData:hmac)
 */
export function encrypt(text: string): string {
  if (!text) return ''

  try {
    // Generate random IV (16 bytes)
    const iv = crypto.randomBytes(16)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Create data string (iv:encrypted)
    const dataWithIV = `${iv.toString('hex')}:${encrypted}`

    // Generate HMAC for integrity verification
    const hmac = generateHMAC(dataWithIV)

    // Return format: iv:encrypted:hmac
    return `${dataWithIV}:${hmac}`
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypts an AES-256-CBC encrypted string with HMAC verification
 * @param encryptedText - Encrypted text with IV and optional HMAC (format: iv:encryptedData or iv:encryptedData:hmac)
 * @returns Decrypted plain text
 * @throws Error if integrity check fails (possible tampering)
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''

  try {
    const parts = encryptedText.split(':')

    // Handle legacy format (iv:encrypted) without HMAC
    if (parts.length === 2) {
      return decryptLegacy(encryptedText)
    }

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const [ivHex, encrypted, hmac] = parts
    const dataWithIV = `${ivHex}:${encrypted}`

    // Verify HMAC integrity
    if (!verifyHMAC(dataWithIV, hmac)) {
      console.error('HMAC verification failed - data may have been tampered with')
      throw new Error('Data integrity check failed - possible tampering detected')
    }

    // Decrypt
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error: any) {
    if (error.message?.includes('integrity') || error.message?.includes('tampering')) {
      throw error // Re-throw integrity errors
    }
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Decrypt legacy format without HMAC (for backwards compatibility)
 * @deprecated Use encrypt() which includes HMAC
 */
function decryptLegacy(encryptedText: string): string {
  const parts = encryptedText.split(':')
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Check if data needs migration to new format with HMAC
 */
export function needsHMACMigration(encryptedText: string): boolean {
  if (!encryptedText) return false
  const parts = encryptedText.split(':')
  return parts.length === 2 // Legacy format without HMAC
}

/**
 * Migrate encrypted data to include HMAC
 * Decrypts with legacy format and re-encrypts with HMAC
 */
export function migrateToHMAC(encryptedText: string): string {
  if (!encryptedText || !needsHMACMigration(encryptedText)) {
    return encryptedText
  }

  const decrypted = decryptLegacy(encryptedText)
  return encrypt(decrypted)
}

/**
 * Encrypts patient PHI fields for database storage
 */
export function encryptPatientPHI(data: {
  firstName: string
  lastName: string
  dateOfBirth: string
  ssn?: string | null
  address?: any
  parentGuardian?: any
  phone?: string | null
  email?: string | null
  emergencyContact?: any
  insuranceInfo?: any
}) {
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

/**
 * Decrypts patient PHI fields from database
 */
export function decryptPatientPHI(patient: {
  firstNameEncrypted: string
  lastNameEncrypted: string
  dateOfBirthEncrypted: string
  ssnEncrypted?: string | null
  addressEncrypted?: string | null
  parentGuardianEncrypted?: string | null
  phoneEncrypted?: string | null
  emailEncrypted?: string | null
  emergencyContactEncrypted?: string | null
  insuranceInfoEncrypted?: string | null
  [key: string]: any
}) {
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

/**
 * Verify encrypted data integrity without decrypting
 */
export function verifyIntegrity(encryptedText: string): boolean {
  if (!encryptedText) return true

  const parts = encryptedText.split(':')
  if (parts.length === 2) {
    // Legacy format - cannot verify integrity
    return true
  }

  if (parts.length !== 3) {
    return false
  }

  const [ivHex, encrypted, hmac] = parts
  return verifyHMAC(`${ivHex}:${encrypted}`, hmac)
}
