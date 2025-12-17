'use client';

import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function EndorsementsPage() {
  const { data: feed, isLoading } = trpc.endorsements.getFeed.useQuery({
    limit: 20,
  });

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Endorsement Feed</h1>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Endorsements from people in your trust network, weighted by how much you
        trust them.
      </p>

      {isLoading && <p className="text-gray-500">Loading feed...</p>}

      {feed && feed.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p className="text-gray-500">
            No endorsements found from your network. This could be because:
          </p>
          <ul className="list-disc ml-6 mt-2 text-gray-500 text-sm">
            <li>You haven't declared trust in anyone yet</li>
            <li>People you trust haven't written any endorsements</li>
          </ul>
        </div>
      )}

      {feed && feed.length > 0 && (
        <div className="space-y-4">
          {feed.map(({ endorsement, authorTrust, hopDistance }) => (
            <div
              key={endorsement.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm text-gray-500">
                    From{' '}
                    <span className="font-medium">
                      {endorsement.author?.slice(0, 12) || 'Unknown'}...
                    </span>
                    <span className="ml-2">
                      ({(authorTrust * 100).toFixed(0)}% trust, {hopDistance}{' '}
                      hop{hopDistance !== 1 && 's'} away)
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {(endorsement.rating.score * 5).toFixed(1)}/5
                  </div>
                </div>
              </div>

              {endorsement.content?.summary && (
                <p className="text-gray-700 dark:text-gray-300">
                  "{endorsement.content.summary}"
                </p>
              )}

              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>Domain: {endorsement.domain}</span>
                {endorsement.context?.verified && (
                  <span className="text-green-600">Verified</span>
                )}
                <span>
                  {new Date(endorsement.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
