'use client';

import { useState, useEffect, useCallback } from 'react';
import Comment from './Comment';
import CommentForm from './CommentForm';

interface CommentData {
  id: string;
  postId: string;
  content: string;
  authorName: string;
  isAnonymous: boolean;
  parentId: string | null;
  createdAt: string;
  replies?: CommentData[];
}

interface CommentSectionProps {
  postId: string;
  initialCommentCount?: number;
}

export default function CommentSection({ postId, initialCommentCount = 0 }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(initialCommentCount);

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/posts/${postId}/comments`);

      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.comments);
      setTotalCount(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleNewComment = (newComment: CommentData) => {
    // Add new top-level comment to the list
    setComments((prev) => [...prev, { ...newComment, replies: [] }]);
    setTotalCount((prev) => prev + 1);
  };

  const handleReplyAdded = (parentId: string, reply: CommentData) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply],
          };
        }
        return comment;
      })
    );
    setTotalCount((prev) => prev + 1);
  };

  return (
    <section className="mt-8" data-testid="comment-section">
      <h2 className="text-lg font-semibold text-[#ededed] mb-4">
        Comments {totalCount > 0 && <span className="text-[#666]">({totalCount})</span>}
      </h2>

      {/* New comment form */}
      <div className="mb-6">
        <CommentForm postId={postId} onSuccess={handleNewComment} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-8 text-center text-[#666]" data-testid="comments-loading">
          Loading comments...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-4 text-center text-red-400" data-testid="comments-error">
          {error}
          <button
            onClick={fetchComments}
            className="ml-2 text-[#74AA9C] hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Comments list */}
      {!isLoading && !error && (
        <div className="space-y-1 divide-y divide-[#333]" data-testid="comments-list">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-[#666]" data-testid="no-comments">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplyAdded={(reply) => handleReplyAdded(comment.id, reply)}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
