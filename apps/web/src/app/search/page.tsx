'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { COMMON_DOMAINS, RESERVED_DOMAINS } from '@ttp/shared';

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score * 5);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${star <= stars ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('*');

  const { data: results, isLoading } = trpc.queries.searchSubjects.useQuery(
    { domain, query: query || undefined, limit: 20 },
    { enabled: query.length > 0 || domain !== '*' }
  );

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-3xl font-bold">Search</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search for businesses, services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value={RESERVED_DOMAINS.WILDCARD}>All Domains</option>
            {Object.entries(COMMON_DOMAINS).map(([id, { name }]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-500">
          Enter a search term or select a domain to see results with personalized scores from your trust network.
        </p>
      </div>

      {isLoading && <p className="text-gray-500">Searching...</p>}

      {results && results.results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <p className="text-gray-500 mb-4">
            No results found. Try a different search or create some subjects first.
          </p>
          <Link href="/subject/new" className="text-blue-600 hover:underline">
            Create a new subject &rarr;
          </Link>
        </div>
      )}

      {results && results.results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Found {results.totalCount} results
          </p>
          {results.results.map((result: any) => (
            <Link
              key={result.subject.id}
              href={`/subject/${result.subject.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg hover:text-blue-600">
                    {result.subject.canonicalName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500 capitalize">{result.subject.type}</span>
                    {result.subject.domains && (Array.from(result.subject.domains) as string[]).slice(0, 2).map((d) => (
                      <span key={d} className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  {result.score !== null ? (
                    <>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-2xl font-bold text-blue-600">
                          {(result.score * 5).toFixed(1)}
                        </span>
                        <StarRating score={result.score} />
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.confidence >= 0.7 ? 'High' : result.confidence >= 0.4 ? 'Medium' : 'Low'} confidence
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400">No score yet</div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  <strong>{result.networkEndorsementCount}</strong> network endorsements
                </span>
                <span className="text-gray-400">|</span>
                <span>
                  {result.totalEndorsementCount} total
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick create subject section */}
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
        <h3 className="font-medium mb-2">Can&apos;t find what you&apos;re looking for?</h3>
        <p className="text-sm text-gray-500 mb-4">
          You can add a new business or service to the system.
        </p>
        <Link
          href="/subject/new"
          className="inline-block px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
        >
          Add New Subject
        </Link>
      </div>
    </main>
  );
}
