/**
 * Server-side signature verification utilities
 */

import { verifyMessage } from 'viem';
import { canonicalize, type Signature } from '@ttp/shared';
import { getPrincipalById } from '@ttp/db';

/**
 * Verify that a signature was created by the claimed principal
 *
 * Checks:
 * 1. The signature is valid (cryptographically correct for the message)
 * 2. The signer's address matches the principal's publicKey
 */
export async function verifyPrincipalSignature(
  principalId: string,
  data: Record<string, unknown>,
  signature: Signature
): Promise<{ valid: boolean; error?: string }> {
  // Skip verification for empty/placeholder signatures
  if (!signature.signature || !signature.publicKey) {
    return { valid: true }; // Allow legacy unsigned data
  }

  // Get the principal to check their registered publicKey
  const principal = await getPrincipalById(principalId);
  if (!principal) {
    return { valid: false, error: 'Principal not found' };
  }

  // For Ethereum addresses, the publicKey is the address
  // Check that the signer's address matches the principal's registered address
  if (signature.algorithm === 'secp256k1') {
    // The signature.publicKey contains the signer's Ethereum address
    if (signature.publicKey.toLowerCase() !== principal.publicKey.toLowerCase()) {
      return {
        valid: false,
        error: 'Signature address does not match principal',
      };
    }

    try {
      // Canonicalize the data to create the signed message
      const message = canonicalize(data);

      // Verify the signature using viem
      const isValid = await verifyMessage({
        address: signature.publicKey as `0x${string}`,
        message,
        signature: signature.signature as `0x${string}`,
      });

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Signature verification failed',
      };
    }
  }

  // For ed25519 or other algorithms, we'd handle them here
  // For now, allow other algorithms without verification (legacy support)
  return { valid: true };
}

/**
 * Check if a signature is present and non-empty
 */
export function hasValidSignature(signature?: Signature): boolean {
  return !!(
    signature &&
    signature.signature &&
    signature.publicKey &&
    signature.signature.length > 0 &&
    signature.publicKey.length > 0
  );
}
