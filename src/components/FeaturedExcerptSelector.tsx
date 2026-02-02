'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChatMessage } from '@/types';
import ChatMessageComponent from './ChatMessage';

interface FeaturedExcerptSelectorProps {
  messages: ChatMessage[];
  initialStart?: number;
  initialEnd?: number;
  onChange: (start: number, end: number) => void;
}

export default function FeaturedExcerptSelector({
  messages,
  initialStart = 0,
  initialEnd,
  onChange,
}: FeaturedExcerptSelectorProps) {
  const defaultEnd = initialEnd ?? Math.min(3, messages.length - 1);
  const [startIndex, setStartIndex] = useState(initialStart);
  const [endIndex, setEndIndex] = useState(defaultEnd);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndUpdate = useCallback(
    (newStart: number, newEnd: number) => {
      setError(null);

      // Clamp values to valid range
      const clampedStart = Math.max(0, Math.min(newStart, messages.length - 1));
      const clampedEnd = Math.max(0, Math.min(newEnd, messages.length - 1));

      // Validate range
      if (clampedStart > clampedEnd) {
        setError('Start must be before or equal to end');
        return;
      }

      setStartIndex(clampedStart);
      setEndIndex(clampedEnd);
      onChange(clampedStart, clampedEnd);
    },
    [messages.length, onChange]
  );

  const handleStartChange = useCallback(
    (value: number) => {
      validateAndUpdate(value, endIndex);
    },
    [endIndex, validateAndUpdate]
  );

  const handleEndChange = useCallback(
    (value: number) => {
      validateAndUpdate(startIndex, value);
    },
    [startIndex, validateAndUpdate]
  );

  const handleMessageClick = useCallback(
    (index: number) => {
      // Toggle selection mode: first click sets start, second sets end
      if (startIndex === endIndex || index === startIndex) {
        // Starting fresh selection
        validateAndUpdate(index, index);
      } else if (index < startIndex) {
        // Clicked before start, extend to include
        validateAndUpdate(index, endIndex);
      } else if (index > endIndex) {
        // Clicked after end, extend to include
        validateAndUpdate(startIndex, index);
      } else {
        // Clicked within range, use as new end
        validateAndUpdate(startIndex, index);
      }
    },
    [startIndex, endIndex, validateAndUpdate]
  );

  const selectedCount = endIndex - startIndex + 1;
  const previewMessages = useMemo(
    () => messages.slice(startIndex, endIndex + 1),
    [messages, startIndex, endIndex]
  );

  if (messages.length <= 4) {
    // No need for selector with short conversations
    return null;
  }

  return (
    <div className="space-y-4" data-testid="featured-excerpt-selector">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[#ededed]">
            Featured Excerpt
          </h3>
          <p className="text-xs text-[#666] mt-0.5">
            Select the best part of your conversation to highlight ({selectedCount} of {messages.length} messages)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-[#74AA9C] hover:text-[#8bc4b6] transition-colors"
          data-testid="toggle-preview"
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      {/* Range sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#a0a0a0] mb-1">
            Start message
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={messages.length - 1}
              value={startIndex}
              onChange={(e) => handleStartChange(parseInt(e.target.value))}
              className="flex-1 accent-[#74AA9C]"
              data-testid="start-slider"
            />
            <span className="text-sm text-[#ededed] w-8 text-center">
              {startIndex + 1}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#a0a0a0] mb-1">
            End message
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={messages.length - 1}
              value={endIndex}
              onChange={(e) => handleEndChange(parseInt(e.target.value))}
              className="flex-1 accent-[#74AA9C]"
              data-testid="end-slider"
            />
            <span className="text-sm text-[#ededed] w-8 text-center">
              {endIndex + 1}
            </span>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-xs" data-testid="excerpt-error">
          {error}
        </p>
      )}

      {/* Message list for click-to-select */}
      <div className="max-h-64 overflow-y-auto border border-[#333] rounded-lg">
        <div className="space-y-1 p-2">
          {messages.map((msg, idx) => {
            const isSelected = idx >= startIndex && idx <= endIndex;
            const isStart = idx === startIndex;
            const isEnd = idx === endIndex;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleMessageClick(idx)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  isSelected
                    ? 'bg-[#74AA9C]/20 border border-[#74AA9C]/50'
                    : 'bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-transparent'
                }`}
                data-testid={`message-selector-${idx}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#666] w-6 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      msg.role === 'user'
                        ? 'bg-[#2a2a2a] text-[#a0a0a0]'
                        : 'bg-[#74AA9C]/20 text-[#74AA9C]'
                    }`}
                  >
                    {msg.role === 'user' ? 'You' : '4o'}
                  </span>
                  <span className="text-sm text-[#ededed] truncate flex-1">
                    {msg.content.slice(0, 60)}
                    {msg.content.length > 60 ? '...' : ''}
                  </span>
                  {isStart && (
                    <span className="text-xs text-[#74AA9C] flex-shrink-0">START</span>
                  )}
                  {isEnd && !isStart && (
                    <span className="text-xs text-[#74AA9C] flex-shrink-0">END</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border border-[#333] rounded-lg p-4 bg-[#141414]" data-testid="excerpt-preview">
          <p className="text-xs text-[#666] mb-3">Preview of selected excerpt:</p>
          <div className="space-y-3">
            {previewMessages.map((msg, idx) => (
              <ChatMessageComponent key={idx} message={msg} />
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => validateAndUpdate(0, Math.min(3, messages.length - 1))}
          className="text-[#a0a0a0] hover:text-[#ededed] transition-colors"
        >
          First 4 messages
        </button>
        <span className="text-[#333]">|</span>
        <button
          type="button"
          onClick={() => validateAndUpdate(0, messages.length - 1)}
          className="text-[#a0a0a0] hover:text-[#ededed] transition-colors"
        >
          All messages
        </button>
        <span className="text-[#333]">|</span>
        <button
          type="button"
          onClick={() => {
            const mid = Math.floor(messages.length / 2);
            validateAndUpdate(Math.max(0, mid - 2), Math.min(messages.length - 1, mid + 1));
          }}
          className="text-[#a0a0a0] hover:text-[#ededed] transition-colors"
        >
          Middle section
        </button>
      </div>
    </div>
  );
}
