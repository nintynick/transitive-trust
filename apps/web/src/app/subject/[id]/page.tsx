'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { COMMON_DOMAINS, RESERVED_DOMAINS, canonicalize } from '@ttp/shared';
import { createSignature } from '@/lib/signing';

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score * 5);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= stars ? 'text-yellow-400' : 'text-gray-300'}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let color = 'bg-gray-100 text-gray-600';
  let label = 'Low';

  if (confidence >= 0.7) {
    color = 'bg-green-100 text-green-700';
    label = 'High';
  } else if (confidence >= 0.4) {
    color = 'bg-yellow-100 text-yellow-700';
    label = 'Medium';
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label} confidence ({(confidence * 100).toFixed(0)}%)
    </span>
  );
}

export default function SubjectPage() {
  const params = useParams();
  const subjectId = params.id as string;
  const [selectedDomain, setSelectedDomain] = useState('*');
  const [showEndorsementForm, setShowEndorsementForm] = useState(false);

  const { address, isConnected } = useAccount();

  const { data: subject, isLoading: subjectLoading } = trpc.subjects.getById.useQuery(
    { id: subjectId },
    { enabled: !!subjectId }
  );

  const { data: scoreData, isLoading: scoreLoading } = trpc.queries.getPersonalizedScore.useQuery(
    { subjectId, domain: selectedDomain },
    { enabled: !!subjectId && isConnected }
  );

  const { data: endorsements, isLoading: endorsementsLoading } = trpc.endorsements.getForSubject.useQuery(
    { subjectId, limit: 50 },
    { enabled: !!subjectId }
  );

  if (!isConnected) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline">&larr; Back to Home</Link>
        <p className="mt-8 text-gray-500">Please connect your wallet to view personalized scores.</p>
      </main>
    );
  }

  if (subjectLoading) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <p className="text-gray-500">Loading subject...</p>
      </main>
    );
  }

  if (!subject) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline">&larr; Back to Home</Link>
        <p className="mt-8 text-gray-500">Subject not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/search" className="text-blue-600 hover:underline">&larr; Back to Search</Link>
      </div>

      {/* Subject Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{subject.canonicalName}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">{subject.type}</span>
              {subject.domains && Array.from(subject.domains).map((d) => (
                <span key={d} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{d}</span>
              ))}
            </div>
            {subject.location && subject.location.latitude != null && subject.location.longitude != null && (
              <p className="text-sm text-gray-500">
                Location: {subject.location.latitude.toFixed(4)}, {subject.location.longitude.toFixed(4)}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowEndorsementForm(!showEndorsementForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showEndorsementForm ? 'Cancel' : 'Write Review'}
          </button>
        </div>
      </div>

      {showEndorsementForm && (
        <EndorsementForm subjectId={subjectId} subjectName={subject.canonicalName} onSuccess={() => setShowEndorsementForm(false)} />
      )}

      {/* Domain Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">View score for domain:</label>
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
        >
          <option value={RESERVED_DOMAINS.WILDCARD}>All Domains (*)</option>
          {Object.entries(COMMON_DOMAINS).map(([id, { name }]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      {/* Personalized Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Your Personalized Score</h2>
        {scoreLoading ? (
          <p className="text-gray-500">Calculating score...</p>
        ) : scoreData ? (
          <div>
            {scoreData.score !== null ? (
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-bold">{(scoreData.score * 5).toFixed(1)}</div>
                <div>
                  <StarRating score={scoreData.score} />
                  <ConfidenceBadge confidence={scoreData.confidence} />
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mb-4">No score available - no endorsements from your trust network yet.</p>
            )}

            <div className="border-t dark:border-gray-700 pt-4 mt-4">
              <h3 className="font-medium mb-3">Why this score?</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="text-gray-500 mb-1">Network endorsements</div>
                  <div className="text-2xl font-semibold">{scoreData.networkEndorsementCount}</div>
                  <div className="text-xs text-gray-400">from {scoreData.endorsementCount} total</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="text-gray-500 mb-1">Network coverage</div>
                  <div className="text-2xl font-semibold capitalize">{scoreData.networkCoverage}</div>
                  <div className="text-xs text-gray-400">based on trust connections</div>
                </div>
              </div>

              {scoreData.topContributors && scoreData.topContributors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Top contributors to your score:</h4>
                  <ul className="space-y-2">
                    {scoreData.topContributors.map((contributor: any, i: number) => (
                      <li key={contributor.principal?.id || i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium">{i + 1}</span>
                          <span className="font-medium">{contributor.principal?.displayName || (contributor.principal?.id?.slice(0, 12) + '...') || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500">Trust: {((contributor.trust ?? 0) * 100).toFixed(0)}%</span>
                          <span>Rated: {((contributor.rating ?? 0) * 5).toFixed(1)} ★</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Unable to calculate score.</p>
        )}
      </div>

      {/* All Endorsements */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">All Endorsements ({endorsements?.length || 0})</h2>
        {endorsementsLoading ? (
          <p className="text-gray-500">Loading endorsements...</p>
        ) : endorsements && endorsements.length > 0 ? (
          <ul className="space-y-4">
            {endorsements.map((endorsement: any) => (
              <EndorsementCard key={endorsement.id} endorsement={endorsement} />
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No endorsements yet. Be the first to write one!</p>
        )}
      </div>
    </main>
  );
}

function EndorsementCard({ endorsement }: { endorsement: any }) {
  const { data: author } = trpc.principals.getById.useQuery(
    { id: endorsement?.author },
    { enabled: !!endorsement?.author }
  );

  if (!endorsement) return null;

  return (
    <li className="border dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{author?.metadata?.displayName || (endorsement.author?.slice(0, 12) + '...') || 'Unknown'}</span>
          {endorsement.context?.verified && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Verified</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StarRating score={endorsement.rating?.score ?? 0} />
          <span className="text-sm text-gray-500">({endorsement.rating?.originalScore || 'N/A'})</span>
        </div>
      </div>
      {endorsement.content?.summary && <p className="text-gray-700 dark:text-gray-300 mb-2">{endorsement.content.summary}</p>}
      {endorsement.content?.body && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{endorsement.content.body}</p>}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{endorsement.domain || 'Unknown domain'}</span>
        <span>{endorsement.createdAt ? new Date(endorsement.createdAt).toLocaleDateString() : 'Unknown date'}</span>
        {endorsement.context?.relationship && <span className="capitalize">{endorsement.context.relationship}</span>}
      </div>
    </li>
  );
}

function EndorsementForm({ subjectId, subjectName, onSuccess }: { subjectId: string; subjectName: string; onSuccess: () => void }) {
  const [rating, setRating] = useState(4);
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [domain, setDomain] = useState('*');
  const [relationship, setRelationship] = useState<'one-time' | 'recurring' | 'long-term'>('one-time');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const utils = trpc.useUtils();
  const createEndorsement = trpc.endorsements.create.useMutation({
    onSuccess: () => {
      utils.endorsements.getForSubject.invalidate({ subjectId });
      utils.queries.getPersonalizedScore.invalidate({ subjectId });
      setIsSubmitting(false);
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Create the endorsement data to sign
      const endorsementData = {
        subject: subjectId,
        domain,
        rating: { score: rating / 5, originalScore: `${rating} out of 5`, originalScale: '1-5 stars' },
        content: summary ? { summary, body: body || undefined } : undefined,
        context: { relationship, verified: false },
      };
      const message = canonicalize(endorsementData);

      // Request signature from wallet (MetaMask popup)
      const walletSignature = await signMessageAsync({ message });

      // Create the signature object
      const signature = createSignature(walletSignature, address);

      // Submit to server
      createEndorsement.mutate({
        ...endorsementData,
        signature,
      });
    } catch (err) {
      // User likely rejected the signature request
      setError(err instanceof Error ? err.message : 'Failed to sign');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-lg border-2 border-blue-200 dark:border-blue-800">
      <h2 className="text-xl font-semibold mb-4">Write a Review for {subjectName}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(star)} className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:scale-110 transition-transform`}>★</button>
            ))}
            <span className="ml-2 text-sm text-gray-500">{rating} out of 5</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Summary (required)</label>
          <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary of your experience..." maxLength={280} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
          <p className="text-xs text-gray-500 mt-1">{summary.length}/280 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Details (optional)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share more details about your experience..." rows={3} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Domain</label>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
            <option value={RESERVED_DOMAINS.WILDCARD}>All Domains (*)</option>
            {Object.entries(COMMON_DOMAINS).map(([id, { name }]) => (<option key={id} value={id}>{name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Relationship</label>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
            <option value="one-time">One-time interaction</option>
            <option value="recurring">Recurring customer</option>
            <option value="long-term">Long-term relationship</option>
          </select>
        </div>
        {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}
        <button onClick={handleSubmit} disabled={!summary || isSubmitting || createEndorsement.isPending || !isConnected} className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting || createEndorsement.isPending ? 'Signing & Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
