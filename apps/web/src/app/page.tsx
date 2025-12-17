'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Store address in localStorage for tRPC header
  useEffect(() => {
    if (address) {
      localStorage.setItem('ttp-principal-id', address);
    } else {
      localStorage.removeItem('ttp-principal-id');
    }
  }, [address]);

  // Check if this address has a principal in the database
  const { data: me, isLoading: isLoadingMe, refetch: refetchMe } = trpc.principals.me.useQuery(
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

  const createPrincipal = trpc.principals.create.useMutation({
    onSuccess: () => {
      setIsRegistering(false);
      setRegistrationError(null);
      refetchMe();
    },
    onError: (err) => {
      setIsRegistering(false);
      setRegistrationError(err.message);
    },
  });

  const handleRegister = () => {
    if (!address) return;
    setIsRegistering(true);
    setRegistrationError(null);
    createPrincipal.mutate({
      type: 'user',
      publicKey: address,
      metadata: {
        displayName: displayName || 'Anonymous User',
      },
    });
  };

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

  // Connected but loading principal
  if (isLoadingMe) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Transitive Trust Protocol</h1>
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  // Connected but no principal - show registration
  if (!me) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Transitive Trust Protocol</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          A decentralized system for perspectival trust and reputation
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your wallet is connected. Set a display name to complete registration.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Connected: <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
            {registrationError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {registrationError}
              </div>
            )}
            <button
              onClick={handleRegister}
              disabled={isRegistering || createPrincipal.isPending}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isRegistering || createPrincipal.isPending ? 'Registering...' : 'Complete Registration'}
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Use a different wallet
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Fully connected and registered
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Transitive Trust Protocol</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 dark:text-gray-400" title={address}>
            {me.metadata.displayName || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
          </span>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Ethereum Address display for sharing */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Your Ethereum Address</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Share this with others so they can trust you</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-white dark:bg-gray-800 px-3 py-1 rounded text-sm font-mono" title={address}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </code>
            <button
              onClick={() => {
                if (address) navigator.clipboard.writeText(address);
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
                  <span className="font-medium">
                    {edge.to.startsWith('0x')
                      ? `${edge.to.slice(0, 6)}...${edge.to.slice(-4)}`
                      : `${edge.to.slice(0, 12)}...`}
                  </span>
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
