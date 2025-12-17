/**
 * ENS (Ethereum Name Service) utilities
 * Provides forward and reverse resolution with caching
 */

import { createPublicClient, http, isAddress, fallback } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

// Public client for ENS resolution with fallback RPCs for reliability
const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http('https://eth.llamarpc.com'),
    http('https://cloudflare-eth.com'),
    http('https://rpc.ankr.com/eth'),
    http('https://ethereum.publicnode.com'),
  ]),
});

// In-memory cache for ENS lookups
const ensNameCache = new Map<string, string | null>();
const ensAddressCache = new Map<string, string | null>();

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

function isCacheValid(key: string): boolean {
  const timestamp = cacheTimestamps.get(key);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Resolve an ENS name to an Ethereum address
 * @param name - ENS name (e.g., "vitalik.eth")
 * @returns The resolved address or null if not found
 */
export async function resolveEnsName(name: string): Promise<string | null> {
  // Normalize the name
  let normalizedName: string;
  try {
    normalizedName = normalize(name);
  } catch {
    return null;
  }

  // Check cache
  const cacheKey = `name:${normalizedName}`;
  if (ensAddressCache.has(normalizedName) && isCacheValid(cacheKey)) {
    return ensAddressCache.get(normalizedName) ?? null;
  }

  try {
    const address = await publicClient.getEnsAddress({
      name: normalizedName,
    });

    ensAddressCache.set(normalizedName, address);
    cacheTimestamps.set(cacheKey, Date.now());

    return address;
  } catch (error) {
    console.error('ENS resolution error:', error);
    ensAddressCache.set(normalizedName, null);
    cacheTimestamps.set(cacheKey, Date.now());
    return null;
  }
}

/**
 * Get the primary ENS name for an Ethereum address (reverse resolution)
 * @param address - Ethereum address
 * @returns The primary ENS name or null if not set
 */
export async function getEnsName(address: string): Promise<string | null> {
  if (!isAddress(address)) {
    return null;
  }

  const normalizedAddress = address.toLowerCase();

  // Check cache
  const cacheKey = `addr:${normalizedAddress}`;
  if (ensNameCache.has(normalizedAddress) && isCacheValid(cacheKey)) {
    return ensNameCache.get(normalizedAddress) ?? null;
  }

  try {
    const name = await publicClient.getEnsName({
      address: address as `0x${string}`,
    });

    ensNameCache.set(normalizedAddress, name);
    cacheTimestamps.set(cacheKey, Date.now());

    return name;
  } catch (error) {
    console.error('ENS reverse resolution error:', error);
    ensNameCache.set(normalizedAddress, null);
    cacheTimestamps.set(cacheKey, Date.now());
    return null;
  }
}

/**
 * Batch resolve multiple addresses to ENS names
 * @param addresses - Array of Ethereum addresses
 * @returns Map of address -> ENS name (or null)
 */
export async function batchGetEnsNames(
  addresses: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const uncached: string[] = [];

  // Check cache first
  for (const address of addresses) {
    const normalizedAddress = address.toLowerCase();
    const cacheKey = `addr:${normalizedAddress}`;

    if (ensNameCache.has(normalizedAddress) && isCacheValid(cacheKey)) {
      results.set(address, ensNameCache.get(normalizedAddress) ?? null);
    } else {
      uncached.push(address);
    }
  }

  // Resolve uncached addresses in parallel
  if (uncached.length > 0) {
    const promises = uncached.map(async (address) => {
      const name = await getEnsName(address);
      return { address, name };
    });

    const resolved = await Promise.all(promises);
    for (const { address, name } of resolved) {
      results.set(address, name);
    }
  }

  return results;
}

/**
 * Check if a string looks like an ENS name
 */
export function isEnsName(value: string): boolean {
  // ENS names end with .eth or other supported TLDs
  return /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.(eth|xyz|luxe|kred|art|club)$/i.test(value);
}

/**
 * Parse input that could be either an ENS name or an Ethereum address
 * @param input - Either an ENS name or address
 * @returns The resolved address or null
 */
export async function resolveAddressOrEns(input: string): Promise<string | null> {
  const trimmed = input.trim();

  // If it's already a valid address, return it
  if (isAddress(trimmed)) {
    return trimmed;
  }

  // If it looks like an ENS name, resolve it
  if (isEnsName(trimmed)) {
    return resolveEnsName(trimmed);
  }

  // Try resolving anyway in case it's a valid ENS name without common TLD
  if (trimmed.includes('.')) {
    return resolveEnsName(trimmed);
  }

  return null;
}

/**
 * Format an address for display, using ENS name if available
 * @param address - Ethereum address
 * @param ensName - Optional pre-fetched ENS name
 * @returns Formatted display string
 */
export function formatAddressOrEns(
  address: string,
  ensName?: string | null
): string {
  if (ensName) {
    return ensName;
  }

  // Truncate address
  if (address.startsWith('0x') && address.length === 42) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return address;
}
