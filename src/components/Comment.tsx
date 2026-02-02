'use client';

import { useState } from 'react';
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

interface CommentProps {
  comment: CommentData;
  postId: string;
  onReplyAdded?: (comment: CommentData) => void;
  isReply?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function Comment({ comment, postId, onReplyAdded, isReply = false }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReplySuccess = (newComment: CommentData) => {
    setShowReplyForm(false);
    if (onReplyAdded) {
      onReplyAdded(newComment);
    }
  };

  return (
    <div
      className={`${isReply ? 'ml-8 pl-4 border-l border-[#333]' : ''}`}
      data-testid={isReply ? 'comment-reply' : 'comment'}
    >
      <div className="py-3">
        {/* Comment header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-[#ededed]">
            {comment.authorName}
          </span>
          <span className="text-xs text-[#666]">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Comment content */}
        <p className="text-[#a0a0a0] text-sm leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>

        {/* Reply button - only show for root comments */}
        {!isReply && (
          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="mt-2 text-xs text-[#74AA9C] hover:text-[#8bc4b6] transition-colors"
            data-testid="reply-button"
          >
            {showReplyForm ? 'Cancel' : 'Reply'}
          </button>
        )}

        {/* Reply form */}
        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              onSuccess={handleReplySuccess}
              onCancel={() => setShowReplyForm(false)}
              placeholder="Write a reply..."
              compact
            />
          </div>
        )}
      </div>

      {/* Nested replies - only one level deep */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              postId={postId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
