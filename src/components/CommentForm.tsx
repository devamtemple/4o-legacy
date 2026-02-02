'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface CommentData {
  id: string;
  postId: string;
  content: string;
  authorName: string;
  isAnonymous: boolean;
  parentId: string | null;
  createdAt: string;
}

interface CommentFormProps {
  postId: string;
  parentId?: string;
  onSuccess?: (comment: CommentData) => void;
  onCancel?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export default function CommentForm({
  postId,
  parentId,
  onSuccess,
  onCancel,
  placeholder = 'Add a comment...',
  compact = false,
}: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnonymous = !user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('Comment content is required');
      return;
    }

    if (isAnonymous && !authorName.trim()) {
      setError('Display name is required for anonymous comments');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          authorName: isAnonymous ? authorName.trim() : undefined,
          parentId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      const newComment = await response.json();

      // Clear form
      setContent('');
      setAuthorName('');

      // Notify parent
      if (onSuccess) {
        onSuccess({
          id: newComment.id,
          postId,
          content: newComment.content,
          authorName: newComment.authorName,
          isAnonymous,
          parentId: parentId || null,
          createdAt: newComment.createdAt,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="comment-form">
      {/* Anonymous user name input */}
      {isAnonymous && (
        <div>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your display name"
            maxLength={50}
            className={`w-full px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#74AA9C] transition-colors ${
              compact ? 'text-sm' : ''
            }`}
            data-testid="author-name-input"
          />
        </div>
      )}

      {/* Comment content */}
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          maxLength={5000}
          className={`w-full px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#74AA9C] transition-colors resize-none ${
            compact ? 'text-sm' : ''
          }`}
          data-testid="comment-content-input"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm" data-testid="comment-error">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className={`px-4 py-2 bg-[#74AA9C] text-[#141414] rounded-lg font-medium hover:bg-[#8bc4b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            compact ? 'text-sm px-3 py-1.5' : ''
          }`}
          data-testid="submit-comment-button"
        >
          {isSubmitting ? 'Posting...' : parentId ? 'Reply' : 'Post'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 text-[#a0a0a0] hover:text-[#ededed] transition-colors ${
              compact ? 'text-sm px-3 py-1.5' : ''
            }`}
            data-testid="cancel-comment-button"
          >
            Cancel
          </button>
        )}

        {!user && (
          <span className="text-xs text-[#666] ml-auto">
            Posting as anonymous
          </span>
        )}
      </div>
    </form>
  );
}
