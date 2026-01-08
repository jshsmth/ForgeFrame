/**
 * Generate a unique identifier
 * Combines timestamp with random string for uniqueness
 */
export function generateUID(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 11);
  return `${timestamp}_${random}`;
}

/**
 * Generate a short unique identifier (for function refs, etc.)
 */
export function generateShortUID(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Check if a string is a valid ForgeFrame UID
 */
export function isValidUID(uid: string): boolean {
  return /^[a-z0-9]+_[a-z0-9]+$/.test(uid);
}
