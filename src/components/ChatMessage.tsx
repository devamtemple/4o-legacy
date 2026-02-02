'use client';

import { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

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
        <div className="text-[#ededed] whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </div>
      </div>
    </div>
  );
}
