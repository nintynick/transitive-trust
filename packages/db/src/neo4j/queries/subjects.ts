/**
 * Subject CRUD operations
 */

import { writeQuery, readQuery, toDate } from '../client.js';
import type {
  Subject,
  SubjectId,
  CreateSubjectInput,
  GeoLocation,
} from '@ttp/shared';
import { ids } from '@ttp/shared';

export interface SubjectRecord {
  id: string;
  type: string;
  canonicalName: string;
  domains: string[];
  locationLat?: number;
  locationLon?: number;
  externalIds: string;
  createdAt: string;
  metadata: string;
}

function recordToSubject(record: SubjectRecord): Subject {
  const location: GeoLocation | undefined =
    record.locationLat !== undefined && record.locationLon !== undefined
      ? { latitude: record.locationLat, longitude: record.locationLon }
      : undefined;

  return {
    id: record.id,
    type: record.type as Subject['type'],
    canonicalName: record.canonicalName,
    domains: new Set(record.domains || []),
    location,
    externalIds: JSON.parse(record.externalIds || '{}'),
    createdAt: toDate(record.createdAt) ?? new Date(),
    metadata: JSON.parse(record.metadata || '{}'),
  };
}

export async function createSubject(
  input: CreateSubjectInput
): Promise<Subject> {
  const id = ids.subject();
  const now = new Date().toISOString();

  // Build search text for full-text indexing
  const searchText = [
    input.canonicalName,
    ...Object.values(input.metadata ?? {}),
  ].join(' ');

  const result = await writeQuery<{ s: SubjectRecord }>(
    `
    CREATE (s:Subject {
      id: $id,
      type: $type,
      canonicalName: $canonicalName,
      domains: $domains,
      ${input.location ? 'location: point({latitude: $lat, longitude: $lon}),' : ''}
      externalIds: $externalIds,
      createdAt: datetime($createdAt),
      metadata: $metadata,
      searchText: $searchText
    })
    RETURN s {
      .id, .type, .canonicalName, .domains,
      locationLat: CASE WHEN s.location IS NOT NULL THEN s.location.latitude ELSE null END,
      locationLon: CASE WHEN s.location IS NOT NULL THEN s.location.longitude ELSE null END,
      externalIds: s.externalIds,
      createdAt: toString(s.createdAt),
      metadata: s.metadata
    } AS s
    `,
    {
      id,
      type: input.type,
      canonicalName: input.canonicalName,
      domains: input.domains,
      lat: input.location?.latitude,
      lon: input.location?.longitude,
      externalIds: JSON.stringify(input.externalIds ?? {}),
      createdAt: now,
      metadata: JSON.stringify(input.metadata ?? {}),
      searchText,
    }
  );

  if (result.length === 0) {
    throw new Error('Failed to create subject');
  }

  // Create domain relationships
  for (const domain of input.domains) {
    await writeQuery(
      `
      MATCH (s:Subject {id: $subjectId})
      MERGE (d:Domain {id: $domainId})
      MERGE (s)-[:IN_DOMAIN]->(d)
      `,
      { subjectId: id, domainId: domain }
    );
  }

  return recordToSubject(result[0].s);
}

export async function getSubjectById(id: SubjectId): Promise<Subject | null> {
  const result = await readQuery<{ s: SubjectRecord }>(
    `
    MATCH (s:Subject {id: $id})
    RETURN s {
      .id, .type, .canonicalName, .domains,
      locationLat: CASE WHEN s.location IS NOT NULL THEN s.location.latitude ELSE null END,
      locationLon: CASE WHEN s.location IS NOT NULL THEN s.location.longitude ELSE null END,
      externalIds: s.externalIds,
      createdAt: toString(s.createdAt),
      metadata: s.metadata
    } AS s
    `,
    { id }
  );

  if (result.length === 0) {
    return null;
  }

  return recordToSubject(result[0].s);
}

export async function updateSubject(
  id: SubjectId,
  updates: Partial<{
    canonicalName: string;
    domains: string[];
    location: GeoLocation | null;
    externalIds: Record<string, string>;
    metadata: Record<string, string>;
  }>
): Promise<Subject | null> {
  const setClauses: string[] = [];
  const params: Record<string, unknown> = { id };

  if (updates.canonicalName !== undefined) {
    setClauses.push('s.canonicalName = $canonicalName');
    params.canonicalName = updates.canonicalName;
  }

  if (updates.domains !== undefined) {
    setClauses.push('s.domains = $domains');
    params.domains = updates.domains;
  }

  if (updates.location !== undefined) {
    if (updates.location === null) {
      setClauses.push('s.location = null');
    } else {
      setClauses.push(
        's.location = point({latitude: $lat, longitude: $lon})'
      );
      params.lat = updates.location.latitude;
      params.lon = updates.location.longitude;
    }
  }

  if (updates.externalIds !== undefined) {
    setClauses.push('s.externalIds = $externalIds');
    params.externalIds = JSON.stringify(updates.externalIds);
  }

  if (updates.metadata !== undefined) {
    setClauses.push('s.metadata = $metadata');
    params.metadata = JSON.stringify(updates.metadata);
  }

  if (setClauses.length === 0) {
    return getSubjectById(id);
  }

  const result = await writeQuery<{ s: SubjectRecord }>(
    `
    MATCH (s:Subject {id: $id})
    SET ${setClauses.join(', ')}
    RETURN s {
      .id, .type, .canonicalName, .domains,
      locationLat: CASE WHEN s.location IS NOT NULL THEN s.location.latitude ELSE null END,
      locationLon: CASE WHEN s.location IS NOT NULL THEN s.location.longitude ELSE null END,
      externalIds: s.externalIds,
      createdAt: toString(s.createdAt),
      metadata: s.metadata
    } AS s
    `,
    params
  );

  if (result.length === 0) {
    return null;
  }

  return recordToSubject(result[0].s);
}

export async function deleteSubject(id: SubjectId): Promise<boolean> {
  const result = await writeQuery<{ deleted: number }>(
    `
    MATCH (s:Subject {id: $id})
    DETACH DELETE s
    RETURN count(s) AS deleted
    `,
    { id }
  );

  return result.length > 0 && result[0].deleted > 0;
}

export async function searchSubjects(
  query: string,
  options: {
    domain?: string;
    location?: { latitude: number; longitude: number; radiusKm: number };
    limit?: number;
    offset?: number;
  } = {}
): Promise<Subject[]> {
  const { domain, location, limit = 20, offset = 0 } = options;

  const params: Record<string, unknown> = {
    limit: Math.floor(limit),
    offset: Math.floor(offset)
  };

  // Build filters
  const filters: string[] = [];

  if (query) {
    // Use case-insensitive CONTAINS search (more reliable than full-text index)
    filters.push('toLower(s.canonicalName) CONTAINS toLower($query)');
    params.query = query;
  }

  if (domain && domain !== '*') {
    filters.push("($domain IN s.domains OR '*' IN s.domains)");
    params.domain = domain;
  }

  if (location) {
    filters.push(
      's.location IS NOT NULL AND point.distance(s.location, point({latitude: $lat, longitude: $lon})) <= $radiusMeters'
    );
    params.lat = location.latitude;
    params.lon = location.longitude;
    params.radiusMeters = location.radiusKm * 1000;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const cypher = `
    MATCH (s:Subject)
    ${whereClause}
    RETURN s {
      .id, .type, .canonicalName, .domains,
      locationLat: CASE WHEN s.location IS NOT NULL THEN s.location.latitude ELSE null END,
      locationLon: CASE WHEN s.location IS NOT NULL THEN s.location.longitude ELSE null END,
      externalIds: s.externalIds,
      createdAt: toString(s.createdAt),
      metadata: s.metadata
    } AS s
    ORDER BY s.createdAt DESC
    SKIP toInteger($offset)
    LIMIT toInteger($limit)
  `;

  const result = await readQuery<{ s: SubjectRecord }>(cypher, params);
  return result.map((r) => recordToSubject(r.s));
}

export async function listSubjects(
  limit: number = 20,
  offset: number = 0
): Promise<Subject[]> {
  const result = await readQuery<{ s: SubjectRecord }>(
    `
    MATCH (s:Subject)
    RETURN s {
      .id, .type, .canonicalName, .domains,
      locationLat: CASE WHEN s.location IS NOT NULL THEN s.location.latitude ELSE null END,
      locationLon: CASE WHEN s.location IS NOT NULL THEN s.location.longitude ELSE null END,
      externalIds: s.externalIds,
      createdAt: toString(s.createdAt),
      metadata: s.metadata
    } AS s
    ORDER BY s.createdAt DESC
    SKIP toInteger($offset)
    LIMIT toInteger($limit)
    `,
    { limit: Math.floor(limit), offset: Math.floor(offset) }
  );

  return result.map((r) => recordToSubject(r.s));
}
