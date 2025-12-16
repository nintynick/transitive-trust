/**
 * Principal - Any entity that can hold trust relationships
 * Spec Section 4.1
 */

export type PrincipalId = string;

export type PrincipalType = 'user' | 'organization' | 'agent';

export interface Principal {
  id: PrincipalId;
  type: PrincipalType;
  publicKey: string; // Base64 encoded public key for signature verification
  createdAt: Date;
  metadata: Record<string, string>; // Display name, avatar, etc.
}

export interface CreatePrincipalInput {
  type: PrincipalType;
  publicKey: string;
  metadata?: Record<string, string>;
}
