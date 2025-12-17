'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { COMMON_DOMAINS } from '@ttp/shared';

type SubjectType = 'business' | 'individual' | 'product' | 'service';

export default function NewSubjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<SubjectType>('business');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [hasLocation, setHasLocation] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createSubject = trpc.subjects.create.useMutation({
    onSuccess: (data) => {
      router.push(`/subject/${data.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const handleSubmit = () => {
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (selectedDomains.length === 0) {
      setError('Please select at least one domain');
      return;
    }

    const location = hasLocation && latitude && longitude
      ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
      : undefined;

    createSubject.mutate({
      canonicalName: name.trim(),
      type,
      domains: selectedDomains,
      location,
    });
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/search" className="text-blue-600 hover:underline">
          &larr; Back to Search
        </Link>
        <h1 className="text-3xl font-bold">Add New Subject</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Joe's Coffee Shop"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Type *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['business', 'service', 'product', 'individual'] as SubjectType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-lg border capitalize ${
                    type === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Domains */}
          <div>
            <label className="block text-sm font-medium mb-2">Domains * (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COMMON_DOMAINS).map(([id, { name: domainName }]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleDomain(id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selectedDomains.includes(id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {domainName}
                </button>
              ))}
            </div>
            {selectedDomains.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Selected: {selectedDomains.join(', ')}
              </p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLocation}
                onChange={(e) => setHasLocation(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Add location (optional)</span>
            </label>
            {hasLocation && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="37.7749"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-122.4194"
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={createSubject.isPending}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {createSubject.isPending ? 'Creating...' : 'Create Subject'}
          </button>
        </div>
      </div>
    </main>
  );
}
