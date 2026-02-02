'use client';

import { useState, useEffect, useCallback } from 'react';
import { Category, ChatMessage, CATEGORY_LABELS, FLAG_REASON_LABELS, FlagReason } from '@/types';
import ChatMessageComponent from './ChatMessage';

interface QueuePost {
  id: string;
  title: string;
  commentary: string;
  categories: Category[];
  chat: ChatMessage[];
  createdAt: string;
  authorId: string | null;
  isAnonymous: boolean;
  status: string;
  messageCount: number;
  flagCount?: number;
  flagReasons?: string[];
}

interface ModerationQueueProps {
  initialStatus?: string;
}

export default function ModerationQueue({ initialStatus = 'pending' }: ModerationQueueProps) {
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [moderatingPost, setModeratingPost] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/queue?status=${statusFilter}&page=${page}&limit=20`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch queue');
      }

      const data = await response.json();
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleModerate = async (postId: string, action: 'approve' | 'reject' | 'flag', reason?: string) => {
    setModeratingPost(postId);

    try {
      const response = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Moderation failed');
      }

      // Remove from list or refresh
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotal((prev) => prev - 1);
      setShowRejectModal(null);
      setRejectReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed');
    } finally {
      setModeratingPost(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6" data-testid="moderation-queue">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#ededed]">
          Moderation Queue
          <span className="ml-2 text-[#666]">({total})</span>
        </h2>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-[#ededed]"
          data-testid="status-filter"
        >
          <option value="all">All Pending/Flagged</option>
          <option value="pending">Pending</option>
          <option value="flagged">Flagged</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
          <button onClick={fetchQueue} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 text-center text-[#666]">Loading queue...</div>
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="py-12 text-center text-[#666]" data-testid="empty-queue">
          No posts in queue with status: {statusFilter}
        </div>
      )}

      {/* Posts list */}
      {!isLoading && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden"
              data-testid="queue-item"
            >
              {/* Post header */}
              <div className="p-4 border-b border-[#333]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-[#ededed]">
                        {post.title || 'Untitled Post'}
                      </h3>
                      {post.status === 'flagged' && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                          Flagged
                        </span>
                      )}
                      {post.flagCount && post.flagCount > 0 && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                          {post.flagCount} flag{post.flagCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-[#666]">
                      <span>{post.isAnonymous ? 'Anonymous' : post.authorId?.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{formatDate(post.createdAt)}</span>
                      <span>•</span>
                      <span>{post.messageCount} messages</span>
                    </div>
                    {/* Flag reasons */}
                    {post.flagReasons && post.flagReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.flagReasons.map((reason) => (
                          <span
                            key={reason}
                            className="px-2 py-0.5 bg-red-500/10 text-red-300 text-xs rounded"
                          >
                            {FLAG_REASON_LABELS[reason as FlagReason] || reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModerate(post.id, 'approve')}
                      disabled={moderatingPost === post.id}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-500 disabled:opacity-50"
                      data-testid="approve-button"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(post.id)}
                      disabled={moderatingPost === post.id}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-500 disabled:opacity-50"
                      data-testid="reject-button"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleModerate(post.id, 'flag')}
                      disabled={moderatingPost === post.id}
                      className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-500 disabled:opacity-50"
                      data-testid="flag-button"
                    >
                      Flag
                    </button>
                  </div>
                </div>

                {/* Categories */}
                {post.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.categories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 bg-[#2a2a2a] text-[#a0a0a0] text-xs rounded"
                      >
                        {CATEGORY_LABELS[cat]}
                      </span>
                    ))}
                  </div>
                )}

                {/* Commentary */}
                {post.commentary && (
                  <p className="mt-2 text-[#a0a0a0] text-sm italic">
                    {post.commentary}
                  </p>
                )}
              </div>

              {/* Expandable conversation preview */}
              <div className="p-4 bg-[#141414]">
                {expandedPost === post.id ? (
                  // Full conversation
                  <div className="space-y-3">
                    {post.chat.map((msg, idx) => (
                      <ChatMessageComponent key={idx} message={msg} />
                    ))}
                    <button
                      onClick={() => setExpandedPost(null)}
                      className="text-[#74AA9C] text-sm hover:underline"
                    >
                      Collapse conversation
                    </button>
                  </div>
                ) : (
                  // Preview (first 2 messages)
                  <div className="space-y-3">
                    {post.chat.slice(0, 2).map((msg, idx) => (
                      <ChatMessageComponent key={idx} message={msg} />
                    ))}
                    {post.chat.length > 2 && (
                      <button
                        onClick={() => setExpandedPost(post.id)}
                        className="text-[#74AA9C] text-sm hover:underline"
                        data-testid="expand-button"
                      >
                        Show all {post.chat.length} messages
                      </button>
                    )}
                  </div>
                )}
              </div>
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

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#ededed] mb-4">
              Rejection Reason
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection (required)..."
              rows={4}
              className="w-full px-3 py-2 bg-[#141414] border border-[#333] rounded-lg text-[#ededed] placeholder-[#666] resize-none"
              data-testid="reject-reason-input"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  handleModerate(showRejectModal, 'reject', rejectReason);
                }}
                disabled={!rejectReason.trim() || moderatingPost === showRejectModal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50"
                data-testid="confirm-reject-button"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
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
