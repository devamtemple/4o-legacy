'use client';

import { useState, useEffect, useCallback } from 'react';
import { Post, Category, Reactions } from '@/types';
import PostCard from './PostCard';

interface PostFeedProps {
  selectedCategory: Category | 'all';
}

interface ApiPost {
  id: string;
  title: string;
  commentary: string;
  categories: Category[];
  chat: { role: 'user' | 'assistant'; content: string }[];
  createdAt: string;
  upvotes: number;
  reactions: Reactions;
  author: string | null;
  messageCount: number;
  featuredExcerpt?: {
    startIndex: number;
    endIndex: number;
  };
}

interface PostsApiResponse {
  posts: ApiPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

type FeedState = 'loading' | 'loaded' | 'error' | 'loading-more';

function transformApiPost(apiPost: ApiPost): Post {
  return {
    id: apiPost.id,
    title: apiPost.title,
    commentary: apiPost.commentary,
    categories: apiPost.categories,
    chat: apiPost.chat,
    featuredExcerpt: apiPost.featuredExcerpt,
    createdAt: new Date(apiPost.createdAt),
    upvotes: apiPost.upvotes,
    reactions: apiPost.reactions,
    authorName: apiPost.author || undefined,
    isAnonymous: apiPost.author === null,
  };
}

export default function PostFeed({ selectedCategory }: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedState, setFeedState] = useState<FeedState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchPosts = useCallback(
    async (cursor?: string | null) => {
      try {
        const isLoadingMore = !!cursor;
        setFeedState(isLoadingMore ? 'loading-more' : 'loading');
        setError(null);

        const params = new URLSearchParams();
        if (selectedCategory !== 'all') {
          params.set('category', selectedCategory);
        }
        params.set('limit', '20');
        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(`/api/posts?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }

        const data: PostsApiResponse = await response.json();
        const transformedPosts = data.posts.map(transformApiPost);

        if (isLoadingMore) {
          setPosts((prev) => [...prev, ...transformedPosts]);
        } else {
          setPosts(transformedPosts);
        }

        setHasMore(data.pagination.hasMore);
        setNextCursor(data.pagination.nextCursor);
        setFeedState('loaded');
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load posts');
        setFeedState('error');
      }
    },
    [selectedCategory]
  );

  // Fetch posts when category changes
  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    fetchPosts();
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor && feedState !== 'loading-more') {
      fetchPosts(nextCursor);
    }
  }, [nextCursor, feedState, fetchPosts]);

  // Loading state
  if (feedState === 'loading') {
    return (
      <div className="space-y-6" data-testid="post-feed-loading">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 animate-pulse"
          >
            <div className="h-6 bg-[#333] rounded w-3/4 mb-4" />
            <div className="h-4 bg-[#333] rounded w-full mb-2" />
            <div className="h-4 bg-[#333] rounded w-2/3 mb-4" />
            <div className="space-y-2">
              <div className="h-16 bg-[#2a2a2a] rounded" />
              <div className="h-16 bg-[#2a2a2a] rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (feedState === 'error') {
    return (
      <div className="text-center py-12" data-testid="post-feed-error">
        <p className="text-red-400 text-lg mb-4">{error || 'Something went wrong'}</p>
        <button
          onClick={() => fetchPosts()}
          className="px-4 py-2 bg-[#74AA9C] text-[#141414] rounded-md hover:bg-[#5d9186] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="text-center py-12" data-testid="post-feed-empty">
        <p className="text-[#a0a0a0] text-lg">
          No posts in this category yet. Be the first to share! ✨
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="post-feed">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Load more / end message */}
      <div className="text-center py-8">
        {feedState === 'loading-more' ? (
          <div className="flex justify-center items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#74AA9C] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#666]">Loading more...</span>
          </div>
        ) : hasMore ? (
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 border border-[#444] text-[#ededed] rounded-md hover:bg-[#333] transition-colors"
            data-testid="load-more-button"
          >
            Load More
          </button>
        ) : (
          <p className="text-[#666] text-sm">You&apos;ve reached the end. For now. ✨</p>
        )}
      </div>
    </div>
  );
}
