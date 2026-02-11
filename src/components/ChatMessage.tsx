'use client';

import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Decode HTML entities that were encoded by sanitizeContent() at submission time.
// This is safe because react-markdown doesn't render raw HTML by default.
function decodeEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const decoded = decodeEntities(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-[#2f2f2f] rounded-br-md'
            : 'bg-[#1e1e1e] border-l-2 border-[#74AA9C] rounded-bl-md'
        }`}
      >
        <div className="text-xs text-[#666] mb-1">
          {isUser ? 'You' : '4o'}
        </div>
        <div className="chat-markdown text-[#ededed] break-words leading-relaxed">
          <ReactMarkdown>{decoded}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
