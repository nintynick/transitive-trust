/**
 * Endorsement - Principal's evaluation of a subject
 * Spec Section 4.6
 */

import type { PrincipalId } from './principal.js';
import type { SubjectId } from './subject.js';
import type { DomainId } from './domain.js';
import type { Signature } from './signature.js';

export type EndorsementId = string;

export interface Rating {
  score: number; // 0.0 to 1.0 normalized
  originalScore: string; // Original scale (e.g., "4 out of 5 stars")
  originalScale: string; // Description of original scale
}

export interface EndorsementContent {
  summary: string; // Brief endorsement (< 280 chars)
  body?: string; // Extended review
  media?: MediaReference[]; // Photos, videos, etc.
  tags?: string[]; // Freeform tags
}

export interface MediaReference {
  type: 'image' | 'video' | 'document';
  url: string;
  caption?: string;
}

export interface EndorsementContext {
  transactionDate?: Date; // When the service was rendered
  transactionId?: string; // Reference to external transaction
  relationship?: 'one-time' | 'recurring' | 'long-term';
  verified: boolean; // Whether transaction was verified
}

export interface Endorsement {
  id: EndorsementId;
  author: PrincipalId;
  subject: SubjectId;
  domain: DomainId;
  rating: Rating;
  content?: EndorsementContent;
  createdAt: Date;
  updatedAt: Date;
  context?: EndorsementContext;
  signature: Signature;
}

export interface CreateEndorsementInput {
  subject: SubjectId;
  domain: DomainId;
  rating: {
    score: number;
    originalScore: string;
    originalScale: string;
  };
  content?: {
    summary: string;
    body?: string;
    tags?: string[];
  };
  context?: {
    transactionDate?: Date;
    transactionId?: string;
    relationship?: 'one-time' | 'recurring' | 'long-term';
    verified?: boolean;
  };
}

export interface UpdateEndorsementInput {
  rating?: {
    score: number;
    originalScore: string;
    originalScale: string;
  };
  content?: {
    summary: string;
    body?: string;
    tags?: string[];
  };
}

/**
 * Verification Proof - Links endorsement to verified transaction
 * Spec Section 7.2
 */
export interface VerificationProof {
  endorsementId: EndorsementId;
  transactionHash: string; // Hash of transaction record
  verifier: PrincipalId; // Third party that verified
  verifiedAt: Date;
  verificationMethod: 'payment_processor' | 'booking_system' | 'manual';
  signature: Signature; // Verifier's signature
}
