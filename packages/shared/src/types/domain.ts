/**
 * Domain - Category or context for trust and endorsements
 * Spec Section 4.3
 */

export type DomainId = string;

export interface Domain {
  id: DomainId; // e.g., "restaurants", "plumbing.residential"
  parent?: DomainId; // For hierarchical domains
  name: string;
  description: string;
}

export interface CreateDomainInput {
  id: DomainId;
  parent?: DomainId;
  name: string;
  description: string;
}
