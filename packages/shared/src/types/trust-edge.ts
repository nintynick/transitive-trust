/**
 * Trust Edge - Directed, weighted relationship between principals
 * Spec Sections 4.4 and 4.5
 */

import type { PrincipalId } from './principal.js';
import type { DomainId } from './domain.js';
import type { Signature } from './signature.js';

export type EdgeId = string;

/**
 * TrustWeight: Float in range [0.0, 1.0]
 *   0.0 = No trust (explicit distrust is handled separately)
 *   0.5 = Neutral/unknown
 *   1.0 = Complete trust
 */
export type TrustWeight = number;

export interface Evidence {
  type: 'personal_knowledge' | 'professional' | 'verified' | 'other';
  note?: string;
}

export interface TrustEdge {
  id: EdgeId;
  from: PrincipalId; // The trustor
  to: PrincipalId; // The trustee
  weight: TrustWeight; // 0.0 to 1.0
  domain: DomainId; // Scope of trust ("*" for global)
  createdAt: Date;
  expiresAt?: Date; // Optional expiration
  evidence?: Evidence; // Optional justification
  signature: Signature; // Signed by `from` principal
  isPending?: boolean; // True if target hasn't registered yet
}

export interface CreateTrustEdgeInput {
  to: PrincipalId;
  weight: TrustWeight;
  domain: DomainId;
  expiresAt?: Date;
  evidence?: Evidence;
}

/**
 * Distrust Edge - Explicit distrust (separate from trust weight = 0)
 * Spec Section 4.5
 */

export type DistrustReason =
  | 'spam'
  | 'malicious'
  | 'incompetent'
  | 'conflict_of_interest'
  | 'other';

export interface DistrustEdge {
  id: EdgeId;
  from: PrincipalId;
  to: PrincipalId;
  domain: DomainId;
  createdAt: Date;
  reason: DistrustReason;
  signature: Signature;
}

export interface CreateDistrustEdgeInput {
  to: PrincipalId;
  domain: DomainId;
  reason: DistrustReason;
}
