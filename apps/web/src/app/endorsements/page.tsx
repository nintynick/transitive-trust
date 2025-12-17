'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

type SortBy = 'trust' | 'date' | 'rating';
type SortOrder = 'asc' | 'desc';

const DOMAIN_OPTIONS = [
  { value: '', label: 'All domains' },
  { value: 'defi', label: 'DeFi' },
  { value: 'security', label: 'Security & Audit' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'wallets', label: 'Wallets' },
  { value: 'nft', label: 'NFT' },
  { value: 'staking', label: 'Staking' },
];

export default function EndorsementsPage() {
  const [domain, setDomain] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('trust');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { data: feed, isLoading } = trpc.endorsements.getFeed.useQuery({
    limit: 50,
    domain: domain || undefined,
    sortBy,
    sortOrder,
  });

  const getSortLabel = () => {
    switch (sortBy) {
      case 'trust':
        return sortOrder === 'desc' ? 'Most trusted first' : 'Least trusted first';
      case 'date':
        return sortOrder === 'desc' ? 'Newest first' : 'Oldest first';
      case 'rating':
        return sortOrder === 'desc' ? 'Highest rated first' : 'Lowest rated first';
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Network Reviews</h1>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Reviews from people in your trust network. Reviews from people you trust more appear higher.
      </p>

      {/* Filters and Sort */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Domain Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Domain
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {DOMAIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="trust">Trust level</option>
              <option value="date">Date</option>
              <option value="rating">Rating</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Order
            </label>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              {sortOrder === 'desc' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Descending
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Ascending
                </>
              )}
            </button>
          </div>

          {/* Results info */}
          <div className="ml-auto text-sm text-gray-500">
            {feed ? `${feed.length} reviews` : ''}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">{getSortLabel()}</p>
      </div>

      {isLoading && <p className="text-gray-500">Loading reviews...</p>}

      {feed && feed.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No reviews from your network yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            {domain
              ? `No one in your trust network has reviewed anything in the "${domain}" domain yet.`
              : "Once you trust people and they write reviews, you'll see their recommendations here."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/trust"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Add trusted people
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search businesses
            </Link>
          </div>
          {domain && (
            <button
              onClick={() => setDomain('')}
              className="mt-4 text-sm text-purple-600 hover:text-purple-700"
            >
              Clear domain filter to see all reviews
            </button>
          )}
        </div>
      )}

      {feed && feed.length > 0 && (
        <div className="space-y-4">
          {feed.map(({ endorsement, authorTrust, hopDistance, authorDisplayName }) => (
            <div
              key={endorsement.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              {/* Subject header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <Link
                    href={`/subject/${endorsement.subject}`}
                    className="font-semibold text-lg text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {endorsement.subjectName || 'Unknown business'}
                  </Link>
                  <p className="text-sm text-gray-500">
                    Reviewed by{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {authorDisplayName || 'Unknown author'}
                    </span>
                    <span className="text-gray-400 ml-1">
                      · {hopDistance === 1 ? 'directly trusted' : `${hopDistance} hops away`}
                    </span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-2xl font-bold ${
                    endorsement.rating.score >= 0.8
                      ? 'text-green-600 dark:text-green-400'
                      : endorsement.rating.score >= 0.6
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {Math.round(endorsement.rating.score * 100)}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {endorsement.rating.originalScore}
                  </div>
                </div>
              </div>

              {/* Review content */}
              {endorsement.content?.summary && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  "{endorsement.content.summary}"
                </p>
              )}

              {/* Metadata footer */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {/* Trust indicator */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    hopDistance === 1
                      ? 'bg-green-500'
                      : hopDistance === 2
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                  }`} />
                  <span className="text-gray-600 dark:text-gray-400">
                    {(authorTrust * 100).toFixed(0)}% trust
                  </span>
                  <span className="text-gray-400">
                    ({hopDistance} hop{hopDistance !== 1 && 's'})
                  </span>
                </div>

                {/* Domain */}
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                  {endorsement.domain}
                </span>

                {/* Verified badge */}
                {endorsement.context?.verified && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}

                {/* Date */}
                <span className="text-gray-400 ml-auto">
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
