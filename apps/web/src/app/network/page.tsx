'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with D3
const TrustNetworkGraph = dynamic(
  () => import('@/components/trust-network/TrustNetworkGraph').then((mod) => mod.TrustNetworkGraph),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading visualization...</p>
      </div>
    ),
  }
);

export default function NetworkPage() {
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [maxHops, setMaxHops] = useState(3);
  const [minTrust, setMinTrust] = useState(0.1);

  useEffect(() => {
    const stored = localStorage.getItem('ttp-principal-id');
    if (stored) {
      setPrincipalId(stored);
    }
  }, []);

  const { data: network, isLoading, error } = trpc.trust.getNetwork.useQuery(
    {
      maxHops,
      minTrust,
    },
    { enabled: !!principalId }
  );

  if (!principalId) {
    return (
      <main className="min-h-screen p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-bold">Your Recommendation Network</h1>
        </div>
        <p className="text-gray-500">Please create an account first.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Your Recommendation Network</h1>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          This shows everyone whose recommendations can influence your personalized scores.
          People you directly trust are close to you; people they trust extend your network further.
          The further someone is, the less their endorsements affect your scores.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 flex flex-wrap gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Network Depth</label>
          <input
            type="range"
            min="1"
            max="5"
            value={maxHops}
            onChange={(e) => setMaxHops(Number(e.target.value))}
            className="w-32"
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{maxHops} hop{maxHops !== 1 && 's'}</span>
          <p className="text-xs text-gray-500 mt-1">How many connections away to include</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Minimum Influence</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={minTrust}
            onChange={(e) => setMinTrust(Number(e.target.value))}
            className="w-32"
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{(minTrust * 100).toFixed(0)}%</span>
          <p className="text-xs text-gray-500 mt-1">Hide people with less influence on your scores</p>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading network...</p>}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-600 dark:text-red-400">Failed to load network: {error.message}</p>
        </div>
      )}

      {network && (
        <>
          {/* Network Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-4">
              Network Visualization ({network.nodes.length} nodes, {network.edges.length} edges)
            </h2>
            {network.nodes.length === 0 && network.edges.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-2">Your recommendation network is empty.</p>
                <Link href="/trust" className="text-blue-600 hover:underline">
                  Start by trusting someone's recommendations
                </Link>
              </div>
            ) : (
              <TrustNetworkGraph
                nodes={network.nodes}
                edges={network.edges}
                viewerId={principalId}
              />
            )}
          </div>

          {/* Node and Edge lists */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="font-semibold mb-2">
                People in Your Network ({network.nodes.length})
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Their endorsements can influence your personalized scores
              </p>
              {network.nodes.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No one yet. Start by trusting someone's recommendations.
                </p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {network.nodes.map((node) => (
                    <li
                      key={node.id}
                      className="flex justify-between items-center"
                    >
                      <span className="font-medium">
                        {node.displayName || node.id.slice(0, 12) + '...'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {node.hopDistance === 0 ? (
                          <span className="text-blue-600 dark:text-blue-400">You</span>
                        ) : (
                          <>
                            {node.hopDistance} hop{node.hopDistance !== 1 && 's'} away
                            <span className="ml-1">({(node.effectiveTrust * 100).toFixed(0)}% influence)</span>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="font-semibold mb-2">
                Trust Relationships ({network.edges.length})
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Who trusts whose recommendations
              </p>
              {network.edges.length === 0 ? (
                <p className="text-gray-500 text-sm">No trust relationships yet</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {network.edges.map((edge, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{edge.from.slice(0, 8)}</span>
                      <span className="mx-2 text-gray-400">trusts</span>
                      <span className="font-medium">{edge.to.slice(0, 8)}</span>
                      <span className="text-gray-500 ml-2">
                        {(edge.weight * 100).toFixed(0)}% for {edge.domain === '*' ? 'everything' : edge.domain}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
