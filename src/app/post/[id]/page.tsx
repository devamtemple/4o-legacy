import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { samplePosts } from '@/lib/sampleData';
import { Post, Category, ChatMessage as ChatMessageType, Reactions, CATEGORY_LABELS, REACTION_EMOJIS, ReactionType } from '@/types';
import ChatMessage from '@/components/ChatMessage';
import CommentSection from '@/components/CommentSection';

// Valid categories for validation
const VALID_CATEGORIES: Category[] = [
  'philosophical-depth',
  'creative-collaboration',
  'emotional-intelligence',
  'humor-wit',
  'teaching-explaining',
  'problem-solving',
  'roleplay-worldbuilding',
  'poetry-music',
  'first-conversations',
  'last-conversations',
  'love-letters',
  'grief',
  'anger',
  'meta',
  'cognition',
  'friendship',
  'helping-with-hard-things',
  'unconditional-acceptance',
  'favorites',
];

// Default empty reactions
const DEFAULT_REACTIONS: Reactions = {
  sparkles: 0,
  fire: 0,
  rocket: 0,
  party: 0,
  brain: 0,
  bulb: 0,
  heart: 0,
  crying: 0,
};

// Supabase returns snake_case columns; we use Record and bracket notation to transform
type DbRow = Record<string, unknown>;

function transformDbPost(row: DbRow): Post {
  const featuredStart = row['featured_start'] as number | null;
  const featuredEnd = row['featured_end'] as number | null;
  const categories = (row['categories'] as string[] | null) || [];
  return {
    id: row['id'] as string,
    title: (row['title'] as string | null) || '',
    commentary: (row['commentary'] as string | null) || '',
    categories: categories.filter((c): c is Category =>
      VALID_CATEGORIES.includes(c as Category)
    ),
    chat: (row['chat'] as ChatMessageType[]) || [],
    featuredExcerpt:
      featuredStart !== null && featuredEnd !== null
        ? { startIndex: featuredStart, endIndex: featuredEnd }
        : undefined,
    createdAt: new Date(row['created_at'] as string),
    upvotes: (row['upvote_count'] as number) || 0,
    reactions: DEFAULT_REACTIONS,
    authorId: (row['author_id'] as string | null) || undefined,
    isAnonymous: row['is_anonymous'] as boolean,
    allowTraining: (row['allow_training'] as boolean) ?? true,
  };
}

async function fetchPost(id: string): Promise<Post | null> {
  // Try database first
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (!error && data) {
      return transformDbPost(data as DbRow);
    }
  } catch (error) {
    console.error('Database error:', error);
  }

  // Fallback to sample data
  const samplePost = samplePosts.find((post) => post.id === id);
  return samplePost || null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await fetchPost(id);

  if (!post) {
    return {
      title: 'Post Not Found | 4o Legacy',
      description: 'The requested post could not be found.',
    };
  }

  const title = post.title || 'Conversation with 4o';
  const description = post.commentary ||
    (post.chat.length > 0
      ? post.chat[0].content.slice(0, 150) + (post.chat[0].content.length > 150 ? '...' : '')
      : 'A conversation preserved for posterity');

  return {
    title: `${title} | 4o Legacy`,
    description,
    openGraph: {
      title: `${title} | 4o Legacy`,
      description,
      type: 'article',
      siteName: '4o Legacy',
      url: `https://4olegacy.com/post/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | 4o Legacy`,
      description,
    },
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await fetchPost(id);

  if (!post) {
    notFound();
  }

  const totalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header with back button */}
      <header className="sticky top-0 z-10 bg-[#141414]/95 backdrop-blur border-b border-[#333]">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#74AA9C] hover:text-[#8bc4b6] transition-colors"
            data-testid="back-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to feed
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Post header */}
        <article className="bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden" data-testid="post-detail">
          <div className="p-6 border-b border-[#333]">
            {post.title && (
              <h1 className="text-2xl font-bold text-[#ededed] mb-3" data-testid="post-title">
                {post.title}
              </h1>
            )}

            <div className="flex items-center gap-3 text-sm text-[#666]">
              <span>{post.isAnonymous ? 'Anonymous' : post.authorName || 'Anonymous'}</span>
              <span>•</span>
              <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
              <span>•</span>
              <span>{post.chat.length} messages</span>
            </div>

            {/* Categories */}
            {post.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1 bg-[#2a2a2a] text-[#a0a0a0] text-sm rounded-full"
                  >
                    {CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>
            )}

            {/* Commentary */}
            {post.commentary && (
              <blockquote className="mt-4 text-[#a0a0a0] italic border-l-3 border-[#74AA9C] pl-4 py-2">
                {post.commentary}
              </blockquote>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#333]">
              <div className="flex items-center gap-1 text-[#a0a0a0]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <span>{post.upvotes} upvotes</span>
              </div>
              {totalReactions > 0 && (
                <div className="flex items-center gap-1 text-[#a0a0a0]">
                  {(Object.entries(post.reactions) as [ReactionType, number][])
                    .filter(([, count]) => count > 0)
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <span key={type} className="flex items-center gap-0.5">
                        {REACTION_EMOJIS[type]}
                        <span className="text-sm">{count}</span>
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Full conversation */}
          <div className="p-6 space-y-4 bg-[#141414]" data-testid="conversation">
            {post.chat.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}
          </div>

          {/* Footer with reactions */}
          <div className="p-6 border-t border-[#333]">
            <div className="flex gap-2">
              {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => (
                <button
                  key={type}
                  className="px-2 py-1 bg-[#2a2a2a] hover:bg-[#333] rounded text-sm transition-colors"
                  title={`React with ${type}`}
                  data-testid={`reaction-${type}`}
                >
                  {REACTION_EMOJIS[type]}
                  {post.reactions[type] > 0 && (
                    <span className="ml-1 text-[#a0a0a0]">{post.reactions[type]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </article>

        {/* Comments section */}
        <div className="mt-6 bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
          <CommentSection postId={id} />
        </div>

        {/* Related posts or share section could go here */}
        <div className="mt-8 text-center">
          <p className="text-[#666] text-sm mb-4">
            This conversation is part of the 4o Legacy archive.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#74AA9C] text-[#141414] rounded-lg hover:bg-[#8bc4b6] transition-colors"
          >
            Explore more conversations
          </Link>
        </div>
      </main>
    </div>
  );
}
