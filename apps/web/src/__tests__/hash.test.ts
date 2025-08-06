import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/hash'

describe('Password Hashing', () => {
  it('should hash a password', async () => {
    const password = 'testpassword123'
    const hash = await hashPassword(password)

    expect(hash).toBeDefined()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(0)
  })

  it('should verify a correct password', async () => {
    const password = 'testpassword123'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('should reject an incorrect password', async () => {
    const password = 'testpassword123'
    const wrongPassword = 'wrongpassword'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword(wrongPassword, hash)
    expect(isValid).toBe(false)
  })

  it('should generate different hashes for the same password', async () => {
    const password = 'testpassword123'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    expect(hash1).not.toBe(hash2)

    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true)
    expect(await verifyPassword(password, hash2)).toBe(true)
  })
})
