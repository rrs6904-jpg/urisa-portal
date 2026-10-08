import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const TOKEN_BYTES = 32
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

export function newOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function isOpaqueToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value)
}

export function hashOpaqueToken(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function equalTokenHash(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}
