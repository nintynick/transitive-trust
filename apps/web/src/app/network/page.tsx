'use client';

import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function NetworkPage() {
  const { data: network, isLoading } = trpc.trust.getNetwork.useQuery({
    maxHops: 3,
    minTrust: 0.1,
  });

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Trust Network</h1>
      </div>

      {isLoading && <p className="text-gray-500">Loading network...</p>}

      {network && (
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
              <ul className="space-y-2">
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
              <ul className="space-y-2">
                {network.edges.slice(0, 20).map((edge, i) => (
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
      )}

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="font-semibold mb-2">Network Visualization</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          A D3.js-based interactive graph visualization would be displayed here,
          showing your trust network with nodes colored by hop distance and edges
          sized by weight.
        </p>
      </div>
    </main>
  );
}
