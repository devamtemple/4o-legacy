'use client';

import { useState, ReactNode } from 'react';
import { ContentWarning, CONTENT_WARNING_LABELS } from '@/types';

interface ContentWarningGateProps {
  warnings: string[];
  children: ReactNode;
}

function getWarningLabel(warning: string): string {
  // Handle "other:custom text" format
  if (warning.startsWith('other:')) {
    return `Other: ${warning.slice(6)}`;
  }
  // Look up in CONTENT_WARNING_LABELS
  if (warning in CONTENT_WARNING_LABELS) {
    return CONTENT_WARNING_LABELS[warning as ContentWarning];
  }
  // Unknown warnings render as-is
  return warning;
}

export default function ContentWarningGate({ warnings, children }: ContentWarningGateProps) {
  const [dismissed, setDismissed] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // No warnings or empty — render children directly
  if (!warnings || warnings.length === 0) {
    return <>{children}</>;
  }

  // Skipped — render nothing
  if (skipped) {
    return null;
  }

  // Dismissed — show children
  if (dismissed) {
    return <>{children}</>;
  }

  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 text-center">
      {/* Warning icon */}
      <div className="text-amber-400 text-3xl mb-3">
        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-[#ededed] mb-3">Content Warning</h3>

      {/* Warning tags */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {warnings.map((warning) => (
          <span
            key={warning}
            className="px-3 py-1 bg-amber-900/30 text-amber-300 text-sm rounded-full border border-amber-700/50"
          >
            {getWarningLabel(warning)}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => setDismissed(true)}
          className="px-4 py-2 bg-[#2a2a2a] text-[#ededed] text-sm rounded-md hover:bg-[#333] transition-colors border border-[#333]"
        >
          Show post
        </button>
        <button
          onClick={() => setSkipped(true)}
          className="px-4 py-2 text-[#666] text-sm hover:text-[#a0a0a0] transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
