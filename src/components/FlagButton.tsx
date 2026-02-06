'use client';

interface FlagButtonProps {
  postId: string;
  onFlagClick: () => void;
}

export default function FlagButton({ postId, onFlagClick }: FlagButtonProps) {
  return (
    <button
      onClick={onFlagClick}
      className="text-[#666] hover:text-red-400 transition-colors p-1 rounded"
      title="Flag this post"
      data-testid={`flag-button-${postId}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
        />
      </svg>
    </button>
  );
}
