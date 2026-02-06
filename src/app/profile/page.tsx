'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      </main>
    </div>
  );
}
