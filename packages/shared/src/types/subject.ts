/**
 * Subject - Any entity that can receive endorsements
 * Spec Section 4.2
 */

import type { DomainId } from './domain.js';

export type SubjectId = string;

export type SubjectType = 'business' | 'individual' | 'product' | 'service';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Subject {
  id: SubjectId;
  type: SubjectType;
  canonicalName: string;
  domains: Set<DomainId>; // Applicable domains
  location?: GeoLocation; // Optional geographic anchor
  externalIds: Record<string, string>; // Links to external systems
  createdAt: Date;
  metadata: Record<string, string>;
}

export interface CreateSubjectInput {
  type: SubjectType;
  canonicalName: string;
  domains: DomainId[];
  location?: GeoLocation;
  externalIds?: Record<string, string>;
  metadata?: Record<string, string>;
}
