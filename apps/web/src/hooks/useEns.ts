/**
 * React hooks for ENS resolution
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getEnsName,
  resolveEnsName,
  batchGetEnsNames,
  resolveAddressOrEns,
} from '@/lib/ens';

/**
 * Hook to get ENS name for an address
 */
export function useEnsName(address: string | undefined | null) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setEnsName(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getEnsName(address).then((name) => {
      if (!cancelled) {
        setEnsName(name);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { ensName, isLoading };
}

/**
 * Hook to resolve an ENS name to an address
 */
export function useEnsAddress(name: string | undefined | null) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!name) {
      setAddress(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    resolveEnsName(name).then((addr) => {
      if (!cancelled) {
        setAddress(addr);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return { address, isLoading };
}

/**
 * Hook to batch resolve ENS names for multiple addresses
 */
export function useEnsNames(addresses: string[]) {
  const [ensNames, setEnsNames] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (addresses.length === 0) {
      setEnsNames(new Map());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    batchGetEnsNames(addresses).then((names) => {
      if (!cancelled) {
        setEnsNames(names);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [addresses.join(',')]); // Join to create stable dependency

  return { ensNames, isLoading };
}

/**
 * Hook for resolving input that could be an ENS name or address
 */
export function useResolveAddressOrEns() {
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (input: string): Promise<string | null> => {
    setIsResolving(true);
    setError(null);

    try {
      const address = await resolveAddressOrEns(input);
      if (!address) {
        setError('Could not resolve address or ENS name');
      }
      return address;
    } catch (err) {
      setError('Failed to resolve');
      return null;
    } finally {
      setIsResolving(false);
    }
  }, []);

  return { resolve, isResolving, error };
}
