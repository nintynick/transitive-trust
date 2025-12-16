/**
 * ID generation utilities
 */

/**
 * Generate a random ID with a prefix
 * Format: prefix_timestamp_random
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate IDs for specific entity types
 */
export const ids = {
  principal: () => generateId('usr'),
  subject: () => generateId('sub'),
  domain: () => generateId('dom'),
  trustEdge: () => generateId('te'),
  distrustEdge: () => generateId('de'),
  endorsement: () => generateId('end'),
} as const;

/**
 * Validate ID format
 */
export function isValidId(id: string, prefix?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (prefix && !id.startsWith(`${prefix}_`)) return false;
  return id.length >= 10;
}
