/**
 * Signature - Cryptographic signature for data integrity
 * Spec Section 12.2
 */

export type SignatureAlgorithm = 'ed25519' | 'secp256k1';

export interface Signature {
  algorithm: SignatureAlgorithm;
  publicKey: string; // Base64 encoded
  signature: string; // Base64 encoded
  signedAt: string; // ISO timestamp
}

export interface UnsignedData<T> {
  data: T;
}

export interface SignedData<T> {
  data: T;
  signature: Signature;
}
