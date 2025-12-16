'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

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
            <option value="*">All Domains</option>
            <option value="food.restaurants">Restaurants</option>
            <option value="services.home.plumbing">Plumbing</option>
            <option value="tech.software">Software</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Searching...</p>}

      {results && results.results.length === 0 && (
        <p className="text-gray-500">
          No results found. Try a different search or create some subjects first.
        </p>
      )}

      {results && results.results.length > 0 && (
        <div className="space-y-4">
          {results.results.map((result) => (
            <div
              key={result.subject.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {result.subject.canonicalName}
                  </h3>
                  <p className="text-sm text-gray-500">{result.subject.type}</p>
                </div>
                <div className="text-right">
                  {result.score !== null ? (
                    <>
                      <div className="text-2xl font-bold text-blue-600">
                        {(result.score * 5).toFixed(1)}/5
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.confidence >= 0.5 ? 'High' : 'Low'} confidence
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400">No score</div>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {result.networkEndorsementCount} network endorsements,{' '}
                {result.totalEndorsementCount} total
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
