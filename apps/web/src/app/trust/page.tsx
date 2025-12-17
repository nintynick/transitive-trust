'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { COMMON_DOMAINS, RESERVED_DOMAINS, canonicalize } from '@ttp/shared';
import { createSignature } from '@/lib/signing';

// Trust level descriptions that explain what each level means
function getTrustDescription(weight: number): { label: string; description: string; color: string } {
  if (weight >= 0.9) {
    return {
      label: 'Highly trust their judgment',
      description: 'Their recommendations carry significant weight in your scores. Reserve for people whose taste consistently matches yours.',
      color: 'text-green-600 dark:text-green-400',
    };
  }
  if (weight >= 0.7) {
    return {
      label: 'Generally trust their judgment',
      description: 'You often agree with their recommendations. Their endorsements will meaningfully influence your scores.',
      color: 'text-green-600 dark:text-green-400',
    };
  }
  if (weight >= 0.5) {
    return {
      label: 'Somewhat trust their judgment',
      description: 'You sometimes agree with their recommendations. Their endorsements will have moderate influence.',
      color: 'text-yellow-600 dark:text-yellow-400',
    };
  }
  if (weight >= 0.3) {
    return {
      label: 'Slightly trust their judgment',
      description: 'You occasionally find their recommendations useful. Their endorsements will have limited influence.',
      color: 'text-yellow-600 dark:text-yellow-400',
    };
  }
  return {
    label: 'Minimally trust their judgment',
    description: 'Their recommendations rarely match your preferences. Their endorsements will have very little influence.',
    color: 'text-orange-600 dark:text-orange-400',
  };
}

export default function TrustPage() {
  const [targetId, setTargetId] = useState('');
  const [weight, setWeight] = useState(0.8);
  const [domain, setDomain] = useState('*');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const utils = trpc.useUtils();

  const { data: outgoing } = trpc.trust.getOutgoing.useQuery({ domain: '*' });

  const [error, setError] = useState<string | null>(null);

  const declareTrust = trpc.trust.declareTrust.useMutation({
    onSuccess: () => {
      utils.trust.getOutgoing.invalidate();
      setTargetId('');
      setError(null);
      setIsSubmitting(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsSubmitting(false);
    },
  });

  const revokeTrust = trpc.trust.revokeTrust.useMutation({
    onSuccess: () => {
      utils.trust.getOutgoing.invalidate();
    },
  });

  const handleSubmit = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Create the trust data to sign
      const trustData = { to: targetId, weight, domain };
      const message = canonicalize(trustData);

      // Request signature from wallet (MetaMask popup)
      const walletSignature = await signMessageAsync({ message });

      // Create the signature object
      const signature = createSignature(walletSignature, address);

      // Submit to server
      declareTrust.mutate({
        to: targetId,
        weight,
        domain,
        signature,
      });
    } catch (err) {
      // User likely rejected the signature request
      setError(err instanceof Error ? err.message : 'Failed to sign');
      setIsSubmitting(false);
    }
  };

  const { data: principals } = trpc.principals.list.useQuery({ limit: 50 });

  // Filter out the current user from the list
  const otherPrincipals = principals?.filter(p => p.id !== address) || [];

  const selectedPrincipal = otherPrincipals.find(p => p.id === targetId);
  const trustInfo = getTrustDescription(weight);
  const domainLabel = domain === '*' ? 'everything' : COMMON_DOMAINS[domain as keyof typeof COMMON_DOMAINS]?.name?.toLowerCase() || domain;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Trust Someone's Judgment</h1>
      </div>

      {/* Explanation box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">What does "trust" mean here?</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          When you trust someone, you're saying: <strong>"I value their recommendations and endorsements."</strong>
          {' '}Their reviews will influence your personalized scores for businesses, services, and products.
          Trust can also flow through your network — if you trust Alice, and Alice trusts Bob, then Bob's
          endorsements will influence your scores too (with reduced weight).
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Whose recommendations do you value?</h2>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">
                Select a person
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
                placeholder="Enter principal ID (e.g., usr_abc123...)"
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            ) : otherPrincipals.length === 0 ? (
              <div className="text-sm text-gray-500 p-4 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                <p className="mb-2">No other people in the system yet.</p>
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
                <option value="">Select someone...</option>
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
              For what type of recommendations?
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value={RESERVED_DOMAINS.WILDCARD}>Everything (all categories)</option>
              {Object.entries(COMMON_DOMAINS).map(([id, { name, description }]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {domain === '*'
                ? "Their endorsements will count across all categories."
                : `Their endorsements will count for ${domainLabel} recommendations.`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              How much do you value their judgment?
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span>A little</span>
              <span>Moderately</span>
              <span>A lot</span>
            </div>

            {/* Dynamic trust level explanation */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className={`font-medium ${trustInfo.color}`}>
                {Math.round(weight * 100)}% — {trustInfo.label}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {trustInfo.description}
              </p>
            </div>
          </div>

          {/* Preview sentence */}
          {targetId && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="text-sm">
                <span className="font-medium">You're declaring:</span>{' '}
                "I trust <strong>{selectedPrincipal?.metadata.displayName || (targetId.startsWith('0x') ? `${targetId.slice(0, 6)}...${targetId.slice(-4)}` : `${targetId.slice(0, 12)}...`)}</strong>'s
                judgment for <strong>{domainLabel}</strong> recommendations
                at <strong>{Math.round(weight * 100)}%</strong> confidence."
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!targetId || isSubmitting || declareTrust.isPending || !isConnected}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting || declareTrust.isPending ? 'Signing & Saving...' : 'Trust Their Recommendations'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h2 className="font-semibold mb-4">People Whose Judgment You Trust</h2>

        {outgoing?.length === 0 ? (
          <p className="text-gray-500 text-sm">
            You haven't trusted anyone's recommendations yet. Start by adding people whose taste and judgment you value.
          </p>
        ) : (
          <ul className="space-y-3">
            {outgoing?.map((edge) => {
              const person = otherPrincipals.find(p => p.id === edge.to);
              const displayName = person?.metadata.displayName || (edge.to.startsWith('0x') ? `${edge.to.slice(0, 6)}...${edge.to.slice(-4)}` : `${edge.to.slice(0, 12)}...`);
              const edgeDomain = edge.domain === '*' ? 'everything' : COMMON_DOMAINS[edge.domain as keyof typeof COMMON_DOMAINS]?.name?.toLowerCase() || edge.domain;
              const trustLevel = getTrustDescription(edge.weight);

              return (
                <li
                  key={edge.id}
                  className="flex justify-between items-start py-3 border-b dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{displayName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        edge.weight >= 0.7 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        edge.weight >= 0.4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {Math.round(edge.weight * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      You trust their <strong>{edgeDomain}</strong> recommendations
                    </p>
                  </div>
                  <button
                    onClick={() => revokeTrust.mutate({ edgeId: edge.id })}
                    className="text-red-500 text-sm hover:underline ml-4"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
