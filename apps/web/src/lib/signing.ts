import { canonicalize } from '@ttp/shared';
import type { Signature } from '@ttp/shared';

/**
 * Create a signable message from data object
 * Uses JSON canonicalization for deterministic serialization
 */
export function createSignableMessage<T extends Record<string, unknown>>(data: T): string {
  return canonicalize(data);
}

/**
 * Create a Signature object from wallet signature
 */
export function createSignature(
  walletSignature: string,
  address: string
): Signature {
  return {
    algorithm: 'secp256k1',
    publicKey: address,
    signature: walletSignature,
    signedAt: new Date().toISOString(),
  };
}

/**
 * Prepare data for signing and create the final signature object
 * This is used after getting the signature from the wallet
 */
export function prepareSignedData<T extends Record<string, unknown>>(
  data: T,
  walletSignature: string,
  address: string
): T & { signature: Signature } {
  return {
    ...data,
    signature: createSignature(walletSignature, address),
  };
}
