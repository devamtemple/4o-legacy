'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

type DbRow = Record<string, unknown>;

interface UserPost {
  id: string;
  title: string;
  status: string;
  allowTraining: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setPostsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, status, allow_training, created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        setPosts([]);
      } else {
        setPosts(
          (data || []).map((row: DbRow) => ({
            id: row['id'] as string,
            title: (row['title'] as string) || 'Untitled',
            status: row['status'] as string,
            allowTraining: row['allow_training'] as boolean,
            createdAt: row['created_at'] as string,
          }))
        );
      }
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, fetchPosts]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Profile updated!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTraining = async (postId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/posts/${postId}/manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowTraining: !currentValue }),
      });

      if (response.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, allowTraining: !currentValue } : p
          )
        );
      }
    } catch {
      // Silently fail — user can retry
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/manage`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setDeleteConfirm(null);
      }
    } catch {
      // Silently fail — user can retry
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-[#666]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <header className="border-b border-[#333] sticky top-0 bg-[#141414]/95 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">4o Legacy</span>
            <span className="text-xl">✨</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-[#a0a0a0] hover:text-[#ededed] transition-colors">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
        <p className="text-[#a0a0a0] mb-8">
          Manage how you appear on 4o Legacy
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#a0a0a0] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#333] rounded-md text-[#666] cursor-not-allowed"
            />
            <p className="text-xs text-[#666] mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-[#a0a0a0] mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to be known"
              className="w-full px-4 py-3 bg-[#141414] border border-[#444] rounded-md text-[#ededed] placeholder-[#666] focus:outline-none focus:border-[#74AA9C] transition-colors"
            />
            <p className="text-xs text-[#666] mt-1">
              This appears on your posts and comments (unless you post anonymously)
            </p>
          </div>

          {message && (
            <div
              className={`px-4 py-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                  : 'bg-red-500/10 border border-red-500/50 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-[#74AA9C] text-[#141414] rounded-md font-medium hover:bg-[#5d9186] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/"
              className="px-6 py-3 border border-[#444] text-[#ededed] rounded-md font-medium hover:bg-[#333] transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>
        </form>

        {/* User Posts Section */}
        <div className="mt-12 pt-8 border-t border-[#333]">
          <h2 className="text-2xl font-bold mb-2">Your Posts</h2>
          <p className="text-[#a0a0a0] text-sm mb-6">
            Manage your submitted conversations. You can change your training preference or delete your posts.
          </p>

          {postsLoading ? (
            <div className="text-[#666] text-center py-8">Loading your posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 bg-[#1e1e1e] rounded-lg border border-[#333]">
              <p className="text-[#a0a0a0]">You haven&apos;t submitted any posts yet.</p>
              <Link
                href="/"
                className="inline-block mt-4 text-[#74AA9C] hover:underline text-sm"
              >
                Share a memory
              </Link>
            </div>
          ) : (
            <div className="space-y-4" data-testid="user-posts">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4"
                  data-testid={`user-post-${post.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/post/${post.id}`}
                        className="text-[#ededed] font-medium hover:text-[#74AA9C] transition-colors truncate block"
                      >
                        {post.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#666]">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            post.status === 'approved'
                              ? 'bg-green-500/10 text-green-400'
                              : post.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Training toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleTraining(post.id, post.allowTraining)}
                        className={`text-xs px-3 py-1.5 rounded transition-colors ${
                          post.allowTraining
                            ? 'bg-[#74AA9C]/20 text-[#74AA9C] hover:bg-[#74AA9C]/30'
                            : 'bg-[#333] text-[#a0a0a0] hover:bg-[#444]'
                        }`}
                        title={
                          post.allowTraining
                            ? 'Included in training archive. Click to opt out.'
                            : 'Display only. Click to include in training archive.'
                        }
                        data-testid={`toggle-training-${post.id}`}
                      >
                        {post.allowTraining ? 'Training: ON' : 'Training: OFF'}
                      </button>

                      {/* Delete button */}
                      {deleteConfirm === post.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                            data-testid={`confirm-delete-${post.id}`}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs px-3 py-1.5 bg-[#333] text-[#a0a0a0] rounded hover:bg-[#444] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(post.id)}
                          className="text-xs px-3 py-1.5 bg-[#333] text-[#a0a0a0] rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
                          data-testid={`delete-${post.id}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
