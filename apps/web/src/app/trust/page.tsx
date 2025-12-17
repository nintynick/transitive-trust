'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { COMMON_DOMAINS, RESERVED_DOMAINS } from '@ttp/shared';

export default function TrustPage() {
  const [targetId, setTargetId] = useState('');
  const [weight, setWeight] = useState(0.8);
  const [domain, setDomain] = useState('*');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [currentPrincipalId, setCurrentPrincipalId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPrincipalId(localStorage.getItem('ttp-principal-id'));
    }
  }, []);

  const utils = trpc.useUtils();

  const { data: outgoing } = trpc.trust.getOutgoing.useQuery({ domain: '*' });

  const [error, setError] = useState<string | null>(null);

  const declareTrust = trpc.trust.declareTrust.useMutation({
    onSuccess: () => {
      utils.trust.getOutgoing.invalidate();
      setTargetId('');
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const revokeTrust = trpc.trust.revokeTrust.useMutation({
    onSuccess: () => {
      utils.trust.getOutgoing.invalidate();
    },
  });

  const { data: principals } = trpc.principals.list.useQuery({ limit: 50 });

  // Filter out the current user from the list
  const otherPrincipals = principals?.filter(p => p.id !== currentPrincipalId) || [];

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Declare Trust</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Add Trust Edge</h2>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">
                Trust whom?
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseManualEntry(!useManualEntry);
                  setTargetId('');
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                {useManualEntry ? 'Select from list' : 'Enter ID manually'}
              </button>
            </div>

            {useManualEntry ? (
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Enter principal ID (e.g., prin_abc123...)"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            ) : otherPrincipals.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <p className="mb-2">No other principals in the system yet.</p>
                <p>Share this app with others, or <button
                  type="button"
                  onClick={() => setUseManualEntry(true)}
                  className="text-blue-600 hover:underline"
                >enter a principal ID manually</button>.</p>
              </div>
            ) : (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Select a principal...</option>
                {otherPrincipals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.metadata.displayName || p.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Trust weight: {weight.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0 (No trust)</span>
              <span>0.5 (Neutral)</span>
              <span>1 (Complete trust)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value={RESERVED_DOMAINS.WILDCARD}>All Domains (*)</option>
              {Object.entries(COMMON_DOMAINS).map(([id, { name }]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => {
              setError(null);
              declareTrust.mutate({ to: targetId, weight, domain });
            }}
            disabled={!targetId || declareTrust.isPending}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {declareTrust.isPending ? 'Declaring...' : 'Declare Trust'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h2 className="font-semibold mb-4">Your Trust Edges</h2>

        {outgoing?.length === 0 ? (
          <p className="text-gray-500 text-sm">
            You haven't declared trust in anyone yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {outgoing?.map((edge) => (
              <li
                key={edge.id}
                className="flex justify-between items-center py-2 border-b dark:border-gray-700"
              >
                <div>
                  <span className="font-medium">{edge.to.slice(0, 12)}...</span>
                  <span className="text-gray-500 text-sm ml-2">
                    (weight: {edge.weight.toFixed(2)}, domain: {edge.domain})
                  </span>
                </div>
                <button
                  onClick={() => revokeTrust.mutate({ edgeId: edge.id })}
                  className="text-red-500 text-sm hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
