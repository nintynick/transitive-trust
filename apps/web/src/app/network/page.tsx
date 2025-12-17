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
          <h1 className="text-3xl font-bold">Trust Network</h1>
        </div>
        <p className="text-gray-500">Please create a principal first.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Trust Network</h1>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 flex flex-wrap gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Max Hops</label>
          <input
            type="range"
            min="1"
            max="5"
            value={maxHops}
            onChange={(e) => setMaxHops(Number(e.target.value))}
            className="w-32"
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{maxHops}</span>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Min Trust</label>
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
                <p className="mb-2">Your trust network is empty.</p>
                <Link href="/trust" className="text-blue-600 hover:underline">
                  Declare trust in someone to get started
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
              <h2 className="font-semibold mb-4">
                Nodes ({network.nodes.length})
              </h2>
              {network.nodes.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No connections yet. Start by declaring trust in someone.
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
                        {node.hopDistance} hop{node.hopDistance !== 1 && 's'} (
                        {(node.effectiveTrust * 100).toFixed(0)}% trust)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="font-semibold mb-4">
                Edges ({network.edges.length})
              </h2>
              {network.edges.length === 0 ? (
                <p className="text-gray-500 text-sm">No trust edges</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {network.edges.map((edge, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{edge.from.slice(0, 8)}</span>
                      <span className="mx-2">&rarr;</span>
                      <span className="font-medium">{edge.to.slice(0, 8)}</span>
                      <span className="text-gray-500 ml-2">
                        ({(edge.weight * 100).toFixed(0)}% in {edge.domain})
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
