/**
 * Ed25519 Signature utilities
 * Spec Section 12.2
 */

import * as ed from '@noble/ed25519';
import { canonicalize } from './canonicalize.js';
import type { Signature } from '../types/signature.js';

// Enable synchronous methods (required for some environments)
// @noble/ed25519 v2 uses async by default
if (typeof globalThis.crypto === 'undefined') {
  // Node.js environment - crypto is available globally in Node 19+
  // For older versions, this would need polyfilling
}

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

/**
 * Generate a new Ed25519 keypair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKey };
}

/**
 * Get public key from private key
 */
export async function getPublicKey(privateKey: Uint8Array): Promise<Uint8Array> {
  return ed.getPublicKeyAsync(privateKey);
}

/**
 * Convert Uint8Array to base64 string
 */
export function toBase64(data: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }
  // Browser environment
  return btoa(String.fromCharCode(...data));
}

/**
 * Convert base64 string to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  // Browser environment
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sign an object with Ed25519
 * Removes any existing signature field before signing
 */
export async function signObject<T extends Record<string, unknown>>(
  obj: T,
  privateKey: Uint8Array
): Promise<T & { signature: Signature }> {
  // Remove any existing signature field
  const { signature: _existingSignature, ...dataToSign } = obj as T & {
    signature?: Signature;
  };

  // Canonicalize and encode
  const canonicalJson = canonicalize(dataToSign);
  const messageBytes = new TextEncoder().encode(canonicalJson);

  // Sign
  const sig = await ed.signAsync(messageBytes, privateKey);
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  const signature: Signature = {
    algorithm: 'ed25519',
    publicKey: toBase64(publicKey),
    signature: toBase64(sig),
    signedAt: new Date().toISOString(),
  };

  return {
    ...obj,
    signature,
  };
}

/**
 * Verify a signed object
 */
export async function verifySignature<T extends { signature: Signature }>(
  obj: T
): Promise<boolean> {
  const { signature, ...dataToVerify } = obj;

  if (signature.algorithm !== 'ed25519') {
    throw new Error(`Unsupported signature algorithm: ${signature.algorithm}`);
  }

  const canonicalJson = canonicalize(dataToVerify);
  const messageBytes = new TextEncoder().encode(canonicalJson);

  const publicKey = fromBase64(signature.publicKey);
  const sig = fromBase64(signature.signature);

  try {
    return await ed.verifyAsync(sig, messageBytes, publicKey);
  } catch {
    return false;
  }
}

/**
 * Sign a message directly (for request authentication)
 */
export async function signMessage(
  message: string,
  privateKey: Uint8Array
): Promise<string> {
  const messageBytes = new TextEncoder().encode(message);
  const sig = await ed.signAsync(messageBytes, privateKey);
  return toBase64(sig);
}

/**
 * Verify a message signature directly
 */
export async function verifyMessage(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  const messageBytes = new TextEncoder().encode(message);
  const sig = fromBase64(signature);
  const pubKey = fromBase64(publicKey);

  try {
    return await ed.verifyAsync(sig, messageBytes, pubKey);
  } catch {
    return false;
  }
}

/**
 * Create a signature for API request authentication
 * Signs: method + path + timestamp + bodyHash
 */
export async function signRequest(
  method: string,
  path: string,
  timestamp: string,
  bodyHash: string,
  privateKey: Uint8Array
): Promise<string> {
  const message = `${method}:${path}:${timestamp}:${bodyHash}`;
  return signMessage(message, privateKey);
}

/**
 * Verify an API request signature
 */
export async function verifyRequest(
  method: string,
  path: string,
  timestamp: string,
  bodyHash: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  const message = `${method}:${path}:${timestamp}:${bodyHash}`;
  return verifyMessage(message, signature, publicKey);
}
