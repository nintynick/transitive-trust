/**
 * Mock database exports
 */

export * from './queries.js';
export * from './data.js';

// Mock client functions (no-ops for mock mode)
export function initDriver(_config: unknown): void {
  console.log('[Mock DB] Using mock data - no database connection needed');
}

export function getDriver(): null {
  return null;
}

export function closeDriver(): void {}

export function getSession(): null {
  return null;
}

export async function readQuery<T>(): Promise<T[]> {
  return [];
}

export async function writeQuery<T>(): Promise<T[]> {
  return [];
}

export async function withTransaction<T>(
  _mode: 'read' | 'write',
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export async function verifyConnectivity(): Promise<boolean> {
  return true;
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return null;
}
