/**
 * Principal CRUD operations
 */

import { writeQuery, readQuery, toDate } from '../client.js';
import type {
  Principal,
  PrincipalId,
  CreatePrincipalInput,
} from '@ttp/shared';
import { ids } from '@ttp/shared';

export interface PrincipalRecord {
  id: string;
  type: string;
  publicKey: string;
  createdAt: string;
  metadata: string;
}

function recordToPrincipal(record: PrincipalRecord): Principal {
  return {
    id: record.id,
    type: record.type as Principal['type'],
    publicKey: record.publicKey,
    createdAt: toDate(record.createdAt) ?? new Date(),
    metadata: JSON.parse(record.metadata || '{}'),
  };
}

export async function createPrincipal(
  input: CreatePrincipalInput
): Promise<Principal> {
  const id = ids.principal();
  const now = new Date().toISOString();

  const result = await writeQuery<{ p: PrincipalRecord }>(
    `
    CREATE (p:Principal {
      id: $id,
      type: $type,
      publicKey: $publicKey,
      createdAt: datetime($createdAt),
      metadata: $metadata
    })
    RETURN p {
      .id, .type, .publicKey,
      createdAt: toString(p.createdAt),
      metadata: p.metadata
    } AS p
    `,
    {
      id,
      type: input.type,
      publicKey: input.publicKey,
      createdAt: now,
      metadata: JSON.stringify(input.metadata ?? {}),
    }
  );

  if (result.length === 0) {
    throw new Error('Failed to create principal');
  }

  return recordToPrincipal(result[0].p);
}

export async function getPrincipalById(
  id: PrincipalId
): Promise<Principal | null> {
  const result = await readQuery<{ p: PrincipalRecord }>(
    `
    MATCH (p:Principal {id: $id})
    RETURN p {
      .id, .type, .publicKey,
      createdAt: toString(p.createdAt),
      metadata: p.metadata
    } AS p
    `,
    { id }
  );

  if (result.length === 0) {
    return null;
  }

  return recordToPrincipal(result[0].p);
}

export async function getPrincipalByPublicKey(
  publicKey: string
): Promise<Principal | null> {
  const result = await readQuery<{ p: PrincipalRecord }>(
    `
    MATCH (p:Principal {publicKey: $publicKey})
    RETURN p {
      .id, .type, .publicKey,
      createdAt: toString(p.createdAt),
      metadata: p.metadata
    } AS p
    `,
    { publicKey }
  );

  if (result.length === 0) {
    return null;
  }

  return recordToPrincipal(result[0].p);
}

export async function updatePrincipalMetadata(
  id: PrincipalId,
  metadata: Record<string, string>
): Promise<Principal | null> {
  const result = await writeQuery<{ p: PrincipalRecord }>(
    `
    MATCH (p:Principal {id: $id})
    SET p.metadata = $metadata
    RETURN p {
      .id, .type, .publicKey,
      createdAt: toString(p.createdAt),
      metadata: p.metadata
    } AS p
    `,
    { id, metadata: JSON.stringify(metadata) }
  );

  if (result.length === 0) {
    return null;
  }

  return recordToPrincipal(result[0].p);
}

export async function deletePrincipal(id: PrincipalId): Promise<boolean> {
  const result = await writeQuery<{ deleted: number }>(
    `
    MATCH (p:Principal {id: $id})
    DETACH DELETE p
    RETURN count(p) AS deleted
    `,
    { id }
  );

  return result.length > 0 && result[0].deleted > 0;
}

export async function listPrincipals(
  limit: number = 20,
  offset: number = 0
): Promise<Principal[]> {
  const result = await readQuery<{ p: PrincipalRecord }>(
    `
    MATCH (p:Principal)
    RETURN p {
      .id, .type, .publicKey,
      createdAt: toString(p.createdAt),
      metadata: p.metadata
    } AS p
    ORDER BY p.createdAt DESC
    SKIP $offset
    LIMIT $limit
    `,
    { limit, offset }
  );

  return result.map((r) => recordToPrincipal(r.p));
}
