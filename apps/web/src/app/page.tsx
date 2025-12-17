'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function Home() {
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [newPrincipalName, setNewPrincipalName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('ttp-principal-id');
    if (stored) {
      setPrincipalId(stored);
    }
  }, []);

  const createPrincipal = trpc.principals.create.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('ttp-principal-id', data.id);
      setPrincipalId(data.id);
    },
  });

  const { data: me } = trpc.principals.me.useQuery(undefined, {
    enabled: !!principalId,
  });

  const { data: myTrust } = trpc.trust.getOutgoing.useQuery(
    { domain: '*' },
    { enabled: !!principalId }
  );

  const { data: myEndorsements } = trpc.endorsements.getMine.useQuery(
    { limit: 5 },
    { enabled: !!principalId }
  );

  const handleCreatePrincipal = () => {
    createPrincipal.mutate({
      type: 'user',
      publicKey: 'placeholder-key',
      metadata: {
        displayName: newPrincipalName || 'Anonymous User',
      },
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('ttp-principal-id');
    setPrincipalId(null);
  };

  if (!principalId) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Transitive Trust Protocol</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          A decentralized system for perspectival trust and reputation
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create a principal to start building your trust network
          </p>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Your name"
              value={newPrincipalName}
              onChange={(e) => setNewPrincipalName(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={handleCreatePrincipal}
              disabled={createPrincipal.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createPrincipal.isPending ? 'Creating...' : 'Create Principal'}
            </button>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">1. Trust People's Judgment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Identify people whose recommendations you value — friends with great taste, experts in specific areas
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">2. Share Endorsements</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Write reviews of businesses and services. Your endorsements help people who trust you.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">3. Get Personalized Scores</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See ratings based on what people you trust think, not anonymous strangers
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Transitive Trust Protocol</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 dark:text-gray-400">
            {me?.metadata.displayName || principalId.slice(0, 12)}...
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Principal ID display for sharing */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Your Principal ID</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Share this with others so they can trust you</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded text-sm font-mono">
              {principalId}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(principalId);
                alert('Copied to clipboard!');
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/search"
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Search</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Find businesses and services with personalized scores
          </p>
        </Link>

        <Link
          href="/network"
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Trust Network</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your trust relationships
          </p>
        </Link>

        <Link
          href="/endorsements"
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Endorsements</h2>
          <p className="text-gray-600 dark:text-gray-400">
            See endorsements from your network
          </p>
        </Link>

        <Link
          href="/trust"
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Trust Someone</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Add people whose recommendations you value
          </p>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">People You Trust</h3>
          {myTrust?.length === 0 ? (
            <p className="text-gray-500 text-sm">
              You haven't trusted anyone's recommendations yet
            </p>
          ) : (
            <ul className="space-y-2">
              {myTrust?.slice(0, 5).map((edge) => (
                <li key={edge.id} className="text-sm flex items-center justify-between">
                  <span className="font-medium">{edge.to.slice(0, 12)}...</span>
                  <span className="text-gray-500">
                    {Math.round(edge.weight * 100)}% for {edge.domain === '*' ? 'everything' : edge.domain}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Your Reviews</h3>
          {myEndorsements?.length === 0 ? (
            <p className="text-gray-500 text-sm">
              You haven't written any reviews yet
            </p>
          ) : (
            <ul className="space-y-2">
              {myEndorsements?.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="font-medium">
                    {e.content?.summary || 'Rating: ' + e.rating.score.toFixed(1)}
                  </span>
                  <span className="text-gray-500 ml-2">({e.domain})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
