'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Post, REACTION_EMOJIS, ReactionType, Reactions, CATEGORY_LABELS } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import ChatMessage from './ChatMessage';
import FlagButton from './FlagButton';
import FlagModal from './FlagModal';
import ContentWarningGate from './ContentWarningGate';

interface PostCardProps {
  post: Post;
  initialHasUpvoted?: boolean;
}

interface VoteResponse {
  success: boolean;
  upvotes: number;
}

interface VoteErrorResponse {
  error: string;
}

interface ReactResponse {
  reactions: Reactions;
  userReaction: ReactionType | null;
}

export default function PostCard({ post, initialHasUpvoted = false }: PostCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(post.upvotes);
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted);
  const [isVoting, setIsVoting] = useState(false);
  const [localReactions, setLocalReactions] = useState(post.reactions);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [isReacting, setIsReacting] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);

  const displayMessages = isExpanded
    ? post.chat
    : post.featuredExcerpt
    ? post.chat.slice(post.featuredExcerpt.startIndex, post.featuredExcerpt.endIndex + 1)
    : post.chat.slice(0, 4);

  const hasMore = post.chat.length > displayMessages.length;

  const handleUpvote = useCallback(async () => {
    if (hasUpvoted || isVoting) return;

    // Check if user is logged in
    if (!user) {
      // Could show a login prompt here
      return;
    }

    // Optimistic update
    setLocalUpvotes((prev) => prev + 1);
    setHasUpvoted(true);
    setIsVoting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = (await response.json()) as VoteErrorResponse;
        // Rollback on error
        setLocalUpvotes((prev) => prev - 1);
        setHasUpvoted(false);

        // If already upvoted, keep it that way
        if (response.status === 409) {
          setHasUpvoted(true);
          setLocalUpvotes((prev) => prev + 1);
        }

        console.error('Vote error:', errorData.error);
        return;
      }

      const data = (await response.json()) as VoteResponse;
      // Update with server's authoritative count
      setLocalUpvotes(data.upvotes);
    } catch (error) {
      // Rollback on network error
      setLocalUpvotes((prev) => prev - 1);
      setHasUpvoted(false);
      console.error('Vote network error:', error);
    } finally {
      setIsVoting(false);
    }
  }, [hasUpvoted, isVoting, user, post.id]);

  const handleRemoveUpvote = useCallback(async () => {
    if (!hasUpvoted || isVoting) return;

    if (!user) return;

    // Optimistic update
    setLocalUpvotes((prev) => Math.max(0, prev - 1));
    setHasUpvoted(false);
    setIsVoting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Rollback on error
        setLocalUpvotes((prev) => prev + 1);
        setHasUpvoted(true);
        return;
      }

      const data = (await response.json()) as VoteResponse;
      setLocalUpvotes(data.upvotes);
    } catch (error) {
      // Rollback on network error
      setLocalUpvotes((prev) => prev + 1);
      setHasUpvoted(true);
      console.error('Remove vote error:', error);
    } finally {
      setIsVoting(false);
    }
  }, [hasUpvoted, isVoting, user, post.id]);

  const handleVoteClick = useCallback(() => {
    if (hasUpvoted) {
      handleRemoveUpvote();
    } else {
      handleUpvote();
    }
  }, [hasUpvoted, handleUpvote, handleRemoveUpvote]);

  const handleReaction = useCallback(async (type: ReactionType) => {
    if (isReacting) return;

    // Optimistic update
    const wasSelected = userReaction === type;
    const previousReactions = { ...localReactions };
    const previousUserReaction = userReaction;

    if (wasSelected) {
      // Toggle off - remove reaction
      setLocalReactions((prev) => ({
        ...prev,
        [type]: Math.max(0, prev[type] - 1),
      }));
      setUserReaction(null);
    } else {
      // Add new reaction (and remove old one if exists)
      setLocalReactions((prev) => {
        const updated = { ...prev };
        if (previousUserReaction) {
          updated[previousUserReaction] = Math.max(0, updated[previousUserReaction] - 1);
        }
        updated[type] = updated[type] + 1;
        return updated;
      });
      setUserReaction(type);
    }

    setIsReacting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        // Rollback on error
        setLocalReactions(previousReactions);
        setUserReaction(previousUserReaction);
        console.error('Reaction error:', await response.text());
        return;
      }

      const data = (await response.json()) as ReactResponse;
      // Update with server's authoritative state
      setLocalReactions(data.reactions);
      setUserReaction(data.userReaction);
    } catch (error) {
      // Rollback on network error
      setLocalReactions(previousReactions);
      setUserReaction(previousUserReaction);
      console.error('Reaction network error:', error);
    } finally {
      setIsReacting(false);
    }
  }, [isReacting, userReaction, localReactions, post.id]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const canVote = !!user;

  return (
    <ContentWarningGate warnings={post.contentWarnings || []}>
    <article className="bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden" data-testid="post-card">
      {/* Header */}
      <div className="p-4 border-b border-[#333]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {post.title && (
              <h3 className="text-lg font-semibold text-[#ededed] mb-1">
                <Link
                  href={`/post/${post.id}`}
                  className="hover:text-[#74AA9C] transition-colors"
                  data-testid="post-title-link"
                >
                  {post.title}
                </Link>
              </h3>
            )}
            <div className="flex items-center gap-2 text-sm text-[#666]">
              <span>{post.displayNameOverride || (post.isAnonymous ? 'Anonymous' : post.authorName) || 'Anonymous'}</span>
              <span>•</span>
              <span>{formatDate(post.createdAt)}</span>
              <span>•</span>
              <span>{post.chat.length} messages</span>
            </div>
          </div>
          <button
            onClick={handleVoteClick}
            disabled={!canVote || isVoting}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
              hasUpvoted
                ? 'bg-[#74AA9C] text-[#141414]'
                : canVote
                ? 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333]'
                : 'bg-[#2a2a2a] text-[#666] cursor-not-allowed'
            } ${isVoting ? 'opacity-50' : ''}`}
            data-testid="upvote-button"
            title={!canVote ? 'Sign in to upvote' : hasUpvoted ? 'Remove upvote' : 'Upvote'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {localUpvotes}
          </button>
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
          <p className="mt-3 text-[#a0a0a0] text-sm italic border-l-2 border-[#74AA9C] pl-3">
            {post.commentary}
          </p>
        )}
      </div>

      {/* Chat Messages */}
      <div className="p-4 space-y-3 bg-[#141414]">
        {displayMessages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}

        {hasMore && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 text-[#74AA9C] text-sm hover:underline"
          >
            Show full conversation ({post.chat.length - displayMessages.length} more messages)
          </button>
        )}

        {isExpanded && hasMore && (
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full py-2 text-[#74AA9C] text-sm hover:underline"
          >
            Collapse
          </button>
        )}
      </div>

      {/* Reactions */}
      <div className="p-4 border-t border-[#333] flex items-center justify-between">
        <div className="flex gap-2">
          {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => {
            const isSelected = userReaction === type;
            return (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                disabled={isReacting}
                className={`px-2 py-1 rounded text-sm transition-colors ${
                  isSelected
                    ? 'bg-[#74AA9C] bg-opacity-30 ring-1 ring-[#74AA9C]'
                    : 'bg-[#2a2a2a] hover:bg-[#333]'
                } ${isReacting ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isSelected ? `Remove ${type} reaction` : `React with ${type}`}
              >
                {REACTION_EMOJIS[type]}
                {localReactions[type] > 0 && (
                  <span className={`ml-1 ${isSelected ? 'text-[#74AA9C]' : 'text-[#a0a0a0]'}`}>
                    {localReactions[type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/post/${post.id}`}
            className="text-sm text-[#666] hover:text-[#a0a0a0] transition-colors"
            data-testid="comments-link"
          >
            💬 {post.commentCount !== undefined ? `${post.commentCount} Comments` : 'Comments'}
          </Link>
          <FlagButton postId={post.id} onFlagClick={() => setIsFlagModalOpen(true)} />
        </div>
      </div>

      {/* Flag Modal */}
      <FlagModal
        postId={post.id}
        isOpen={isFlagModalOpen}
        onClose={() => setIsFlagModalOpen(false)}
      />
    </article>
    </ContentWarningGate>
  );
}
