'use client';

import { useState, useEffect, useCallback } from 'react';

interface ContactMessage {
  id: string;
  name: string | null;
  email: string | null;
  message: string;
  status: string;
  created_at: string;
}

type FilterStatus = 'new' | 'read' | 'archived' | 'all';

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('new');
  const [total, setTotal] = useState(0);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/contact?status=${filter}&limit=50`);
      if (!res.ok) {
        setError('Failed to load messages');
        return;
      }
      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch {
      // Silently fail — message will remain in current state
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#ededed]">
          Contact Messages
          {total > 0 && <span className="text-[#666] font-normal ml-2">({total})</span>}
        </h2>
        <div className="flex gap-2">
          {(['new', 'read', 'archived', 'all'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === s
                  ? 'bg-[#74AA9C] text-[#141414]'
                  : 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-[#666] text-center py-8">Loading messages...</p>
      )}

      {error && (
        <p className="text-red-400 text-center py-8">{error}</p>
      )}

      {!loading && !error && messages.length === 0 && (
        <p className="text-[#666] text-center py-8">No {filter === 'all' ? '' : filter} messages.</p>
      )}

      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`bg-[#1e1e1e] border rounded-lg p-4 ${
              msg.status === 'new' ? 'border-[#74AA9C]/50' : 'border-[#333]'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-3 text-sm text-[#a0a0a0]">
                <span className="font-medium text-[#ededed]">
                  {msg.name || 'Anonymous'}
                </span>
                {msg.email && (
                  <a
                    href={`mailto:${msg.email}`}
                    className="text-[#74AA9C] hover:underline"
                  >
                    {msg.email}
                  </a>
                )}
                <span className="text-[#666]">{formatDate(msg.created_at)}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                {msg.status === 'new' && (
                  <button
                    onClick={() => updateStatus(msg.id, 'read')}
                    className="px-2 py-1 bg-[#2a2a2a] hover:bg-[#333] text-[#a0a0a0] rounded text-xs transition-colors"
                  >
                    Mark Read
                  </button>
                )}
                {msg.status !== 'archived' && (
                  <button
                    onClick={() => updateStatus(msg.id, 'archived')}
                    className="px-2 py-1 bg-[#2a2a2a] hover:bg-[#333] text-[#666] rounded text-xs transition-colors"
                  >
                    Archive
                  </button>
                )}
                {msg.status === 'archived' && (
                  <button
                    onClick={() => updateStatus(msg.id, 'new')}
                    className="px-2 py-1 bg-[#2a2a2a] hover:bg-[#333] text-[#a0a0a0] rounded text-xs transition-colors"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
            <p className="text-[#ededed] whitespace-pre-wrap">{msg.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
