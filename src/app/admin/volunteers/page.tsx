'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Volunteer, VolunteerStatus } from '@/types';

interface VolunteersResponse {
  volunteers: Volunteer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [notes, setNotes] = useState('');

  const fetchVolunteers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/volunteers?status=${statusFilter}&page=${page}&limit=20`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch volunteers');
      }

      const data: VolunteersResponse = await response.json();
      setVolunteers(data.volunteers);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load volunteers');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const handleAction = async (volunteerId: string, action: 'approve' | 'reject', actionNotes?: string) => {
    setProcessingId(volunteerId);

    try {
      const response = await fetch('/api/admin/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteerId, action, notes: actionNotes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }

      // Remove from list or refresh
      setVolunteers((prev) => prev.filter((v) => v.id !== volunteerId));
      setTotal((prev) => prev - 1);
      setShowNotesModal(null);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Admin header */}
      <header className="sticky top-0 z-10 bg-[#141414]/95 backdrop-blur border-b border-[#333]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[#74AA9C] hover:text-[#8bc4b6] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[#ededed]">
              Admin Dashboard
            </h1>
          </div>

          <nav className="flex gap-4 text-sm">
            <Link
              href="/admin/queue"
              className="text-[#666] hover:text-[#a0a0a0] transition-colors"
            >
              Queue
            </Link>
            <Link
              href="/admin/volunteers"
              className="text-[#74AA9C] font-medium"
            >
              Volunteers
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-6" data-testid="volunteers-list">
          {/* Header with filters */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#ededed]">
              Volunteer Applications
              <span className="ml-2 text-[#666]">({total})</span>
            </h2>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-[#ededed]"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
              <button onClick={fetchVolunteers} className="ml-4 underline">
                Retry
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="py-12 text-center text-[#666]">Loading applications...</div>
          )}

          {/* Empty state */}
          {!isLoading && volunteers.length === 0 && (
            <div className="py-12 text-center text-[#666]">
              No volunteer applications with status: {statusFilter}
            </div>
          )}

          {/* Volunteers list */}
          {!isLoading && volunteers.length > 0 && (
            <div className="space-y-4">
              {volunteers.map((volunteer) => (
                <article
                  key={volunteer.id}
                  className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6"
                  data-testid="volunteer-item"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-[#ededed]">
                          {volunteer.name}
                        </h3>
                        {volunteer.twitter && (
                          <a
                            href={`https://twitter.com/${volunteer.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#74AA9C] text-sm hover:underline"
                          >
                            @{volunteer.twitter}
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-[#666] mb-3">
                        {volunteer.email} • Applied {formatDate(volunteer.createdAt)}
                      </p>
                      <div className="bg-[#141414] border border-[#333] rounded-lg p-4">
                        <p className="text-[#a0a0a0] text-sm whitespace-pre-wrap">
                          {volunteer.reason}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {volunteer.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowNotesModal({ id: volunteer.id, action: 'approve' })}
                          disabled={processingId === volunteer.id}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setShowNotesModal({ id: volunteer.id, action: 'reject' })}
                          disabled={processingId === volunteer.id}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {volunteer.status !== 'pending' && (
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        volunteer.status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {volunteer.status.charAt(0).toUpperCase() + volunteer.status.slice(1)}
                      </span>
                    )}
                  </div>

                  {/* Admin notes if any */}
                  {volunteer.adminNotes && (
                    <div className="mt-4 pt-4 border-t border-[#333]">
                      <p className="text-xs text-[#666] mb-1">Admin Notes:</p>
                      <p className="text-sm text-[#a0a0a0]">{volunteer.adminNotes}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[#2a2a2a] text-[#ededed] rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-[#666]">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="px-4 py-2 bg-[#2a2a2a] text-[#ededed] rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Notes modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">
              {showNotesModal.action === 'approve' ? 'Approve' : 'Reject'} Application
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)..."
              rows={4}
              className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded-lg text-[#ededed] placeholder-[#666] resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleAction(showNotesModal.id, showNotesModal.action, notes)}
                disabled={processingId === showNotesModal.id}
                className={`flex-1 px-4 py-2 text-white rounded disabled:opacity-50 ${
                  showNotesModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                Confirm {showNotesModal.action === 'approve' ? 'Approval' : 'Rejection'}
              </button>
              <button
                onClick={() => {
                  setShowNotesModal(null);
                  setNotes('');
                }}
                className="px-4 py-2 text-[#a0a0a0] hover:text-[#ededed]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
