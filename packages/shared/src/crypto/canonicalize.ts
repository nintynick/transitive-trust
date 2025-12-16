/**
 * JSON Canonicalization for signing
 * Spec Section 12.2: Sort keys alphabetically, serialize as JSON with no whitespace
 */

export function canonicalize(obj: unknown): string {
  if (obj === null) {
    return 'null';
  }

  if (obj === undefined) {
    return 'undefined';
  }

  if (typeof obj === 'boolean' || typeof obj === 'number') {
    return JSON.stringify(obj);
  }

  if (typeof obj === 'string') {
    return JSON.stringify(obj);
  }

  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }

  if (Array.isArray(obj)) {
    const items = obj.map((item) => canonicalize(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof obj === 'object') {
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys
      .filter((key) => (obj as Record<string, unknown>)[key] !== undefined)
      .map((key) => {
        const value = (obj as Record<string, unknown>)[key];
        return `${JSON.stringify(key)}:${canonicalize(value)}`;
      });
    return '{' + pairs.join(',') + '}';
  }

  throw new Error(`Cannot canonicalize value of type ${typeof obj}`);
}

/**
 * Hash a canonicalized object using SHA-256
 */
export async function hashObject(obj: unknown): Promise<string> {
  const canonical = canonicalize(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
