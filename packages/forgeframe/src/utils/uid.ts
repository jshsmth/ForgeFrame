/**
 * Generates a unique identifier by combining a timestamp with a random string.
 *
 * @returns A unique identifier string in the format `{timestamp}_{random}`
 *
 * @remarks
 * The UID is composed of two parts separated by an underscore:
 * - A base-36 encoded timestamp from `Date.now()`
 * - A random base-36 string of up to 9 characters
 *
 * This combination provides both temporal ordering and collision resistance.
 *
 * @example
 * ```typescript
 * const id = generateUID();
 * // Returns something like: "lxyz123_abc456def"
 * ```
 *
 * @public
 */
export function generateUID(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 11);
  return `${timestamp}_${random}`;
}

/**
 * Generates a short unique identifier suitable for function references and internal use.
 *
 * @returns A short random string of up to 9 characters
 *
 * @remarks
 * Unlike {@link generateUID}, this function does not include a timestamp component,
 * making it shorter but without temporal ordering guarantees. Use this for cases
 * where a compact identifier is preferred over strict uniqueness.
 *
 * @example
 * ```typescript
 * const shortId = generateShortUID();
 * // Returns something like: "abc456def"
 * ```
 *
 * @public
 */
export function generateShortUID(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Validates whether a string conforms to the ForgeFrame UID format.
 *
 * @param uid - The string to validate
 * @returns `true` if the string matches the UID format, `false` otherwise
 *
 * @remarks
 * A valid ForgeFrame UID consists of two lowercase alphanumeric segments
 * separated by an underscore (e.g., `lxyz123_abc456def`).
 *
 * @example
 * ```typescript
 * isValidUID('abc123_def456'); // true
 * isValidUID('invalid');       // false
 * isValidUID('ABC_123');       // false (uppercase not allowed)
 * ```
 *
 * @public
 */
export function isValidUID(uid: string): boolean {
  return /^[a-z0-9]+_[a-z0-9]+$/.test(uid);
}
