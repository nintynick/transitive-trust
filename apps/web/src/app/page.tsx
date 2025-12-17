'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with D3
const TrustNetworkGraph = dynamic(
  () => import('@/components/trust-network/TrustNetworkGraph').then((mod) => mod.TrustNetworkGraph),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading network...</p>
      </div>
    ),
  }
);

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  // Store address in localStorage for tRPC header
  useEffect(() => {
    if (address) {
      localStorage.setItem('ttp-principal-id', address);
    } else {
      localStorage.removeItem('ttp-principal-id');
    }
  }, [address]);

  // Principal is auto-created on first API call, just fetch it
  const { data: me, isLoading: isLoadingMe } = trpc.principals.me.useQuery(
    undefined,
    { enabled: isConnected && !!address }
  );

  const { data: myTrust } = trpc.trust.getOutgoing.useQuery(
    { domain: '*' },
    { enabled: isConnected && !!me }
  );

  const { data: myEndorsements } = trpc.endorsements.getMine.useQuery(
    { limit: 5 },
    { enabled: isConnected && !!me }
  );

  // Fetch network for the graph preview (with endorsements)
  const { data: network } = trpc.trust.getNetworkWithEndorsements.useQuery(
    { maxHops: 2, minTrust: 0.1, limit: 50, includeEndorsements: true },
    { enabled: isConnected && !!me }
  );

  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem('ttp-principal-id');
  };

  // Not connected - show connect wallet
  if (!isConnected) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Transitive Trust Protocol</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          A decentralized system for perspectival trust and reputation
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Connect your Ethereum wallet to start building your trust network.
            Your wallet address will be your identity.
          </p>

          <div className="space-y-3">
            {connectors.length === 0 ? (
              <p className="text-sm text-gray-500">
                No wallet detected. Please install MetaMask or another Ethereum wallet.
              </p>
            ) : (
              connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  disabled={isConnecting}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
                </button>
              ))
            )}
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

  // Connected but loading
  if (isLoadingMe) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Transitive Trust Protocol</h1>
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  // Connected - show dashboard
  const hasTrust = myTrust && myTrust.length > 0;
  const hasEndorsements = myEndorsements && myEndorsements.length > 0;
  const isNewUser = !hasTrust && !hasEndorsements;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transitive Trust Protocol</h1>
        <div className="flex items-center gap-4">
          <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded" title={address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </code>
          <button
            onClick={() => {
              if (address) navigator.clipboard.writeText(address);
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
            title="Copy address"
          >
            Copy
          </button>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Getting Started - only show for new users */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Welcome! Get started in 2 steps:</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Trust someone</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Add a friend whose recommendations you value</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Write a review</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Help others by sharing your experience</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Actions */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/trust"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-5 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-1">Trust Someone</h3>
            <p className="text-blue-100 text-sm">
              Add people whose judgment you value
            </p>
          </Link>

          <Link
            href="/subject/new"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-5 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-1">Write a Review</h3>
            <p className="text-blue-100 text-sm">
              Share your experience with a business
            </p>
          </Link>

          <Link
            href="/search"
            className="bg-blue-400 hover:bg-blue-500 text-white rounded-lg p-5 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-1">Search</h3>
            <p className="text-blue-50 text-sm">
              Find businesses with trusted ratings
            </p>
          </Link>
        </div>
      </section>

      {/* Trust Network Graph */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your Trust Network</h2>
          <Link href="/network" className="text-sm text-blue-600 hover:text-blue-700">
            View full network
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {!hasTrust ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Build Your Trust Network</h3>
              <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
                Your trust network determines whose recommendations influence your personalized scores.
                Start by adding people whose judgment you value.
              </p>
              <Link
                href="/trust"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add Your First Trusted Person
              </Link>
            </div>
          ) : (
            <div>
              <div className="h-[300px]">
                {network && address && (
                  <TrustNetworkGraph
                    nodes={network.nodes}
                    edges={network.edges}
                    viewerId={address}
                    showEndorsements={true}
                    showLegend={false}
                  />
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {network?.nodes.filter(n => n.type !== 'subject').length || 0} people · {network?.nodes.filter(n => n.type === 'subject').length || 0} reviews
                </span>
                <Link
                  href="/trust"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add more people
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Your Reviews */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your Reviews</h2>
          <Link href="/endorsements" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          {!hasEndorsements ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm mb-3">
                You haven't written any reviews yet
              </p>
              <Link
                href="/search"
                className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                Find something to review
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {myEndorsements?.slice(0, 5).map((e) => (
                <li key={e.id} className="text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[300px]">
                      {e.content?.summary || 'Review'}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {Math.round(e.rating.score * 100)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{e.domain}</span>
                </li>
              ))}
              {myEndorsements && myEndorsements.length > 5 && (
                <li className="text-sm text-gray-500 pt-1">
                  +{myEndorsements.length - 5} more reviews
                </li>
              )}
            </ul>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Explore</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/network"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Trust Network
          </Link>
          <Link
            href="/endorsements"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Network Endorsements
          </Link>
        </div>
      </section>
    </main>
  );
}
