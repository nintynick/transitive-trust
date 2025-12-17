/**
 * Endorsement CRUD operations
 */

import { writeQuery, readQuery, toDate, toNumber } from '../client.js';
import type {
  Endorsement,
  EndorsementId,
  PrincipalId,
  SubjectId,
  DomainId,
  CreateEndorsementInput,
  UpdateEndorsementInput,
  Signature,
} from '@ttp/shared';
import { ids } from '@ttp/shared';

export interface EndorsementRecord {
  id: string;
  author: string;
  subject: string;
  domain: string;
  ratingScore: number;
  ratingOriginalScore: string;
  ratingOriginalScale: string;
  summary?: string;
  body?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  transactionDate?: string;
  transactionId?: string;
  relationship?: string;
  verified: boolean;
  signature: string;
}

function recordToEndorsement(record: EndorsementRecord): Endorsement {
  return {
    id: record.id,
    author: record.author,
    subject: record.subject,
    domain: record.domain,
    rating: {
      score: record.ratingScore,
      originalScore: record.ratingOriginalScore,
      originalScale: record.ratingOriginalScale,
    },
    content: record.summary
      ? {
          summary: record.summary,
          body: record.body,
          tags: record.tags,
        }
      : undefined,
    createdAt: toDate(record.createdAt) ?? new Date(),
    updatedAt: toDate(record.updatedAt) ?? new Date(),
    context: {
      transactionDate: record.transactionDate
        ? toDate(record.transactionDate) ?? undefined
        : undefined,
      transactionId: record.transactionId,
      relationship: record.relationship as 'one-time' | 'recurring' | 'long-term' | undefined,
      verified: record.verified,
    },
    signature: JSON.parse(record.signature),
  };
}

export async function createEndorsement(
  authorId: PrincipalId,
  input: CreateEndorsementInput,
  signature: Signature
): Promise<Endorsement> {
  const endorsementId = ids.endorsement();
  const now = new Date().toISOString();

  const result = await writeQuery<{ e: EndorsementRecord }>(
    `
    MATCH (author:Principal {id: $authorId})
    MATCH (subject:Subject {id: $subjectId})
    MERGE (domain:Domain {id: $domainId})
    CREATE (e:Endorsement {
      id: $endorsementId,
      ratingScore: $ratingScore,
      ratingOriginalScore: $ratingOriginalScore,
      ratingOriginalScale: $ratingOriginalScale,
      summary: $summary,
      body: $body,
      tags: $tags,
      createdAt: datetime($createdAt),
      updatedAt: datetime($updatedAt),
      transactionDate: $transactionDate,
      transactionId: $transactionId,
      relationship: $relationship,
      verified: $verified,
      signature: $signature
    })
    CREATE (author)-[:AUTHORED]->(e)
    CREATE (e)-[:ENDORSES]->(subject)
    CREATE (e)-[:FOR_DOMAIN]->(domain)
    RETURN {
      id: e.id,
      author: author.id,
      subject: subject.id,
      domain: $domainId,
      ratingScore: e.ratingScore,
      ratingOriginalScore: e.ratingOriginalScore,
      ratingOriginalScale: e.ratingOriginalScale,
      summary: e.summary,
      body: e.body,
      tags: e.tags,
      createdAt: toString(e.createdAt),
      updatedAt: toString(e.updatedAt),
      transactionDate: e.transactionDate,
      transactionId: e.transactionId,
      relationship: e.relationship,
      verified: e.verified,
      signature: e.signature
    } AS e
    `,
    {
      authorId,
      subjectId: input.subject,
      domainId: input.domain,
      endorsementId,
      ratingScore: input.rating.score,
      ratingOriginalScore: input.rating.originalScore,
      ratingOriginalScale: input.rating.originalScale,
      summary: input.content?.summary ?? null,
      body: input.content?.body ?? null,
      tags: input.content?.tags ?? null,
      createdAt: now,
      updatedAt: now,
      transactionDate: input.context?.transactionDate?.toISOString() ?? null,
      transactionId: input.context?.transactionId ?? null,
      relationship: input.context?.relationship ?? null,
      verified: input.context?.verified ?? false,
      signature: JSON.stringify(signature),
    }
  );

  if (result.length === 0) {
    throw new Error('Failed to create endorsement');
  }

  return recordToEndorsement(result[0].e);
}

export async function getEndorsementById(
  id: EndorsementId
): Promise<Endorsement | null> {
  const result = await readQuery<{ e: EndorsementRecord }>(
    `
    MATCH (author:Principal)-[:AUTHORED]->(e:Endorsement {id: $id})
    MATCH (e)-[:ENDORSES]->(subject:Subject)
    MATCH (e)-[:FOR_DOMAIN]->(domain:Domain)
    RETURN {
      id: e.id,
      author: author.id,
      subject: subject.id,
      domain: domain.id,
      ratingScore: e.ratingScore,
      ratingOriginalScore: e.ratingOriginalScore,
      ratingOriginalScale: e.ratingOriginalScale,
      summary: e.summary,
      body: e.body,
      tags: e.tags,
      createdAt: toString(e.createdAt),
      updatedAt: toString(e.updatedAt),
      transactionDate: e.transactionDate,
      transactionId: e.transactionId,
      relationship: e.relationship,
      verified: e.verified,
      signature: e.signature
    } AS e
    `,
    { id }
  );

  if (result.length === 0) {
    return null;
  }

  return recordToEndorsement(result[0].e);
}

export async function getEndorsementsForSubject(
  subjectId: SubjectId,
  domain?: DomainId,
  options: { limit?: number; offset?: number } = {}
): Promise<Endorsement[]> {
  const { limit = 20, offset = 0 } = options;

  const result = await readQuery<{ e: EndorsementRecord }>(
    `
    MATCH (author:Principal)-[:AUTHORED]->(e:Endorsement)-[:ENDORSES]->(subject:Subject {id: $subjectId})
    MATCH (e)-[:FOR_DOMAIN]->(domain:Domain)
    ${domain ? "WHERE domain.id = $domain OR domain.id = '*'" : ''}
    RETURN {
      id: e.id,
      author: author.id,
      subject: subject.id,
      domain: domain.id,
      ratingScore: e.ratingScore,
      ratingOriginalScore: e.ratingOriginalScore,
      ratingOriginalScale: e.ratingOriginalScale,
      summary: e.summary,
      body: e.body,
      tags: e.tags,
      createdAt: toString(e.createdAt),
      updatedAt: toString(e.updatedAt),
      transactionDate: e.transactionDate,
      transactionId: e.transactionId,
      relationship: e.relationship,
      verified: e.verified,
      signature: e.signature
    } AS e
    ORDER BY e.createdAt DESC
    SKIP toInteger($offset)
    LIMIT toInteger($limit)
    `,
    { subjectId, domain, limit: Math.floor(limit), offset: Math.floor(offset) }
  );

  return result.map((r) => recordToEndorsement(r.e));
}

export interface EndorsementWithSubject extends Endorsement {
  subjectName?: string;
  subjectType?: string;
}

export async function getEndorsementsByAuthor(
  authorId: PrincipalId,
  options: { domain?: DomainId; limit?: number; offset?: number } = {}
): Promise<EndorsementWithSubject[]> {
  const { domain, limit = 20, offset = 0 } = options;

  const result = await readQuery<{ e: EndorsementRecord; subjectName: string | null; subjectType: string | null }>(
    `
    MATCH (author:Principal {id: $authorId})-[:AUTHORED]->(e:Endorsement)
    MATCH (e)-[:ENDORSES]->(subject:Subject)
    MATCH (e)-[:FOR_DOMAIN]->(domain:Domain)
    ${domain ? "WHERE domain.id = $domain OR domain.id = '*'" : ''}
    RETURN {
      id: e.id,
      author: author.id,
      subject: subject.id,
      domain: domain.id,
      ratingScore: e.ratingScore,
      ratingOriginalScore: e.ratingOriginalScore,
      ratingOriginalScale: e.ratingOriginalScale,
      summary: e.summary,
      body: e.body,
      tags: e.tags,
      createdAt: toString(e.createdAt),
      updatedAt: toString(e.updatedAt),
      transactionDate: e.transactionDate,
      transactionId: e.transactionId,
      relationship: e.relationship,
      verified: e.verified,
      signature: e.signature
    } AS e,
    subject.name AS subjectName,
    subject.type AS subjectType
    ORDER BY e.createdAt DESC
    SKIP toInteger($offset)
    LIMIT toInteger($limit)
    `,
    { authorId, domain, limit: Math.floor(limit), offset: Math.floor(offset) }
  );

  return result.map((r) => ({
    ...recordToEndorsement(r.e),
    subjectName: r.subjectName ?? undefined,
    subjectType: r.subjectType ?? undefined,
  }));
}

export async function updateEndorsement(
  endorsementId: EndorsementId,
  authorId: PrincipalId,
  input: UpdateEndorsementInput,
  signature: Signature
): Promise<Endorsement | null> {
  const now = new Date().toISOString();
  const setClauses: string[] = ['e.updatedAt = datetime($updatedAt)', 'e.signature = $signature'];
  const params: Record<string, unknown> = {
    endorsementId,
    authorId,
    updatedAt: now,
    signature: JSON.stringify(signature),
  };

  if (input.rating) {
    setClauses.push('e.ratingScore = $ratingScore');
    setClauses.push('e.ratingOriginalScore = $ratingOriginalScore');
    setClauses.push('e.ratingOriginalScale = $ratingOriginalScale');
    params.ratingScore = input.rating.score;
    params.ratingOriginalScore = input.rating.originalScore;
    params.ratingOriginalScale = input.rating.originalScale;
  }

  if (input.content) {
    setClauses.push('e.summary = $summary');
    setClauses.push('e.body = $body');
    setClauses.push('e.tags = $tags');
    params.summary = input.content.summary;
    params.body = input.content.body ?? null;
    params.tags = input.content.tags ?? null;
  }

  const result = await writeQuery<{ e: EndorsementRecord }>(
    `
    MATCH (author:Principal {id: $authorId})-[:AUTHORED]->(e:Endorsement {id: $endorsementId})
    MATCH (e)-[:ENDORSES]->(subject:Subject)
    MATCH (e)-[:FOR_DOMAIN]->(domain:Domain)
    SET ${setClauses.join(', ')}
    RETURN {
      id: e.id,
      author: author.id,
      subject: subject.id,
      domain: domain.id,
      ratingScore: e.ratingScore,
      ratingOriginalScore: e.ratingOriginalScore,
      ratingOriginalScale: e.ratingOriginalScale,
      summary: e.summary,
      body: e.body,
      tags: e.tags,
      createdAt: toString(e.createdAt),
      updatedAt: toString(e.updatedAt),
      transactionDate: e.transactionDate,
      transactionId: e.transactionId,
      relationship: e.relationship,
      verified: e.verified,
      signature: e.signature
    } AS e
    `,
    params
  );

  if (result.length === 0) {
    return null;
  }

  return recordToEndorsement(result[0].e);
}

export async function deleteEndorsement(
  endorsementId: EndorsementId,
  authorId: PrincipalId
): Promise<boolean> {
  const result = await writeQuery<{ deleted: number }>(
    `
    MATCH (author:Principal {id: $authorId})-[:AUTHORED]->(e:Endorsement {id: $endorsementId})
    DETACH DELETE e
    RETURN count(e) AS deleted
    `,
    { authorId, endorsementId }
  );

  return result.length > 0 && result[0].deleted > 0;
}

export interface NetworkEndorsement {
  endorsement: EndorsementWithSubject;
  authorTrust: number;
  hopDistance: number;
  authorDisplayName?: string;
}

/**
 * Get endorsements from the viewer's trust network
 */
export async function getEndorsementsFromNetwork(
  viewerId: PrincipalId,
  options: {
    domain?: DomainId;
    subjectId?: SubjectId;
    maxHops?: number;
    minTrust?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'trust' | 'date' | 'rating';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<NetworkEndorsement[]> {
  const {
    domain,
    subjectId,
    maxHops = 4,
    minTrust = 0.01,
    limit = 20,
    offset = 0,
    sortBy = 'trust',
    sortOrder = 'desc',
  } = options;

  // Build ORDER BY clause based on sort options
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  let orderByClause: string;
  switch (sortBy) {
    case 'date':
      orderByClause = `e.createdAt ${orderDir}`;
      break;
    case 'rating':
      orderByClause = `e.ratingScore ${orderDir}, authorTrust DESC`;
      break;
    case 'trust':
    default:
      orderByClause = `authorTrust ${orderDir}, e.createdAt DESC`;
  }

  const result = await readQuery<{
    e: EndorsementRecord;
    authorTrust: number;
    hopDistance: number;
    subjectName: string | null;
    subjectType: string | null;
    authorDisplayName: string | null;
  }>(
    `
    MATCH path = (viewer:Principal {id: $viewerId})-[:TRUSTS*1..${maxHops}]->(author:Principal)
    WHERE ALL(r IN relationships(path) WHERE
      (r.expiresAt IS NULL OR r.expiresAt > datetime())
    )
    WITH author, path,
         reduce(trust = 1.0, r IN relationships(path) | trust * r.weight) AS pathTrust,
         length(path) AS hops
    WHERE pathTrust >= $minTrust
    WITH author, max(pathTrust) AS authorTrust, min(hops) AS hopDistance

    MATCH (author)-[:AUTHORED]->(e:Endorsement)
    MATCH (e)-[:ENDORSES]->(subject:Subject)
    MATCH (e)-[:FOR_DOMAIN]->(domain:Domain)
    ${domain ? "WHERE domain.id = $domain OR domain.id = '*'" : ''}
    ${subjectId ? (domain ? 'AND' : 'WHERE') + ' subject.id = $subjectId' : ''}

    RETURN {
      id: e.id,
      author: author.id,
      subject: subject.id,
      domain: domain.id,
      ratingScore: e.ratingScore,
      ratingOriginalScore: e.ratingOriginalScore,
      ratingOriginalScale: e.ratingOriginalScale,
      summary: e.summary,
      body: e.body,
      tags: e.tags,
      createdAt: toString(e.createdAt),
      updatedAt: toString(e.updatedAt),
      transactionDate: e.transactionDate,
      transactionId: e.transactionId,
      relationship: e.relationship,
      verified: e.verified,
      signature: e.signature
    } AS e,
    authorTrust,
    hopDistance,
    subject.name AS subjectName,
    subject.type AS subjectType,
    author.metadata AS authorDisplayName
    ORDER BY ${orderByClause}
    SKIP toInteger($offset)
    LIMIT toInteger($limit)
    `,
    { viewerId, domain, subjectId, minTrust, limit: Math.floor(limit), offset: Math.floor(offset) }
  );

  return result.map((r) => {
    // Parse author display name from metadata
    let displayName: string | undefined;
    try {
      if (r.authorDisplayName) {
        const metadata = JSON.parse(r.authorDisplayName);
        displayName = metadata.displayName || metadata.name;
      }
    } catch {
      // Ignore parse errors
    }

    return {
      endorsement: {
        ...recordToEndorsement(r.e),
        subjectName: r.subjectName ?? undefined,
        subjectType: r.subjectType ?? undefined,
      },
      authorTrust: toNumber(r.authorTrust),
      hopDistance: toNumber(r.hopDistance),
      authorDisplayName: displayName,
    };
  });
}
