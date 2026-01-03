/**
 * OAuth Utility Functions
 * 
 * Provides utilities for OAuth flow including:
 * - State generation and validation
 * - Token encryption/decryption
 * - PKCE (Proof Key for Code Exchange) support
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Generate a random state parameter for OAuth CSRF protection
 */
export function generateState(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Generate PKCE code verifier and challenge
 * Used by OAuth 2.0 with PKCE extension for enhanced security
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url')
  
  // For S256 challenge method
  const crypto = require('crypto')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  return { codeVerifier, codeChallenge }
}

/**
 * Encrypt a token for secure storage
 * Uses AES-256-GCM encryption
 */
export function encryptToken(token: string): string {
  const encryptionKey = process.env.OAUTH_ENCRYPTION_KEY
  
  if (!encryptionKey) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is not set')
  }
  
  // Ensure key is 32 bytes (256 bits)
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32))
  const iv = randomBytes(16)
  
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(token, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  // Combine IV + auth tag + encrypted data
  const result = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    data: encrypted,
  }
  
  return JSON.stringify(result)
}

/**
 * Decrypt a token from storage
 */
export function decryptToken(encryptedToken: string): string {
  const encryptionKey = process.env.OAUTH_ENCRYPTION_KEY
  
  if (!encryptionKey) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is not set')
  }
  
  // Ensure key is 32 bytes (256 bits)
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32))
  
  const { iv, authTag, data } = JSON.parse(encryptedToken)
  
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  
  let decrypted = decipher.update(data, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Store OAuth state in a secure way (using cookies or session)
 * This is a helper for managing state across the OAuth redirect flow
 */
export interface OAuthState {
  state: string
  codeVerifier?: string
  platformId: string
  userId: string
  timestamp: number
}

/**
 * Create OAuth state object
 */
export function createOAuthState(platformId: string, userId: string, codeVerifier?: string): OAuthState {
  return {
    state: generateState(),
    codeVerifier,
    platformId,
    userId,
    timestamp: Date.now(),
  }
}

/**
 * Validate OAuth state
 * Ensures state hasn't expired (5 minutes default) and matches expected values
 */
export function validateOAuthState(
  stateObj: OAuthState,
  expectedState: string,
  maxAgeMs: number = 5 * 60 * 1000
): boolean {
  // Check if state matches
  if (stateObj.state !== expectedState) {
    return false
  }
  
  // Check if not expired
  const age = Date.now() - stateObj.timestamp
  if (age > maxAgeMs) {
    return false
  }
  
  return true
}

/**
 * Calculate token expiration time
 */
export function calculateTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000)
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(expiresAt: string | Date, bufferMinutes: number = 5): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const now = new Date()
  const bufferMs = bufferMinutes * 60 * 1000
  
  return expiry.getTime() - now.getTime() < bufferMs
}
