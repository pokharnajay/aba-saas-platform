import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn('WARNING: ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32')
}

const KEY = ENCRYPTION_KEY ? Buffer.from(ENCRYPTION_KEY, 'hex') : Buffer.alloc(32)

/**
 * Encrypts a string using AES-256-CBC encryption
 * @param text - Plain text to encrypt
 * @returns Encrypted text as hex string with IV prepended (format: iv:encryptedData)
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

    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypts an AES-256-CBC encrypted string
 * @param encryptedText - Encrypted text with IV (format: iv:encryptedData)
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''

  try {
    // Split IV and encrypted data
    const parts = encryptedText.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format')
    }

    const iv = Buffer.from(parts[0], 'hex')
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
