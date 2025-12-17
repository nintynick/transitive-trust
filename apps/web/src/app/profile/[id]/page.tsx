'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useEnsName, useEnsNames } from '@/hooks/useEns';

export default function ProfilePage() {
  const params = useParams();
  const profileId = params.id as string;
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('ttp-principal-id');
    if (stored) {
      setViewerId(stored);
    }
  }, []);

  const isOwnProfile = viewerId === profileId;

  // Get the principal's info
  const { data: principal, isLoading: principalLoading } = trpc.principals.getById.useQuery(
    { id: profileId },
    { enabled: !!profileId }
  );

  // Get trust connection (how viewer is connected to this person)
  const { data: connection } = trpc.trust.getConnection.useQuery(
    { targetId: profileId },
    { enabled: !!profileId && !!viewerId && !isOwnProfile }
  );

  // Get their reviews
  const { data: endorsements, isLoading: endorsementsLoading } = trpc.endorsements.getByAuthor.useQuery(
    { authorId: profileId, limit: 20 },
    { enabled: !!profileId }
  );

  // Get who they trust
  const { data: outgoingTrust } = trpc.trust.getOutgoing.useQuery(
    {},
    { enabled: isOwnProfile }
  );

  // ENS name resolution
  const { ensName: profileEnsName } = useEnsName(profileId);

  // Get ENS names for trust path
  const pathAddresses = useMemo(() => {
    if (!connection?.path) return [];
    return connection.path.map(node => node.id).filter(id => id.startsWith('0x'));
  }, [connection?.path]);
  const { ensNames: pathEnsNames } = useEnsNames(pathAddresses);

  // Get ENS names for outgoing trust
  const outgoingAddresses = useMemo(() => {
    if (!outgoingTrust) return [];
    return outgoingTrust.map(edge => edge.to).filter(id => id.startsWith('0x'));
  }, [outgoingTrust]);
  const { ensNames: outgoingEnsNames } = useEnsNames(outgoingAddresses);

  const displayName = profileEnsName || principal?.metadata?.displayName || principal?.metadata?.name;
  const shortId = profileId.startsWith('0x')
    ? `${profileId.slice(0, 6)}...${profileId.slice(-4)}`
    : profileId;

  if (!viewerId) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
        <p className="text-gray-500">Please connect your wallet to view profiles.</p>
      </main>
    );
  }

  if (principalLoading) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!principal) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">Person not found: {shortId}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Profile</h1>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          {/* Avatar placeholder */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {(displayName || shortId).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {displayName || shortId}
            </h2>
            {displayName && (
              <p className="text-sm text-gray-500 font-mono">{shortId}</p>
            )}
            {isOwnProfile && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                This is you
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Trust Connection (if not own profile) */}
      {!isOwnProfile && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Your Connection</h3>
          {connection ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  connection.hopDistance === 1
                    ? 'bg-green-500'
                    : connection.hopDistance === 2
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                }`} />
                <span className="text-gray-700 dark:text-gray-300">
                  {connection.hopDistance === 1
                    ? 'You directly trust this person'
                    : `${connection.hopDistance} hops away in your trust network`}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{(connection.effectiveTrust * 100).toFixed(0)}%</span> effective trust
              </div>
              {connection.path.length > 0 && (
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Trust path:</span>{' '}
                  You &rarr;{' '}
                  {connection.path.map((node, i) => {
                    const nodeEnsName = pathEnsNames.get(node.id);
                    const nodeDisplay = nodeEnsName || node.displayName || `${node.id.slice(0, 6)}...`;
                    return (
                      <span key={node.id}>
                        <Link
                          href={`/profile/${node.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {nodeDisplay}
                        </Link>
                        {' '}&rarr;{' '}
                      </span>
                    );
                  })}
                  {displayName || shortId}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              <p className="mb-3">This person is not in your trust network.</p>
              <Link
                href="/trust"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add to trust network
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Their Reviews */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">
            {isOwnProfile ? 'Your Reviews' : 'Their Reviews'} ({endorsements?.length || 0})
          </h3>
        </div>
        {endorsementsLoading ? (
          <p className="p-4 text-gray-500">Loading reviews...</p>
        ) : !endorsements || endorsements.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>{isOwnProfile ? "You haven't" : "They haven't"} written any reviews yet.</p>
            {isOwnProfile && (
              <Link
                href="/search"
                className="inline-block mt-3 text-blue-600 hover:underline"
              >
                Search for a business to review
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {endorsements.map((e) => (
              <li key={e.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/subject/${e.subject}`}
                      className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {e.subjectName || 'Unknown business'}
                    </Link>
                    {e.content?.summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        "{e.content.summary}"
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {e.domain}
                      </span>
                      <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${
                    e.rating.score >= 0.8
                      ? 'text-green-600 dark:text-green-400'
                      : e.rating.score >= 0.6
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {Math.round(e.rating.score * 100)}%
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Who they trust (only show for own profile) */}
      {isOwnProfile && outgoingTrust && outgoingTrust.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">People You Trust ({outgoingTrust.length})</h3>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {outgoingTrust.map((edge) => {
              const edgeEnsName = outgoingEnsNames.get(edge.to);
              const shortAddr = edge.to.startsWith('0x') ? `${edge.to.slice(0, 6)}...${edge.to.slice(-4)}` : edge.to;
              const edgeDisplay = edgeEnsName || shortAddr;
              return (
                <li key={edge.id} className="p-4 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/profile/${edge.to}`}
                      className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {edgeDisplay}
                    </Link>
                    {edgeEnsName && (
                      <span className="ml-2 text-xs text-gray-500 font-mono">{shortAddr}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{(edge.weight * 100).toFixed(0)}%</span>
                    {' for '}
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {edge.domain === '*' ? 'everything' : edge.domain}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
