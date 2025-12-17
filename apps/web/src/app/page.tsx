'use client';

import { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

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
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-5 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-1">Write a Review</h3>
            <p className="text-green-100 text-sm">
              Share your experience with a business
            </p>
          </Link>

          <Link
            href="/search"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-5 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-1">Search</h3>
            <p className="text-purple-100 text-sm">
              Find businesses with trusted ratings
            </p>
          </Link>
        </div>
      </section>

      {/* Your Activity */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Your Activity</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Trust Network */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">People You Trust</h3>
              <Link href="/network" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {!hasTrust ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">
                  Your trust network is empty
                </p>
                <Link
                  href="/trust"
                  className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  Add your first trusted person
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {myTrust?.slice(0, 4).map((edge) => (
                  <li key={edge.id} className="text-sm flex items-center justify-between py-1">
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      {edge.to.slice(0, 6)}...{edge.to.slice(-4)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {Math.round(edge.weight * 100)}% · {edge.domain === '*' ? 'all' : edge.domain}
                    </span>
                  </li>
                ))}
                {myTrust && myTrust.length > 4 && (
                  <li className="text-sm text-gray-500 pt-1">
                    +{myTrust.length - 4} more
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Your Reviews */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Your Reviews</h3>
              <Link href="/endorsements" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {!hasEndorsements ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">
                  You haven't written any reviews
                </p>
                <Link
                  href="/search"
                  className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50"
                >
                  Find something to review
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {myEndorsements?.slice(0, 4).map((e) => (
                  <li key={e.id} className="text-sm py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        {e.content?.summary || 'Review'}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {Math.round(e.rating.score * 100)}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{e.domain}</span>
                  </li>
                ))}
                {myEndorsements && myEndorsements.length > 4 && (
                  <li className="text-sm text-gray-500 pt-1">
                    +{myEndorsements.length - 4} more
                  </li>
                )}
              </ul>
            )}
          </div>
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
